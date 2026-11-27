// API publik YCS 2026 — satu tabel rute, semua memanggil Code.gs di memori (tanpa lompatan HTTP).
// Kontrak (path, body, status, cache) sama dengan fungsi Vercel lama, jadi frontend tidak berubah.
// Lihat docs/API.md untuk daftar lengkap.
const crypto = require('node:crypto');
const {buatDuta} = require('./duta.cjs');
const {buatDummy} = require('./dummy.cjs');
const {buatPlaza} = require('./plaza.cjs');
const {buatGambar} = require('./gambar.cjs');

// Kode galat → status HTTP (galat lain → 422).
const STATUS = {kata_ditolak: 422, nama_ditolak: 422, validation: 400, sesi_habis: 401, sandi_salah: 401, terlalu_banyak: 429, rate_limit: 429, busy: 503, server: 502, save_failed: 502, connection: 502};
const STATUS_MONSTER = {sesi_habis: 401, rate_limit: 429, validation: 400, potion_habis: 409, bukan_waktunya: 409, tumbang: 409};

// Formulir: aksi publik → aksi Code.gs + field yang boleh diteruskan. Field lain dibuang.
const FORMULIR = {
  kata: {aksi: {kirim: 'kata-kirim'}, field: ['kata', 'karakter', 'nama', 'sekolah', 'email', 'wa', 'provinsi', 'channelClicked', 'consent', 'ref', 'requestId', 'website', 'perangkat'], maks: 8192},
  dana: {aksi: {akses: 'dana-akses', kirim: 'dana-kirim'}, field: ['kodeAkses', 'nama', 'email', 'wa', 'sekolah', 'kota', 'provinsi', 'ref', 'requestId', 'consent', 'website', 'perangkat'], maks: 8192},
  klaim: {aksi: {cek: 'klaim-cek', verifikasi: 'klaim-verifikasi'}, field: ['kode', 'email', 'perangkat'], maks: 8192},
  survei: {aksi: {kirim: 'survei-kirim'}, field: ['destinasi', 'kegiatan', 'waktu', 'status', 'provinsi', 'impian', 'email', 'ref', 'requestId', 'website', 'perangkat'], maks: 8192},
};
const AKSI_ADMIN = ['admin-login', 'admin-data', 'admin-simpan-pengaturan', 'admin-simpan-live', 'admin-impor', 'admin-ekspor', 'admin-ganti-sandi', 'admin-keluar', 'admin-primer'];

const CACHE = {
  tidak: 'no-store',
  config: 'public, max-age=0, s-maxage=30, stale-while-revalidate=300',
  kata: 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
  stats: 'public, max-age=0, s-maxage=120, stale-while-revalidate=600',
  pemenang: 'public, max-age=0, s-maxage=20, stale-while-revalidate=120',
};

// IP tidak pernah disimpan mentah; hanya hash bergaram untuk batas percobaan di Code.gs.
const ipHash = (ip) => (ip ? crypto.createHash('sha256').update((process.env.YCS_IP_SALT || 'ycs2026-salt') + ip).digest('base64url').slice(0, 32) : '');
const opsional = (v, max, re) => v === undefined || v === '' || (typeof v === 'string' && v.length <= max && (!re || re.test(v)));

function buatApi(data) {
  const app = () => data.app;
  const duta = buatDuta(app, {state: () => data.monster.state, ubah: () => data.tandai()});
  const dummy = buatDummy({state: () => data.monster.state, ubah: () => data.tandai()});
  const plaza = buatPlaza();
  const gambar = buatGambar(data.dataDir);
  const nAsli = () => { try { const d = app().get('kata'); return d && d.ok ? d.total || 0 : 0; } catch (e) { return 0; } };
  const kataDiblokir = (k) => { try { return !!app().ctx.kataDiblokir_(k, app().ctx.bacaPengaturan_()); } catch (e) { return false; } };
  const jawab = (body, cache = CACHE.tidak, kode, header) => ({kode: kode || (body.ok ? 200 : (STATUS[body.error] || 422)), body, cache, header});
  // GET Code.gs: bila skema ikut diperbarui (pastikanSkema_), tandai agar tersimpan & diteruskan.
  function baca(aksi) {
    const skema = app().props.get('skema_versi');
    const out = app().get(aksi);
    if (app().props.get('skema_versi') !== skema) data.tandai();
    return out;
  }
  function tulis(payload) {
    const out = app().post(payload);
    data.tandai();
    data.monster.segarkan();
    return out;
  }

  /* ---------- baca ---------- */
  function config() {
    const d = baca('config');
    if (d.ok !== true) return jawab({ok: false, error: 'connection'});
    delete d.now;
    return jawab(d, CACHE.config);
  }
  function revealTunggu(buka) {
    const sisa = Math.floor((buka - Date.now()) / 1000);
    return jawab({ok: false, error: 'belum_waktunya', buka: new Date(buka).toISOString()}, 'public, max-age=0, s-maxage=' + Math.max(1, Math.min(30, sisa - 1)), 425, {'Retry-After': String(Math.max(1, Math.min(30, sisa)))});
  }
  // Daftar finalis baru bisa diambil setelah waktu_pengumuman (jam server).
  function reveal() {
    const cfg = baca('config');
    const buka = cfg.pengumuman ? Date.parse(cfg.pengumuman) : null;
    if (!buka) return jawab({ok: false, error: 'belum_diatur'}, 'public, max-age=0, s-maxage=30');
    if (Date.now() < buka) return revealTunggu(buka);
    const d = baca('reveal');
    if (d.error === 'belum_waktunya') return revealTunggu(Date.parse(d.buka) || Date.now() + 2000);
    if (d.ok !== true) return jawab({ok: false, error: 'connection'});
    const kosong = !d.finalis || !d.finalis.length;
    return jawab(d, kosong ? 'public, max-age=0, s-maxage=30' : 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400');
  }

  /* ---------- tulis ---------- */
  function formulir(nama, p, ip) {
    const f = FORMULIR[nama];
    const aksi = p && f.aksi[p.aksi];
    if (!aksi) return jawab({ok: false, error: 'validation'});
    const payload = {aksi, ipHash: ipHash(ip)};
    f.field.forEach((k) => { if (p[k] !== undefined) payload[k] = p[k]; });
    return jawab(tulis(payload));
  }
  // Twibbon (fitur lama, masih diterima): validasi ketat sebelum disimpan.
  function twibbon(p) {
    if (!p || JSON.stringify(p).length > 4096 || typeof p.name !== 'string' || typeof p.school !== 'string' || typeof p.email !== 'string' || p.name.trim().length < 2 || p.name.length > 60 || p.school.trim().length < 2 || p.school.length > 100 || p.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(p.email.trim()) || !/^[a-f0-9-]{36}$/i.test(p.requestId || '') || !['delegasi', 'squad'].includes(p.frame) || p.consent !== true || p.channelClicked !== true || p.website || !opsional(p.city, 80) || !opsional(p.province, 40) || !opsional(p.ref, 40, /^[\w-]+$/)) return jawab({ok: false, error: 'validation'}, CACHE.tidak, 400);
    const r = tulis(p);
    if (r.ok !== true || r.requestId !== p.requestId) return jawab({ok: false, error: r.error || 'save_failed'}, CACHE.tidak, r.error === 'rate_limit' ? 429 : 502);
    return jawab({ok: true, requestId: r.requestId});
  }
  // Admin: semua cek password/sesi terjadi di Code.gs; admin-primer (status server, ambil ulang Sheet, monster) di sini.
  async function admin(p, ip) {
    if (!p || !AKSI_ADMIN.includes(p.aksi)) return jawab({ok: false, error: 'validation'});
    if (p.aksi !== 'admin-primer') return jawab(tulis({...p, ipHash: ipHash(ip)}));
    const sah = typeof p.token === 'string' && p.token.length >= 40 && !!app().cache.get('adm:' + app().ctx.hash_(p.token));
    if (!sah) return jawab({ok: false, error: 'sesi_habis'});
    if (p.perintah === 'monster' && p.data && /^dummy-/.test(p.data.aksi)) { const d = dummy.admin(p.data, nAsli(), kataDiblokir); if (d.ok) app().ctx.logAdmin_('warga dummy', `${d.aktif ? 'aktif' : 'nonaktif'} ${d.jumlah}`); return jawab(d); }
    if (p.perintah === 'monster') return jawab(data.monster.admin({...p.data, token: p.token}));
    if (p.perintah === 'popup-gambar') { const d = gambar.simpan(p.data && p.data.gambar); if (d.ok) app().ctx.logAdmin_('unggah gambar pop-up', d.url); return jawab(d); }
    if (p.perintah === 'tarik-sheet') {
      if (!data.adaSheet) return jawab({ok: false, error: 'tanpa_sheet'});
      if (data.tertunda()) return jawab({ok: false, error: 'masih_sinkron'});
      const kunci = 'adm:' + app().ctx.hash_(p.token), sesi = app().cache.get(kunci);
      await data.impor();
      app().cache.put(kunci, sesi || '1', 21600); // sesi admin tetap berlaku setelah impor
      app().ctx.logAdmin_('ambil ulang data dari Sheet', '');
      data.tandai();
    }
    return jawab({ok: true, tertunda: data.tertunda(), ...data.info});
  }

  /* ---------- Lawan Monster ---------- */
  function monsterGet(uji) {
    let st = data.monster.lihat(uji);
    if (!uji && st.id && st.fase !== 'tunggu') { const r = dummy.ramai(nAsli()); if (r) st = {...st, ramai: r}; } // pejuang tampilan (warga plaza)
    const cache = uji ? CACHE.tidak : st.fase === 'tanding' ? 'public, max-age=0, s-maxage=1, stale-while-revalidate=2'
      : st.mulai && st.fase === 'tunggu' ? 'public, max-age=0, s-maxage=' + Math.max(1, Math.min(15, Math.floor((Date.parse(st.mulai) - Date.now()) / 1000) - 1)) : 'public, max-age=0, s-maxage=10';
    return jawab(st, cache);
  }
  function monsterPost(p, ip, adminSaja) {
    const aksi = {masuk: () => data.monster.masuk(p, ip), tap: () => data.monster.tap(p), hindar: () => data.monster.hindar(p), saya: () => data.monster.saya(p), misi: () => data.monster.klaimMisi(p), potion: () => data.monster.pakaiPotion(p)}[p && p.aksi];
    const out = adminSaja ? data.monster.admin(p || {}) : aksi ? aksi() : {ok: false, error: 'validation'};
    return jawab(out, CACHE.tidak, out.ok ? 200 : (STATUS_MONSTER[out.error] || 422));
  }

  // rute: 'METODE nama' → {maks: byte body, fn(body, ip, url)}
  const rute = {
    'GET config': {fn: config},
    'GET popup-gambar': {fn: (p, ip, url) => {
      const g = gambar.ambil();
      if (!g) return jawab({ok: false, error: 'tidak_ada'}, 'public, max-age=0, s-maxage=30', 404);
      const tepat = url.searchParams.get('v') === g.v;
      return {kode: 200, mentah: g.buf, cache: tepat ? 'public, max-age=31536000, immutable' : 'public, max-age=0, s-maxage=30', header: {'Content-Type': g.mime}};
    }},
    'GET now': {fn: () => jawab({ok: true, now: Date.now()})},
    'GET stats': {fn: () => { const d = baca('stats'); return d.ok === true ? jawab(d, CACHE.stats) : jawab({ok: false, error: 'connection'}); }},
    'GET reveal': {fn: reveal},
    'GET kata': {fn: (p, ip, url) => {
      const d = baca('kata');
      if (d.ok !== true) return jawab({ok: false, error: 'connection'});
      const dt = duta.orangPlaza(); // peserta lolos = warga plaza (kata tulisan mereka sendiri; tidak menambah hitungan kata)
      const asli = d.orang || [], dm = dummy.tampil(d.total || 0);
      const q = url && url.searchParams.get('cari');
      if (q != null) return jawab({ok: true, hasil: plaza.cari(q.slice(0, 40), asli, dt, dm)}, 'public, max-age=0, s-maxage=30, stale-while-revalidate=60');
      // Plaza bergilir: semua warga dihitung (hingga 50.000+), yang digambar maks 2.000 sekaligus & berganti tiap menit.
      const orang = plaza.sampel(dt, asli, dm);
      return jawab({...d, orang, kata: dummy.hitungKata(d.kata, dm), total: (d.total || 0) + dm.length, duta: dt.length, tampil: orang.length}, CACHE.kata);
    }},
    'POST kata': {maks: FORMULIR.kata.maks, fn: (p, ip) => formulir('kata', p, ip)},
    'POST dana': {maks: FORMULIR.dana.maks, fn: (p, ip) => formulir('dana', p, ip)},
    'POST klaim': {maks: FORMULIR.klaim.maks, fn: (p, ip) => formulir('klaim', p, ip)},
    'POST survei': {maks: FORMULIR.survei.maks, fn: (p, ip) => formulir('survei', p, ip)},
    'POST twibbon': {maks: 4096, fn: (p) => twibbon(p)},
    'POST admin': {maks: 600000, fn: admin},
    'GET monster': {fn: (p, ip, url) => monsterGet(url.searchParams.get('uji'))},
    'POST monster': {maks: 4096, fn: (p, ip) => monsterPost(p, ip, false)},
    'POST monster/admin': {maks: 4096, fn: (p, ip) => monsterPost(p, ip, true)},
    'GET pemenang': {fn: () => jawab(data.monster.pemenangPublik(), CACHE.pemenang)},
    'GET misi': {fn: () => jawab(data.monster.misiPublik(), 'public, max-age=0, s-maxage=30, stale-while-revalidate=120')},
    'POST duta': {maks: 2048, fn: (p, ip) => { const d = p && p.aksi === 'kata' ? duta.tulisKata(p, ipHash(ip) || 'x') : {ok: false, error: 'validation'}; return jawab(d, CACHE.tidak, d.ok ? 200 : d.error === 'terlalu_banyak' ? 429 : d.error === 'tidak_ditemukan' ? 404 : 422); }},
    'GET duta': {fn: (p, ip, url) => { const d = duta.lihat(url.searchParams.get('kode') || ''); return jawab(d, 'public, max-age=0, s-maxage=20, stale-while-revalidate=60', d.ok ? 200 : 404); }},
  };
  return {rute, STATUS};
}

module.exports = {buatApi, FORMULIR, AKSI_ADMIN, ipHash};
