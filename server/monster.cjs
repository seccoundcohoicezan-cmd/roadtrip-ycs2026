// Mesin "Lawan Monster" di server data (satu proses Node → setiap operasi atomik tanpa Redis).
// - jadwal(): event dari pemicu admin, memakai jam server.
// - masuk(): 1 perangkat = 1 peserta festival (email terdaftar di Satu Kata), ikatan permanen sampai admin melepasnya.
// - tap(): batas 10 tap/detik (token bucket, burst 30), seq anti-duplikat, poin dari level, naik level/kalah.
// - tiket: tiap peserta yang berkontribusi mendapat 1 tiket per event → tab "Tiket Monster" (diteruskan ke Sheet).
// - spin(): undian tiket saat live, acak di server (crypto), pemenang dicatat.
const crypto = require('node:crypto');
const {aturan, intervalUntuk} = require('../assets/js/monster-aturan.js');

const MENIT = 60000;
const PASCA = 15 * MENIT;       // hasil event masih tampil 15 menit setelah jendela berakhir
const TUNGGU = 24 * 60 * MENIT; // hitung mundur mulai 24 jam sebelumnya
const AKTIF_MS = 15000;         // pemain dihitung aktif bila mengirim tap dalam 15 detik terakhir
const angka = (v, d, min, maks) => { const n = Number(String(v ?? '').replace(',', '.')); return String(v ?? '').trim() !== '' && Number.isFinite(n) ? Math.min(maks, Math.max(min, n)) : d; };

function jadwal(cfg, now) {
  const m = (cfg && cfg.monster) || {};
  if (!m.aktif) return {fase: 'mati'};
  if (String(m.darurat).toUpperCase() === 'STOP') return {fase: 'mati', dihentikan: true};
  const durasi = angka(m.durasi, 20, 1, 180) * MENIT;
  const live = (cfg.live || []).map((l) => ({judul: l.judul, platform: l.platform, link: l.link, mulai: Date.parse(l.mulai), selesai: Date.parse(l.selesai)}))
    .filter((l) => Number.isFinite(l.mulai)).sort((a, b) => a.mulai - b.mulai);
  const liveSetelah = (t) => live.find((l) => l.mulai >= t - MENIT) || null;
  const jendela = (prefiks, mulai, selesai, lv) => {
    const id = prefiks + mulai.toString(36);
    if (now < mulai) return now >= mulai - TUNGGU ? {fase: 'tunggu', id, mulai, selesai, live: lv} : null;
    if (now < selesai + PASCA) return {fase: 'aktif', id, mulai, selesai, live: lv};
    return null;
  };
  const manual = Number(m.mulaiManual);
  if (String(m.darurat).toUpperCase() === 'MULAI' && Number.isFinite(manual) && manual > 0) {
    const j = jendela('m', manual, manual + durasi, liveSetelah(manual));
    if (j) return j;
  }
  const pemicu = ['sebelum_live', 'jadwal', 'manual'].includes(m.pemicu) ? m.pemicu : 'sebelum_live';
  if (pemicu === 'sebelum_live') {
    const menit = angka(m.menit, 20, 1, 180) * MENIT;
    for (const l of live) { const j = jendela('l', l.mulai - menit, l.mulai, l); if (j) return j; }
  } else if (pemicu === 'jadwal') {
    const t = Date.parse(m.waktu);
    if (Number.isFinite(t)) { const j = jendela('j', t, t + durasi, liveSetelah(t + durasi)); if (j) return j; }
  }
  return {fase: 'tidak_ada'};
}

const namaTampil = (n) => { const b = String(n || '').trim().split(/\s+/); return b.length > 1 ? b[0] + ' ' + b[b.length - 1][0] + '.' : b[0] || ''; };
const bersihEmail = (e) => String(e || '').trim().toLowerCase();
// Nomor WhatsApp Indonesia → 62xxxxxxxxxx (null bila tidak valid).
const normWa = (v) => { const d = String(v || '').replace(/[^\d+]/g, '').replace(/^\+/, ''); const n = d.startsWith('0') ? '62' + d.slice(1) : d; return /^628\d{7,12}$/.test(n) ? n : null; };
// Kunci kontak peserta: email (huruf kecil) atau "wa:62…".
const kunciKontak = (email, wa) => { const e = bersihEmail(email); if (e && e.includes('@')) return e; const w = normWa(wa || email); return w ? 'wa:' + w : ''; };
const kontakTampil = (k) => (String(k).startsWith('wa:') ? '+' + String(k).slice(3) : k);

// app = mesin Apps Script di memori (server/gas-memori.cjs); simpan = fungsi menandai state berubah.
function buatMonster(app, opsi = {}) {
  const rahasia = opsi.rahasia || crypto.randomBytes(32).toString('hex');
  const now = opsi.now || Date.now;
  const st = opsi.state || {};
  st.perangkat = st.perangkat || {}; // id perangkat → {email, fp, ip, t}
  st.email = st.email || {};         // email → id perangkat
  st.events = st.events || {};       // id event → {lvl, tenaga, total, kalah, naik, u:{pid:{p,q}}, tiket:{pid:nomor}, n, final}
  st.uji = st.uji || null;           // mode uji monster: {kode, mulai, sampai} — event terpisah, hanya lewat link ?uji-monster=kode
  st.ujiPemain = st.ujiPemain || {}; // pid → identitas penguji (tidak mengikat perangkat)
  st.spin = st.spin || {hadiah: [], peluang: 'rata'}; // hadiah: [{id, nama, stok|null, bobot, terpakai, gambar?}]
  st.spin.hasil = st.spin.hasil || []; // undian 2 tahap: [{ke, id, sumber, nama, sekolah, kota, provinsi, jalur, hadiah, hadiahId, waktu}]
  const ember = new Map();           // batas kecepatan per pemain (tidak perlu disimpan)
  const aktif = new Map();           // id event → Map(pid → terakhir aktif)
  const ipHitung = new Map();        // batas token per IP: ip → {n, sampai}
  const ubah = () => opsi.saatUbah && opsi.saatUbah();

  // Pengaturan dibaca dari mesin Apps Script (tab Pengaturan + Jadwal Live), dimemo 1 detik untuk ribuan tap/detik.
  let memo = {t: 0, v: null};
  const cfg = () => {
    if (memo.v && now() - memo.t < 1000) return memo.v;
    const c = app.ctx.konfigPublik_();
    memo = {t: now(), v: {monster: c.monster || {}, live: c.live || []}};
    return memo.v;
  };
  const pidDari = (perangkat) => crypto.createHash('sha256').update('pid|' + perangkat).digest('base64url').slice(0, 18);
  const tanda = (pid) => crypto.createHmac('sha256', rahasia).update(pid).digest('base64url').slice(0, 22);
  const pidKe = new Map(); // pid → id perangkat
  Object.keys(st.perangkat).forEach((d) => pidKe.set(pidDari(d), d));
  function cekToken(t) {
    if (typeof t !== 'string' || t.length > 80) return null;
    const [pid, sig] = t.split('.');
    if (!pid || !sig || !pidKe.has(pid)) return null;
    const a = Buffer.from(sig), b = Buffer.from(tanda(pid));
    return a.length === b.length && crypto.timingSafeEqual(a, b) ? pid : null;
  }

  // Identitas peserta festival dari tab Satu Kata (email kolom 9). Indeks dibangun ulang bila jumlah baris berubah.
  let indeks = {n: -1, map: new Map(), kunci: []};
  // Indeks warga festival dari tab Satu Kata (email kolom 9, WhatsApp kolom 12). Satu baris = satu karakter.
  function bangunIndeks() {
    const sh = app.sheets['Satu Kata'];
    const rows = sh ? sh.rows : [];
    if (rows.length === indeks.n) return indeks;
    const map = new Map(), kunci = [];
    rows.slice(1).forEach((r) => {
      const e = bersihEmail(r[8]), w = normWa(r[11]);
      const k = e && e.includes('@') ? e : w ? 'wa:' + w : '';
      if (!k || map.has(k)) return;
      const o = {kunci: k, nama: String(r[6] || ''), sekolah: String(r[7] || ''), provinsi: String(r[3] || ''), kata: String(r[2] || '')};
      map.set(k, o); kunci.push(k);
      if (e && e.includes('@') && w && !map.has('wa:' + w)) map.set('wa:' + w, o);
    });
    indeks = {n: rows.length, map, kunci};
    return indeks;
  }
  const peserta = (kunci) => bangunIndeks().map.get(kunci) || null;
  // Populasi karakter sebuah event: semua warga festival (+ penguji pada mode uji).
  const populasi = (j) => { const k = bangunIndeks().kunci; return j && j.uji ? k.concat(Object.keys(st.ujiPemain).map((pid) => 'uji:' + pid)) : k; };
  // Kunci karakter milik seorang pemain (pid).
  const kunciPemain = (pid) => (pid[0] === '~' ? 'uji:' + pid : (st.perangkat[pidKe.get(pid)] || {}).email || '');

  function ev(id) {
    if (!st.events[id]) st.events[id] = {lvl: 1, tenaga: 0, total: 0, kalah: 0, naik: 0, u: {}, tiket: {}, n: 0, final: false, nyawa: 100, jurusKe: 0, totalJurus: 0, monsterMenang: 0, jurusInfo: null};
    return st.events[id];
  }
  function jumlahAktif(id) {
    const m = aktif.get(id);
    if (!m) return 0;
    const batas = now() - AKTIF_MS;
    for (const [k, t] of m) if (t < batas) m.delete(k);
    return m.size;
  }

  // Mode uji: abaikan saklar aktif/darurat; hanya klien yang membawa kode uji yang melihat event ini.
  function jadwalUntuk(c, t, uji) {
    if (!uji) return jadwal(c, t);
    const u = st.uji;
    if (!u || uji !== u.kode) return {fase: 'mati', ujiSalah: true};
    if (t >= u.sampai + PASCA) return {fase: 'tidak_ada', uji: true};
    const live = (c.live || []).map((l) => ({judul: l.judul, platform: l.platform, link: l.link, mulai: Date.parse(l.mulai)})).filter((l) => l.mulai >= t).sort((a, b) => a.mulai - b.mulai)[0] || null;
    return {fase: 'aktif', id: 'u' + u.mulai.toString(36), mulai: u.mulai, selesai: u.sampai, live, uji: true};
  }
  // Pengaturan efektif per event: event uji boleh memakai target tap sendiri (diisi admin saat Mulai uji).
  const mUntuk = (c, j) => (j && j.uji && st.uji && st.uji.target ? {...c.monster, target: st.uji.target} : c.monster);
  const ujiSah = (kode) => !!(kode && st.uji && kode === st.uji.kode);

  // Jurus monster: tiap J detik sejak event mulai, nyawa warga berkurang damage × skala level.
  // Perisai: tenaga yang terkumpul sejak jurus sebelumnya (≥ perisai% target level) menahan hingga 80% damage.
  // Diproses malas (saat status/tap diminta) dengan jam server, jadi semua HP melihat nyawa yang sama.
  // Jurus monster (karakter ber-nyawa):
  //   - Setiap karakter punya hpMaks nyawa (monster_hp_warga, bawaan 5); tiap kena jurus −1, tumbang di 0.
  //   - SASARAN jurus berikutnya dipilih lebih dulu (e.target) agar monster terlihat mendekati & mengejar mereka.
  //   - Jumlah pukulan = populasi awal × damage% × skala level × (1 − perisai), minimal 1.
  //   - Sasaran yang menekan HINDAR saat peringatan selamat (pukulan meleset). Karakter tumbang tidak bisa menyerang.
  //   - Semua karakter tumbang → monster menang. Diproses malas dengan jam server.
  const hpMaksDari = (m) => Math.round(angka(m.hpWarga, 5, 1, 20));
  const tampilKarakter = (k) => { if (String(k).startsWith('uji:')) { const o = st.ujiPemain[String(k).slice(4)] || {}; return [namaTampil(o.nama || 'Penguji'), o.kata || '']; } const o = peserta(k) || {}; return [namaTampil(o.nama), o.kata || '']; };
  function pukulanMaks(m, a, e, pop, li) {
    const dmg = angka(m.jurusDamage, 4, 0, 100);
    if (!dmg) return 0;
    return Math.max(1, Math.round(Math.max(pop.length, e.populasiAwal || 0) * dmg / 100 * a.skala[li]));
  }
  // Pola jurus (sama di semua HP): tusuk, tebas, METEOR, hentak, tusuk, METEOR, … — tiap jurus ke-3 = Hujan Meteor Api,
  // serangan AREA yang mengenai semua karakter hidup (cocok untuk ribuan pemain). Selamat hanya dengan PERISAI (1× per hujan).
  const POLA_JURUS = ['tusuk', 'tebas', 'hentak'];
  const jenisJurus = (k) => (k > 0 && k % 3 === 0 ? 'meteor' : POLA_JURUS[(k - Math.floor(k / 3) - 1) % 3]);
  // Pilih sasaran (boleh berulang bila pukulan > karakter hidup) untuk jurus ke-k.
  function pilihTarget(m, a, e, pop, k) {
    if (jenisJurus(k) === 'meteor') { e.target = {ke: k, daftar: [], area: true}; return; }
    const li = Math.min(e.lvl, a.target.length) - 1;
    const hidup = pop.filter((x) => !e.mati[x]);
    const n = Math.min(pukulanMaks(m, a, e, pop, li), hidup.length * hpMaksDari(m));
    const daftar = [];
    for (let i = 0; i < n && hidup.length; i++) {
      if (i % hidup.length === 0) for (let x = hidup.length - 1; x > 0; x--) { const r = crypto.randomInt(x + 1); [hidup[x], hidup[r]] = [hidup[r], hidup[x]]; }
      daftar.push(hidup[i % hidup.length]);
    }
    e.target = {ke: k, daftar};
  }
  function prosesJurus(c, j, e, t) {
    const m = mUntuk(c, j);
    if (!m.jurus || e.kalah || e.monsterMenang || !j.mulai) return;
    if (!e.mati) Object.assign(e, {mati: {}, hindar: {}, jurusKe: e.jurusKe || 0, totalJurus: e.totalJurus || 0, monsterMenang: 0, jurusInfo: null});
    if (!e.hp) e.hp = {};
    const J = angka(m.jurusDetik, 8, 4, 60) * 1000, hpMaks = hpMaksDari(m);
    const a = aturan(m), pop = populasi(j);
    if (!e.populasiAwal) e.populasiAwal = pop.length;
    const kMaks = Math.floor((Math.min(t, j.selesai) - j.mulai) / J);
    let ubahan = false;
    for (let k = e.jurusKe + 1; k <= kMaks; k++) {
      if (!e.target || e.target.ke !== k) pilihTarget(m, a, e, pop, k);
      const li = Math.min(e.lvl, a.target.length) - 1;
      const perisaiTarget = a.target[li] * angka(m.perisai, 2, 0, 100) / 100;
      const dapat = Math.max(0, e.total - e.totalJurus);
      const tahan = perisaiTarget > 0 ? Math.min(0.8, 0.8 * dapat / perisaiTarget) : 0;
      const aman = new Set(e.hindar[k] || []);
      let daftar;
      if (e.target.area) { // meteor: semua karakter hidup kena, kecuali yang memasang perisai; tenaga warga meredam sebagian
        const hidupK = pop.filter((x) => !e.mati[x]);
        for (let x = hidupK.length - 1; x > 0; x--) { const r = crypto.randomInt(x + 1); [hidupK[x], hidupK[r]] = [hidupK[r], hidupK[x]]; }
        const terbuka = hidupK.filter((x) => !aman.has(x)), terlindung = hidupK.filter((x) => aman.has(x));
        daftar = [...terbuka.slice(0, Math.max(terbuka.length ? 1 : 0, Math.round(terbuka.length * (1 - tahan)))), ...terlindung];
      } else daftar = e.target.daftar.slice(0, Math.max(e.target.daftar.length ? 1 : 0, Math.round(e.target.daftar.length * (1 - tahan))));
      const kena = [], meleset = new Set();
      let tumbang = 0;
      for (const x of daftar) {
        if (e.mati[x]) continue;
        if (aman.has(x)) { meleset.add(x); continue; }
        e.hp[x] = (e.hp[x] ?? hpMaks) - 1;
        if (e.hp[x] <= 0) { e.mati[x] = k; tumbang++; }
        kena.push(x);
      }
      e.totalJurus = e.total; e.jurusKe = k;
      delete e.hindar[k];
      const hidup = pop.filter((x) => !e.mati[x]).length;
      // untuk tampilan: siapa saja yang kena (maks 30) dengan sisa nyawanya
      const unik = [...new Set(kena)].slice(0, 30).map((x) => [...tampilKarakter(x), Math.max(0, e.hp[x]), e.mati[x] ? 1 : 0]);
      e.jurusInfo = {ke: k, jenis: jenisJurus(k), pukulan: kena.length, tumbang, menghindar: meleset.size, tahan: Math.round(tahan * 100), kena: unik};
      e.hidup = hidup;
      ubahan = true;
      if (pop.length && hidup === 0) { e.monsterMenang = j.mulai + k * J; break; }
      pilihTarget(m, a, e, pop, k + 1);
    }
    if (!e.monsterMenang && t < j.selesai && (!e.target || e.target.ke !== e.jurusKe + 1)) { pilihTarget(m, a, e, pop, e.jurusKe + 1); ubahan = true; }
    if (ubahan) ubah();
  }



  function status(c, j, t) {
    const m = mUntuk(c, j);
    const a = aturan(m);
    const dasar = {ok: true, now: t, fase: j.fase, nama: m.nama || 'Raja Batu', wujud: m.wujud === 'lucu' ? 'lucu' : 'raja_batu'};
    if (j.dihentikan) dasar.dihentikan = true;
    if (j.uji) dasar.uji = true;
    if (j.ujiSalah) dasar.ujiSalah = true;
    if (!j.id) return dasar;
    const live = j.live ? {judul: j.live.judul, platform: j.live.platform, link: j.live.link, mulai: new Date(j.live.mulai).toISOString()} : null;
    const out = {...dasar, id: j.id, mulai: new Date(j.mulai).toISOString(), selesai: new Date(j.selesai).toISOString(), live, levelMaks: a.target.length, target: a.target, poin: a.poin, skala: a.skala};
    if (j.fase === 'tunggu') return out;
    const e = t >= j.mulai ? ev(j.id) : {lvl: 1, tenaga: 0, total: 0, kalah: 0, naik: 0, n: 0, nyawa: 100};
    if (t >= j.mulai) prosesJurus(c, j, e, t);
    const pemain = jumlahAktif(j.id);
    out.fase = e.kalah ? 'menang' : e.monsterMenang ? 'monster_menang' : t < j.selesai ? 'tanding' : 'habis';
    const J = angka(m.jurusDetik, 8, 4, 60) * 1000;
    const pop = t >= j.mulai ? populasi(j).length : 0;
    const hidupN = e.mati ? pop - Object.keys(e.mati).filter((k) => e.mati[k]).length : pop;
    Object.assign(out, {hidup: Math.max(0, hidupN), totalWarga: pop, nyawa: pop ? Math.round(Math.max(0, hidupN) / pop * 1000) / 10 : 100, jurus: !!m.jurus, jurusMs: J, jurusAnimMs: Math.round(angka(m.jurusAnim, 1.6, 0.6, 4) * 1000), jurusDmgMaks: Math.round(angka(m.jurusDamage, 4, 0, 100) * a.skala[Math.min(e.lvl || 1, a.target.length) - 1] * 10) / 10, hindarMs: 2500, hpMaks: hpMaksDari(m),
      jurusTarget: e.target && e.target.ke === (e.jurusKe || 0) + 1 ? [...new Set(e.target.daftar)].slice(0, 30).map((x) => [...tampilKarakter(x), Math.max(0, (e.hp || {})[x] ?? hpMaksDari(m))]) : [], jurusKe: e.jurusKe || 0, jurusJenis: jenisJurus((e.jurusKe || 0) + 1), jurusBerikut: m.jurus && out.fase === 'tanding' ? j.mulai + ((e.jurusKe || 0) + 1) * J : null,
      jurusInfo: e.jurusInfo || null, monsterMenang: e.monsterMenang ? new Date(e.monsterMenang).toISOString() : null});
    Object.assign(out, {level: Math.min(e.lvl, a.target.length), tenaga: e.tenaga, total: e.total, kalah: e.kalah ? new Date(e.kalah).toISOString() : null, naik: e.naik || null,
      pemain, tiket: e.n, interval: intervalUntuk(a.interval, pemain)});
    if (out.fase !== 'tanding' && st.events[j.id] && !e.final && Object.keys(e.u).length) finalisasi(j.id, out);
    return out;
  }

  function lihat(uji) {
    const c = cfg(), t = now();
    return status(c, jadwalUntuk(c, t, uji || null), t);
  }

  function masuk(p, ip) {
    const perangkat = String(p.perangkat || '');
    if (!/^[\w-]{16,64}$/.test(perangkat)) return {ok: false, error: 'validation'};
    const email = kunciKontak(p.email, p.wa); // kunci karakter: email atau "wa:62…"
    if (p.uji) {
      // Mode uji: tidak wajib peserta festival dan tidak mengikat perangkat (aturan 1 perangkat tetap utuh untuk event asli).
      if (!ujiSah(p.uji)) return {ok: false, error: 'uji_berakhir'};
      const pid = '~' + pidDari(perangkat).slice(1); // '~' bukan karakter base64url → tidak bentrok dengan pid asli
      const orang = peserta(email) || {nama: 'Penguji ' + perangkat.slice(-4), sekolah: '-', provinsi: '-'};
      st.ujiPemain[pid] = {email, nama: orang.nama, sekolah: orang.sekolah, provinsi: orang.provinsi, kata: orang.kata || ''};
      pidKe.set(pid, perangkat);
      const j = jadwalUntuk(cfg(), now(), p.uji), e = j.id && st.events[j.id];
      return {ok: true, uji: true, token: pid + '.' + tanda(pid), nama: namaTampil(orang.nama), tiket: e && e.tiket[pid] ? e.tiket[pid] : null, saya: e && e.u[pid] ? e.u[pid].p : 0, mati: !!(e && e.mati && e.mati['uji:' + pid])};
    }
    const ada = st.perangkat[perangkat];
    if (!ada) {
      // batas perangkat baru per IP (CGNAT seluler: longgar), 300 / 10 menit
      const h = ipHitung.get(ip) || {n: 0, sampai: now() + 600000};
      if (h.sampai < now()) { h.n = 0; h.sampai = now() + 600000; }
      if (++h.n > (opsi.batasMasuk || 300)) { ipHitung.set(ip, h); return {ok: false, error: 'rate_limit'}; }
      ipHitung.set(ip, h);
    }
    const orang = peserta(email);
    if (!orang) return {ok: false, error: 'belum_festival'};
    const kunci = orang.kunci; // karakter utama (email/WhatsApp yang dipakai saat daftar)
    if (ada && ada.email !== kunci) return {ok: false, error: 'perangkat_dipakai', nama: namaTampil((peserta(ada.email) || {}).nama)};
    if (!ada && st.email[kunci] && st.email[kunci] !== perangkat) return {ok: false, error: 'email_perangkat_lain'};
    if (!ada) {
      st.perangkat[perangkat] = {email: kunci, fp: String(p.fp || '').slice(0, 40), ip: String(ip || '').slice(0, 40), t: now()};
      st.email[kunci] = perangkat;
      pidKe.set(pidDari(perangkat), perangkat);
      ubah();
    }
    const pid = pidDari(perangkat);
    const j = jadwal(cfg(), now());
    const e = j.id && st.events[j.id];
    return {ok: true, token: pid + '.' + tanda(pid), nama: namaTampil(orang.nama), tiket: e && e.tiket[pid] ? e.tiket[pid] : null, saya: e && e.u[pid] ? e.u[pid].p : 0, mati: !!(e && e.mati && e.mati[kunci])};
  }

  // HINDAR: hanya saat peringatan jurus (≤ hindarMs sebelum jurus berikutnya). Karakter tumbang tidak bisa menghindar.
  const HINDAR_MS = 2500;
  function hindar(p) {
    const pid = cekToken(p.token);
    if (!pid) return {ok: false, error: 'sesi_habis'};
    const c = cfg(), t = now(), j = jadwalUntuk(c, t, p.uji || null);
    if (j.fase !== 'aktif' || p.e !== j.id) return {ok: false, error: 'bukan_waktunya'};
    const e = ev(j.id);
    prosesJurus(c, j, e, t);
    const kunci = kunciPemain(pid);
    if (!kunci) return {ok: false, error: 'sesi_habis'};
    if (e.mati && e.mati[kunci]) return {ok: true, mati: true};
    const m = mUntuk(c, j), J = angka(m.jurusDetik, 8, 4, 60) * 1000;
    const ke = (e.jurusKe || 0) + 1, T = j.mulai + ke * J;
    if (!m.jurus || t < T - HINDAR_MS || t > T + 300 || e.kalah || e.monsterMenang) return {ok: false, error: 'bukan_waktunya'};
    const daftar = (e.hindar[ke] = e.hindar[ke] || []);
    if (!daftar.includes(kunci)) { daftar.push(kunci); ubah(); }
    return {ok: true, aman: true, ke, jenis: jenisJurus(ke)};
  }
  // Status karakter milik pemain (dipanggil setelah tiap jurus): masih hidup atau sudah tumbang.
  function saya(p) {
    const pid = cekToken(p.token);
    if (!pid) return {ok: false, error: 'sesi_habis'};
    const c = cfg(), t = now(), j = jadwalUntuk(c, t, p.uji || null);
    const e = j.id && st.events[j.id];
    if (e && j.fase === 'aktif') prosesJurus(c, j, e, t);
    const kunci = kunciPemain(pid);
    const hpMaks = hpMaksDari(mUntuk(c, j));
    return {ok: true, mati: !!(e && e.mati && e.mati[kunci]), matiKe: e && e.mati ? e.mati[kunci] || null : null, hp: e && e.hp && e.hp[kunci] != null ? Math.max(0, e.hp[kunci]) : hpMaks, hpMaks,
      sasaran: !!(e && e.target && e.target.ke === (e.jurusKe || 0) + 1 && (e.target.area ? !(e.mati && e.mati[kunci]) : e.target.daftar.includes(kunci))), tiket: e && e.tiket[pid] ? e.tiket[pid] : null, saya: e && e.u[pid] ? e.u[pid].p : 0};
  }

  function terbitkanTiket(id, e, pid, a) {
    const perangkat = pidKe.get(pid) || '', info = st.perangkat[perangkat] || {};
    if (id[0] === 'u') { // tiket uji: disimpan di memori server, tidak ditulis ke Sheet
      const o = st.ujiPemain[pid] || {};
      e.n += 1;
      const nomor = '#' + String(e.n).padStart(4, '0');
      e.tiket[pid] = nomor;
      (e.ujiRows = e.ujiRows || []).push([new Date(now()).toISOString(), id, nomor, o.nama || '', o.sekolah || '', o.provinsi || '', o.email || '', perangkat.slice(0, 8), e.u[pid].p, 'aktif', 'UJI']);
      return nomor;
    }
    const orang = peserta(info.email) || {};
    e.n += 1;
    const nomor = '#' + String(e.n).padStart(4, '0'); // diawali # agar Sheet tidak mengubahnya jadi angka
    e.tiket[pid] = nomor;
    // Tanda perangkat mirip (sidik jari + IP sama) untuk ditinjau panitia, bukan diblokir otomatis (HP sekolah bisa sama).
    let catatan = '';
    if (info.fp) {
      const kembar = Object.entries(e.tiket).find(([q, no]) => q !== pid && (st.perangkat[pidKe.get(q)] || {}).fp === info.fp && (st.perangkat[pidKe.get(q)] || {}).ip === info.ip);
      if (kembar) catatan = 'perangkat mirip ' + kembar[1];
    }
    const sh = app.sheets['Tiket Monster'] || app.ctx.tab_(app.ss, 'tiket');
    sh.appendRow([new Date(now()), id, nomor, orang.nama || '', orang.sekolah || '', orang.provinsi || '', kontakTampil(info.email || ''), perangkat.slice(0, 8), e.u[pid].p, 'aktif', catatan]);
    return nomor;
  }

  function tap(p) {
    const pid = cekToken(p.token);
    if (!pid) return {ok: false, error: 'sesi_habis'};
    const n = Math.floor(Number(p.n)), seq = Math.floor(Number(p.seq));
    if (!Number.isFinite(n) || n < 0 || n > 200 || !Number.isFinite(seq) || seq < 0) return {ok: false, error: 'validation'};
    const c = cfg(), t = now(), j = jadwalUntuk(c, t, p.uji || null);
    if (j.fase !== 'aktif' || p.e !== j.id) return {ok: true, terima: 0, buang: true, status: status(c, j, t)};
    if ((pid[0] === '~') !== !!j.uji) return {ok: false, error: 'sesi_habis'}; // token uji hanya untuk event uji
    const a = aturan(mUntuk(c, j)), e = ev(j.id), maks = a.target.length;
    prosesJurus(c, j, e, t);
    const kunciKu = kunciPemain(pid);
    if (e.mati && kunciKu && e.mati[kunciKu]) return {ok: true, terima: 0, mati: true, saya: (e.u[pid] || {}).p || 0, tiket: e.tiket[pid] || null, status: status(c, j, t)};
    const u = e.u[pid] || (e.u[pid] = {p: 0, q: -1});
    let terima = 0;
    const dup = seq <= u.q;
    if (!e.kalah && !e.monsterMenang && t < j.selesai && n > 0 && !dup) {
      const burst = Math.round(a.batasTap * 3);
      const b = ember.get(pid) || {t, s: burst};
      b.s = Math.min(burst, b.s + Math.max(0, t - b.t) * a.batasTap / 1000);
      b.t = t;
      terima = Math.max(0, Math.min(n, Math.floor(b.s)));
      b.s -= terima;
      ember.set(pid, b);
      u.q = seq;
      if (e.lvl > maks) e.lvl = maks;
      if (terima > 0) {
        const pts = terima * (a.poin[e.lvl - 1] || e.lvl);
        e.tenaga += pts; e.total += pts; u.p += pts;
        if (e.tenaga >= a.target[e.lvl - 1]) {
          if (e.lvl < maks) { e.lvl += 1; e.tenaga = 0; e.naik = t; }
          else { e.tenaga = a.target[e.lvl - 1]; e.kalah = t; }
        }
        if (!e.tiket[pid] && u.p >= angka(mUntuk(c, j).tiketMin, 1, 1, 1e9)) terbitkanTiket(j.id, e, pid, a);
      }
      ubah();
    }
    if (!aktif.has(j.id)) aktif.set(j.id, new Map());
    aktif.get(j.id).set(pid, t);
    return {ok: true, terima, dup, saya: u.p, tiket: e.tiket[pid] || null, mati: !!(e.mati && e.mati[kunciKu]), status: status(c, j, t)};
  }

  // Event selesai: kontribusi akhir ditulis ke tab tiket + satu baris ringkasan di tab Monster Event.
  function finalisasi(id, out) {
    const e = st.events[id];
    e.final = true;
    // Skema hadiah: kode undian hanya sah (ikut spin) bila Raja Batu tumbang. Monster menang / kabur → kode hangus.
    const HANGUS = 'hangus · bos tidak tumbang';
    const sah = !!out.kalah;
    if (id[0] === 'u') { (e.ujiRows || []).forEach((r) => { const pid = Object.keys(e.tiket).find((q) => e.tiket[q] === r[2]); if (pid) r[8] = e.u[pid].p; if (!sah && r[9] === 'aktif') r[9] = HANGUS; }); ubah(); return; }
    const sh = app.sheets['Tiket Monster'];
    if (sh) {
      const nomorPid = new Map(Object.entries(e.tiket).map(([pid, no]) => [no, pid]));
      sh.rows.forEach((r, i) => { if (i && r[1] === id && nomorPid.has(String(r[2]))) { r[8] = e.u[nomorPid.get(String(r[2]))].p; if (!sah && r[9] === 'aktif') r[9] = HANGUS; } });
    }
    const me = app.sheets['Monster Event'] || app.ctx.tab_(app.ss, 'monster');
    me.appendRow([id, out.mulai, out.selesai, out.kalah ? out.kalah : out.monsterMenang ? 'MONSTER MENANG ' + out.monsterMenang : 'kabur', e.total, Object.keys(e.u).length, e.n, '']);
    ubah();
  }

  /* ---------- Admin ---------- */
  const adminSah = (token) => typeof token === 'string' && token.length >= 40 && !!app.cache.get('adm:' + app.ctx.hash_(token));
  const barisTiket = (id) => {
    if (id && id[0] === 'u') return ((st.events[id] || {}).ujiRows || []).map((r, i) => ({r, i: i + 1}));
    const sh = app.sheets['Tiket Monster'];
    return sh ? sh.rows.map((r, i) => ({r, i})).filter((x) => x.i && x.r[1] === id) : [];
  };
  // Daftar event = state monster ∪ event yang punya tiket di tab "Tiket Monster" (tiket tetap bisa diundi walau state di-reset).
  function ringkasEvent() {
    const sh = app.sheets['Tiket Monster'];
    const ids = new Set(Object.keys(st.events));
    if (sh) sh.rows.slice(1).forEach((r) => r[1] && ids.add(String(r[1])));
    return [...ids].map((id) => {
      const e = st.events[id] || {total: 0, u: {}, kalah: 0};
      const t = barisTiket(id);
      return {id, uji: id[0] === 'u', total: e.total, pemain: Object.keys(e.u).length, tiket: t.length, kalah: !!e.kalah, pemenang: t.filter((x) => /^MENANG/.test(String(x.r[9]))).length};
    }).sort((a, b) => parseInt(b.id.slice(1), 36) - parseInt(a.id.slice(1), 36));
  }
  function infoUji() {
    const u = st.uji;
    if (!u) return null;
    const e = st.events['u' + u.mulai.toString(36)] || {};
    return {kode: u.kode, mulai: new Date(u.mulai).toISOString(), sampai: new Date(u.sampai).toISOString(), berjalan: now() < u.sampai, target: u.target, tiket: e.n || 0, total: e.total || 0, kalah: !!e.kalah, monsterMenang: !!e.monsterMenang};
  }

  /* ---------- Hadiah & peluang spin ---------- */
  const peluangHadiah = (daftar) => { const t = daftar.reduce((s, h) => s + h.bobot, 0); return daftar.map((h) => ({...h, persen: t ? Math.round(h.bobot / t * 1000) / 10 : 0})); };
  const tersedia = () => st.spin.hadiah.filter((h) => h.bobot > 0 && (h.stok == null || h.terpakai < h.stok));
  function infoSpin() {
    return {hadiah: peluangHadiah(st.spin.hadiah.map((h) => ({...h, sisa: h.stok == null ? null : Math.max(0, h.stok - h.terpakai)}))), roda: peluangHadiah(tersedia()), peluang: st.spin.peluang};
  }
  // Cadangan pengaturan hadiah di tab "Hadiah Spin".
  function tulisHadiah() {
    const sh = app.sheets['Hadiah Spin'] || app.ctx.tab_(app.ss, 'hadiah');
    const total = st.spin.hadiah.reduce((s, h) => s + h.bobot, 0);
    sh.rows.splice(1);
    st.spin.hadiah.forEach((h) => sh.rows.push([h.nama, h.stok == null ? 'tanpa batas' : h.stok, h.terpakai, h.bobot, total ? Math.round(h.bobot / total * 1000) / 10 + '%' : '0%']));
    sh.rows.push(['(peluang tiket)', st.spin.peluang === 'kontribusi' ? 'berdasarkan kontribusi' : 'sama rata', '', '', '']);
  }
  function aturSpin(p) {
    const daftar = Array.isArray(p.hadiah) ? p.hadiah : [];
    if (daftar.length > 40) return {ok: false, error: 'validation'};
    const lama = new Map(st.spin.hadiah.map((h) => [h.id, h]));
    const baru = [];
    for (const h of daftar) {
      const nama = String(h.nama || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 60);
      if (!nama) continue;
      const stok = h.stok === '' || h.stok == null ? null : Math.floor(Number(h.stok));
      const bobot = Number(String(h.bobot).replace(',', '.'));
      if ((stok != null && (!Number.isFinite(stok) || stok < 0 || stok > 1e6)) || !Number.isFinite(bobot) || bobot < 0 || bobot > 1e6) return {ok: false, error: 'nilai_tidak_valid', hadiah: nama};
      const id = typeof h.id === 'string' && /^[\w-]{4,20}$/.test(h.id) ? h.id : crypto.randomBytes(5).toString('base64url');
      const l = lama.get(id) || {};
      baru.push({id, nama, stok, bobot, terpakai: l.terpakai || 0, ...(l.gambar ? {gambar: l.gambar} : {})});
    }
    st.spin.hadiah = baru;
    st.spin.peluang = p.peluang === 'kontribusi' ? 'kontribusi' : 'rata';
    tulisHadiah();
    app.ctx.logAdmin_('atur hadiah spin', baru.length + ' hadiah, peluang ' + st.spin.peluang);
    ubah();
    return {ok: true, ...infoSpin()};
  }
  // Undi: hadiah dipilih sesuai bobot (yang stoknya masih ada), tiket dipilih acak (sama rata / sebanding kontribusi).
  // latihan = hasil tidak dicatat dan stok tidak berkurang.
  function spin(id, latihan) {
    if (!id) return {ok: false, error: 'tidak_ada_tiket'};
    const ev0 = st.events[id];
    // Skema hadiah: hanya event yang bosnya tumbang yang boleh diundi (spin latihan tetap boleh untuk gladi).
    if (!latihan && ev0 && !ev0.kalah) return {ok: false, error: 'bos_tidak_tumbang'};
    const semua = barisTiket(id);
    const duta = setDuta();
    const calon = semua.filter((x) => x.r[9] === 'aktif' && !duta.has(kunciOrang(x.r[3], x.r[4])));
    if (!calon.length) return {ok: false, error: 'tidak_ada_tiket'};
    const roda = tersedia();
    if (st.spin.hadiah.length && !roda.length) return {ok: false, error: 'hadiah_habis'};
    const acakBobot = (arr, w) => { const total = arr.reduce((s, x) => s + w(x), 0); let r = crypto.randomInt(Math.max(1, Math.round(total * 1000))) / 1000; for (const x of arr) { r -= w(x); if (r < 0) return x; } return arr[arr.length - 1]; };
    const e = st.events[id];
    const kontribusi = (x) => { const pid = e && Object.keys(e.tiket).find((q) => e.tiket[q] === String(x.r[2])); return Math.max(1, Number(pid ? e.u[pid].p : x.r[8]) || 1); };
    const pilih = st.spin.peluang === 'kontribusi' ? acakBobot(calon, kontribusi) : calon[crypto.randomInt(calon.length)];
    const hadiah = roda.length ? acakBobot(roda, (h) => h.bobot) : null;
    const ke = semua.filter((x) => /^MENANG/.test(String(x.r[9]))).length + 1;
    const rodaInfo = peluangHadiah(roda).map((h) => ({id: h.id, nama: h.nama, bobot: h.bobot, persen: h.persen}));
    // Tanpa hadiah: roda tetap lingkaran, berisi nama peserta (pemenang + hingga 11 lainnya).
    const lain = calon.filter((x) => x !== pilih).sort(() => Math.random() - 0.5).slice(0, 11);
    const rodaNama = [pilih, ...lain].sort(() => Math.random() - 0.5).map((x) => ({id: String(x.r[2]), nama: namaTampil(x.r[3]), bobot: 1, persen: 0}));
    if (!latihan) {
      pilih.r[9] = ['MENANG #' + ke, hadiah ? hadiah.nama : '', app.ctx.teksWib_(now()) + ' WIB'].filter(Boolean).join(' · ');
      if (hadiah) { hadiah.terpakai += 1; tulisHadiah(); }
      const me = app.sheets['Monster Event'];
      const baris = id[0] !== 'u' && me && me.rows.find((r) => r[0] === id);
      if (baris) baris[7] = [baris[7], String(pilih.r[2]) + ' ' + pilih.r[3] + (hadiah ? ' (' + hadiah.nama + ')' : '')].filter(Boolean).join('; ');
      app.ctx.logAdmin_('spin tiket monster', id + ' ' + String(pilih.r[2]) + (hadiah ? ' ' + hadiah.nama : ''));
      ubah();
    }
    return {...infoSpin(), ok: true, latihan, event: id, ke: latihan ? null : ke, pemenang: {nomor: String(pilih.r[2]), nama: pilih.r[3], sekolah: pilih.r[4], provinsi: pilih.r[5]},
      hadiah: hadiah ? {id: hadiah.id, nama: hadiah.nama} : null, rodaPutar: rodaInfo.length ? rodaInfo : rodaNama, targetRoda: hadiah ? hadiah.id : String(pilih.r[2]), sisa: latihan ? calon.length : calon.length - 1};
  }


  /* ---------- Undian 2 tahap: spin NAMA (peserta lolos / wild card / tiket) → spin HADIAH ---------- */
  // Sumber peserta: 'lolos' = tab Finalis (hasil impor), 'wildcard' = tab Kode Wildcard, 'semua' = keduanya,
  // 'tiket' = tiket Lawan Monster event terpilih. Pemenang tidak ikut lagi di putaran berikutnya.
  // Peserta lolos (Finalis) = duta: TIDAK ikut undian; mereka bertugas mengajak warga (link referral di /duta/).
  const SUMBER = ['wildcard', 'tiket'];
  const kunciOrang = (nama, sekolah) => String(nama || '').trim().toLowerCase().replace(/\s+/g, ' ') + '|' + String(sekolah || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const setDuta = () => new Set(baris('Finalis').filter((r) => String(r[0] || '').trim()).map((r) => kunciOrang(r[0], r[1])));
  const idDari = (...x) => crypto.createHash('sha1').update(x.map((v) => String(v || '').trim().toLowerCase()).join('|')).digest('base64url').slice(0, 12);
  const baris = (nama) => { const sh = app.sheets[nama]; return sh ? sh.rows.slice(1) : []; };
  function pesertaDari(sumber, event) {
    const out = [];
    if (sumber === 'lolos' || sumber === 'semua') baris('Finalis').forEach((r) => {
      if (!String(r[0] || '').trim() || /^(tidak|no|false|0)$/i.test(String(r[6] ?? '').trim())) return;
      out.push({id: 'f:' + idDari(r[0], r[1], r[3]), sumber: 'lolos', nama: String(r[0]).trim(), sekolah: String(r[1] || ''), kota: String(r[2] || ''), provinsi: String(r[3] || ''), jalur: String(r[4] || 'Seleksi Umum')});
    });
    if (sumber === 'wildcard' || sumber === 'semua') baris('Kode Wildcard').forEach((r) => {
      if (!String(r[0] || '').trim() || /hangus/i.test(String(r[3]))) return;
      const email = String(r[1] || '');
      out.push({id: 'w:' + String(r[0]).toUpperCase(), sumber: 'wildcard', nama: String(r[2] || '').trim() || email.replace(/^(.{2}).*(@.*)$/, '$1***$2'), sekolah: '', kota: '', provinsi: '', jalur: 'Wild card', kode: String(r[0]).toUpperCase(), status: String(r[3] || '')});
    });
    const duta = sumber === 'tiket' ? setDuta() : null;
    if (sumber === 'tiket' && event) barisTiket(event).filter(({r}) => !duta.has(kunciOrang(r[3], r[4]))).forEach(({r}) => out.push({id: 't:' + String(r[2]), sumber: 'tiket', nama: String(r[3] || ''), sekolah: String(r[4] || ''), kota: '', provinsi: String(r[5] || ''), jalur: 'Tiket ' + String(r[2]), kontribusi: Number(r[8]) || 0, statusTiket: String(r[9] || '')}));
    // satu orang = satu entri (data yang terimpor dua kali tidak menggandakan peluang)
    const unik = new Set();
    for (let i = out.length - 1; i >= 0; i--) { if (unik.has(out[i].id)) out.splice(i, 1); else unik.add(out[i].id); }
    const menang = new Map(st.spin.hasil.map((h) => [h.id, h]));
    out.forEach((x) => { const h = menang.get(x.id); if (h) x.menang = {ke: h.ke, hadiah: h.hadiah}; else if (x.sumber === 'tiket' && /^MENANG/.test(x.statusTiket)) x.menang = {ke: 0, hadiah: x.statusTiket.split(' · ')[1] || ''}; });
    return out;
  }
  const acakBobot = (arr, w) => { const total = arr.reduce((s, x) => s + w(x), 0); let r = crypto.randomInt(Math.max(1, Math.round(total * 1000))) / 1000; for (const x of arr) { r -= w(x); if (r < 0) return x; } return arr[arr.length - 1]; };
  const acak = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function spinNama(p) {
    const sumber = SUMBER.includes(p.sumber) ? p.sumber : 'tiket', latihan = !!p.latihan;
    const event = sumber === 'tiket' ? p.event : '';
    if (sumber === 'tiket') {
      if (!event) return {ok: false, error: 'tidak_ada_tiket'};
      if (!latihan && st.events[event] && !st.events[event].kalah) return {ok: false, error: 'bos_tidak_tumbang'};
    }
    const calon = pesertaDari(sumber, event).filter((x) => !x.menang);
    if (!calon.length) return {ok: false, error: 'tidak_ada_peserta'};
    const pilih = sumber === 'tiket' && st.spin.peluang === 'kontribusi' ? acakBobot(calon, (x) => Math.max(1, x.kontribusi || 1)) : calon[crypto.randomInt(calon.length)];
    const roda = acak([pilih, ...acak(calon.filter((x) => x !== pilih)).slice(0, 15)]).map((x) => ({id: x.id, nama: String(x.nama).slice(0, 40), bobot: 1, persen: 0}));
    st.spin.tunda = {pemenang: pilih, sumber, event, latihan, t: now()};
    return {ok: true, tahap: 'nama', latihan, sumber, pemenang: pilih, rodaPutar: roda, targetRoda: pilih.id, sisa: calon.length - (latihan ? 0 : 1)};
  }
  function spinHadiah(p) {
    const tunda = st.spin.tunda;
    if (!tunda || now() - tunda.t > 60 * MENIT) return {ok: false, error: 'putar_nama_dulu'};
    if (!st.spin.hadiah.length) return {ok: false, error: 'tanpa_hadiah'};
    const roda = tersedia();
    if (!roda.length) return {ok: false, error: 'hadiah_habis'};
    const hadiah = acakBobot(roda, (h) => h.bobot), w = tunda.pemenang;
    const rodaInfo = peluangHadiah(roda).map((h) => ({id: h.id, nama: h.nama, bobot: h.bobot, persen: h.persen}));
    let ke = null;
    if (!tunda.latihan) {
      ke = st.spin.hasil.length + 1;
      const waktu = app.ctx.teksWib_(now()) + ' WIB';
      st.spin.hasil.push({ke, id: w.id, sumber: w.sumber, nama: w.nama, sekolah: w.sekolah, kota: w.kota, provinsi: w.provinsi, jalur: w.jalur, hadiah: hadiah.nama, hadiahId: hadiah.id, waktu});
      hadiah.terpakai += 1; tulisHadiah();
      const sh = app.sheets['Hasil Undian'] || app.ctx.tab_(app.ss, 'hasil');
      sh.rows.push([waktu, ke, {lolos: 'Peserta lolos', wildcard: 'Wild card', tiket: 'Tiket ' + tunda.event}[w.sumber] || w.sumber, w.nama, w.sekolah, w.kota, w.provinsi, w.jalur, hadiah.nama, '']);
      if (w.sumber === 'tiket') {
        const t = barisTiket(tunda.event).find(({r}) => 't:' + String(r[2]) === w.id);
        if (t) t.r[9] = ['MENANG #' + (barisTiket(tunda.event).filter((x) => /^MENANG/.test(String(x.r[9]))).length + 1), hadiah.nama, waktu].join(' · ');
      }
      app.ctx.logAdmin_('undian ' + w.sumber, w.nama + ' → ' + hadiah.nama);
      ubah();
    }
    st.spin.tunda = null;
    return {...infoSpin(), ok: true, tahap: 'hadiah', latihan: tunda.latihan, ke, pemenang: w, hadiah: {id: hadiah.id, nama: hadiah.nama}, rodaPutar: rodaInfo, targetRoda: hadiah.id};
  }
  // Gambar hadiah (data URL webp/png bertransparansi, sudah diperkecil & latarnya dihapus di browser admin).
  function gambarHadiah(p) {
    const h = st.spin.hadiah.find((x) => x.id === p.id);
    if (!h) return {ok: false, error: 'tidak_ditemukan'};
    const g = String(p.gambar || '');
    if (g && (!/^data:image\/(webp|png);base64,[A-Za-z0-9+/=]+$/.test(g) || g.length > 200000)) return {ok: false, error: 'gambar_tidak_valid'};
    if (g) h.gambar = g; else delete h.gambar;
    app.ctx.logAdmin_('gambar hadiah', h.nama + (g ? '' : ' (dihapus)'));
    ubah();
    return {ok: true, ...infoSpin()};
  }

  // Data hasil impor (tab Finalis / Kode Wildcard) untuk halaman Impor & Ekspor: lihat, hapus duplikat, kosongkan.
  function dataImpor(p) {
    const jenis = p.jenis === 'kode' ? 'kode' : 'finalis', nama = jenis === 'kode' ? 'Kode Wildcard' : 'Finalis';
    const sh = app.sheets[nama] || app.ctx.tab_(app.ss, jenis);
    const norm = (v) => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const kunci = (r) => (jenis === 'kode' ? norm(r[1]) : norm(r[0]) + '|' + norm(r[1]));
    const isi = () => sh.rows.slice(1).filter((r) => String(r[0] || '').trim());
    if (p.aksi === 'data-rapikan' || p.aksi === 'data-kosongkan') {
      const sebelum = isi().length, lihat = new Set();
      const sisa = p.aksi === 'data-kosongkan' ? [] : isi().filter((r) => { const k = kunci(r); if (!k.replace('|', '') || lihat.has(k)) return false; lihat.add(k); return true; });
      sh.rows.splice(1, sh.rows.length - 1, ...sisa);
      app.cache.remove('reveal'); app.cache.remove('kata');
      app.ctx.logAdmin_(p.aksi === 'data-kosongkan' ? 'kosongkan ' + jenis : 'hapus duplikat ' + jenis, (sebelum - sisa.length) + ' baris dihapus');
      ubah();
      return {...dataImpor({jenis}), dihapus: sebelum - sisa.length};
    }
    const hitung = new Map();
    const baris = isi().map((r) => { const k = kunci(r); hitung.set(k, (hitung.get(k) || 0) + 1); return r; });
    const lihat = new Set();
    const data = baris.map((r) => { const k = kunci(r), dup = lihat.has(k); lihat.add(k);
      return jenis === 'kode' ? {kode: String(r[0]), email: String(r[1] || ''), nama: String(r[2] || ''), status: String(r[3] || ''), berlaku: String(r[4] || ''), dup}
        : {nama: String(r[0]), sekolah: String(r[1] || ''), kota: String(r[2] || ''), provinsi: String(r[3] || ''), jalur: String(r[4] || ''), tampil: String(r[6] ?? ''), dup}; });
    return {ok: true, jenis, total: data.length, unik: hitung.size, duplikat: data.length - hitung.size, data};
  }

  function admin(p) {
    if (!adminSah(p.token)) return {ok: false, error: 'sesi_habis'};
    const daftar = ringkasEvent();
    const id = p.event || (daftar.find((x) => x.tiket) || daftar[0] || {}).id;
    const tiket = () => barisTiket(id).map(({r}) => ({nomor: String(r[2]), nama: r[3], sekolah: r[4], provinsi: r[5], kontribusi: r[8], status: r[9], catatan: r[10]}));
    if (p.aksi === 'tiket') return {ok: true, event: id || null, events: daftar, tiket: id ? tiket() : []};
    if (p.aksi === 'spin-info') return {ok: true, ...infoSpin()};
    if (p.aksi === 'spin-atur') return aturSpin(p);
    if (p.aksi === 'spin') return spin(id, !!p.latihan);
    if (p.aksi === 'peserta') { const sumber = SUMBER.includes(p.sumber) ? p.sumber : 'tiket'; return {ok: true, sumber, event: id || null, events: daftar, peserta: pesertaDari(sumber, sumber === 'tiket' ? id : ''), hasil: st.spin.hasil.slice().reverse(), tunda: st.spin.tunda && now() - st.spin.tunda.t < 60 * MENIT ? st.spin.tunda : null}; }
    if (p.aksi === 'spin-nama') return spinNama({...p, event: id});
    if (p.aksi === 'spin-hadiah') return spinHadiah(p);
    if (p.aksi === 'spin-batal') { st.spin.tunda = null; return {ok: true}; }
    if (p.aksi === 'hadiah-gambar') return gambarHadiah(p);
    if (p.aksi === 'data-lihat' || p.aksi === 'data-rapikan' || p.aksi === 'data-kosongkan') return dataImpor(p);
    if (p.aksi === 'uji-mulai') {
      const menit = Math.round(angka(p.menit, 10, 1, 120));
      const target = String(p.target || '').split(/[;,\s]+/).map((x) => Math.round(Number(x.replace(/\./g, '')))).filter((x) => x > 0 && x <= 1e9).slice(0, 10);
      st.uji = {kode: crypto.randomBytes(6).toString('base64url'), mulai: now(), sampai: now() + menit * MENIT, target: target.length ? target.join(',') : null};
      st.ujiPemain = {};
      app.ctx.logAdmin_('mulai uji monster', menit + ' menit' + (target.length ? ', target ' + target.join(',') : ''));
      ubah(); memo.t = 0;
      return {ok: true, uji: infoUji()};
    }
    if (p.aksi === 'uji-stop') {
      if (st.uji) { st.uji = null; app.ctx.logAdmin_('hentikan uji monster', ''); ubah(); }
      return {ok: true, uji: null};
    }
    if (p.aksi === 'uji') return {ok: true, uji: infoUji()};
    if (p.aksi === 'lepas-perangkat') {
      const email = kunciKontak(p.email);
      const d = st.email[email];
      if (!d) return {ok: false, error: 'tidak_ditemukan'};
      delete st.email[email]; delete st.perangkat[d]; pidKe.delete(pidDari(d));
      app.ctx.logAdmin_('lepas perangkat monster', email.replace(/^(.).*(@.*)$/, '$1***$2'));
      ubah();
      return {ok: true};
    }
    return {ok: false, error: 'validation'};
  }

  // Daftar pemenang publik (landing): hanya event asli, nama disingkat "Nama I." + provinsi + hadiah.
  function pemenangPublik() {
    const sh = app.sheets['Tiket Monster'];
    const out = (sh ? sh.rows.slice(1) : []).filter((r) => /^MENANG/.test(String(r[9])) && r[1] && String(r[1])[0] !== 'u').map((r) => {
      const bagian = String(r[9]).split(' · ');
      return {nama: namaTampil(r[3]), provinsi: String(r[5] || ''), hadiah: bagian.length >= 3 ? bagian[1] : '', waktu: bagian[bagian.length - 1].replace(/^MENANG #\d+\s*/, ''), ke: Number((bagian[0].match(/#(\d+)/) || [])[1]) || 0};
    });
    const undian = st.spin.hasil.map((h) => ({nama: namaTampil(h.nama), provinsi: h.provinsi || '', hadiah: h.hadiah, waktu: String(h.waktu || '').replace(/ WIB$/, ''), ke: h.ke}));
    return {ok: true, pemenang: [...out, ...undian].reverse().slice(0, 60)};
  }

  return {lihat, masuk, tap, hindar, saya, admin, pemenangPublik, state: st, jadwal, jenisJurus, segarkan: () => { memo.t = 0; }};
}

module.exports = {buatMonster, jadwal, PASCA, MENIT};
