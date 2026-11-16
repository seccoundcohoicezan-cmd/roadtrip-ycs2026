// Server data utama YCS 2026 (Dokploy). Menjalankan apps-script/Code.gs di memori + mesin Lawan Monster.
// - GET/POST /exec      : protokol yang sama dengan Web App Apps Script (dipanggil fungsi Vercel api/*.js)
// - GET/POST /monster   : status, masuk (1 perangkat = 1 peserta), tap; POST /monster/admin: tiket & spin
// - GET /health         : status sinkron
// Data disimpan di DATA_DIR/primer.json dan DITERUSKAN ke Google Sheet (cadangan) beberapa detik sekali.
// Saat pertama hidup (belum ada file), seluruh isi Sheet diambil dulu (primer-ekspor); sebelum itu server menolak tulis.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {muat, keJson} = require('./gas-memori.cjs');
const {buatMonster} = require('./monster.cjs');

const TANPA_SINKRON = ['Rekap'];
const hashBaris = (r) => crypto.createHash('sha1').update(JSON.stringify(r.map(keJson))).digest('base64').slice(0, 14);

function buatPrimer(o = {}) {
  const log = o.log || ((...a) => console.log(new Date().toISOString(), ...a));
  const file = o.dataDir ? path.join(o.dataDir, 'primer.json') : null;
  let app = null, monster = null, siap = false;
  let terkirim = {};           // nama tab → hash baris yang sudah ada di Sheet
  let kotor = true, simpanTimer = 0, sinkronJalan = false, gagalSinkron = 0;
  const info = {sejak: null, sinkronTerakhir: null, galatTerakhir: null, opsTerakhir: 0, impor: null};
  let monsterState = {};

  function pasang(gas) {
    app = muat({}, gas);
    monster = buatMonster(app, {rahasia: o.monsterRahasia, state: monsterState, saatUbah: tandai, batasMasuk: o.batasMasuk});
    monsterState = monster.state;
  }
  function tandai() {
    kotor = true;
    if (file && !simpanTimer) { simpanTimer = setTimeout(() => simpan().catch((e) => log('simpan gagal:', e.message)), 1500); simpanTimer.unref(); }
  }
  async function simpan() {
    simpanTimer = 0;
    if (!file || !siap) return;
    const isi = JSON.stringify({versi: 1, gas: app.serial(), monster: monsterState, terkirim, info});
    const tmp = file + '.tmp';
    await fs.promises.writeFile(tmp, isi);
    await fs.promises.rename(tmp, file);
  }
  function simpanSinkron() { if (file && siap) { fs.writeFileSync(file + '.tmp', JSON.stringify({versi: 1, gas: app.serial(), monster: monsterState, terkirim, info})); fs.renameSync(file + '.tmp', file); } }

  async function keSheet(body, timeout = 120000) {
    const r = await fetch(o.sheetUrl, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: JSON.stringify(body), redirect: 'follow', signal: AbortSignal.timeout(timeout)});
    if (!r.ok) throw new Error('sheet ' + r.status);
    return r.json();
  }
  // Ambil seluruh isi Sheet → mesin di memori. Hash awal = isi Sheet, jadi tidak ada yang diteruskan ulang.
  async function impor() {
    const d = await keSheet({aksi: 'primer-ekspor', rahasia: o.rahasia});
    if (!d.ok) throw new Error('ekspor ' + d.error);
    const sheets = {};
    d.tabs.forEach((t) => { sheets[t.nama] = t.baris; });
    pasang({sheets, props: d.props || {}});
    terkirim = {};
    app.urutan.forEach((n) => { terkirim[n] = app.sheets[n].rows.map(hashBaris); });
    app.get('siapkan'); // lengkapi skema (kunci pengaturan baru, tab baru) → ikut diteruskan
    info.impor = new Date().toISOString();
    log('impor dari Sheet:', d.tabs.map((t) => t.nama + '=' + t.baris.length).join(', '));
  }

  async function mulai() {
    if (file && fs.existsSync(file)) {
      const s = JSON.parse(fs.readFileSync(file, 'utf8'));
      monsterState = s.monster || {};
      pasang(s.gas);
      terkirim = s.terkirim || {};
      Object.assign(info, s.info || {});
      log('state dimuat dari', file);
    } else if (o.sheetUrl) {
      for (let i = 0; ; i++) {
        try { await impor(); break; } catch (e) { log('impor gagal, coba lagi 30 dtk:', e.message); await new Promise((r) => setTimeout(r, Math.min(30000, 2000 * (i + 1)))); }
      }
      info.sejak = new Date().toISOString();
    } else {
      pasang(null);
      app.get('siapkan');
      app.urutan.forEach((n) => { terkirim[n] = app.sheets[n].rows.map(hashBaris); });
    }
    siap = true;
    tandai();
    if (o.sheetUrl) setTimeout(putarSinkron, 1000).unref();
  }

  // Diff per tab: baris baru di akhir → append; selain itu → ganti isi tab. Dipecah agar payload < ±4 MB.
  async function sinkron() {
    if (!o.sheetUrl || !siap || sinkronJalan || !kotor) return;
    sinkronJalan = true;
    try {
      kotor = false;
      const ops = [], baru = {};
      for (const nama of app.urutan) {
        if (TANPA_SINKRON.includes(nama)) continue;
        const rows = app.sheets[nama].rows;
        const h = rows.map(hashBaris), lama = terkirim[nama];
        baru[nama] = h;
        if (lama && lama.length === h.length && lama.every((x, i) => x === h[i])) continue;
        if (lama && h.length > lama.length && lama.every((x, i) => x === h[i])) ops.push({nama, mode: 'append', dari: lama.length + 1, baris: rows.slice(lama.length).map((r) => r.map(keJson))});
        else ops.push({nama, mode: 'replace', baris: rows.map((r) => r.map(keJson))});
      }
      if (!ops.length) return;
      const paket = [];
      let isi = [], ukuran = 0;
      for (const op of ops) {
        const u = JSON.stringify(op).length;
        if (isi.length && ukuran + u > 4e6) { paket.push(isi); isi = []; ukuran = 0; }
        isi.push(op); ukuran += u;
      }
      paket.push(isi);
      for (const p of paket) {
        const d = await keSheet({aksi: 'primer-terapkan', rahasia: o.rahasia, ops: p});
        if (!d.ok) throw new Error('terapkan ' + d.error);
        d.hasil.forEach((x) => { terkirim[x.nama] = x.ok ? baru[x.nama] : null; if (!x.ok) kotor = true; });
      }
      info.sinkronTerakhir = new Date().toISOString(); info.opsTerakhir = ops.length; info.galatTerakhir = null;
      gagalSinkron = 0;
      tandai();
    } catch (e) {
      kotor = true; gagalSinkron++;
      info.galatTerakhir = new Date().toISOString() + ' ' + e.message;
      log('sinkron gagal:', e.message);
    } finally { sinkronJalan = false; }
  }
  function putarSinkron() {
    sinkron().finally(() => setTimeout(putarSinkron, gagalSinkron ? Math.min(60000, 3000 * 2 ** gagalSinkron) : (o.sinkronMs || 3000)).unref());
  }
  const tertunda = () => kotor || sinkronJalan;

  /* ---------- HTTP ---------- */
  const asal = new Set(String(o.origins || '').split(',').map((s) => s.trim()).filter(Boolean));
  function kirim(res, kode, data, cache = 'no-store', req) {
    const o2 = req && req.headers.origin;
    if (o2 && (asal.has(o2) || asal.has('*'))) { res.setHeader('Access-Control-Allow-Origin', o2); res.setHeader('Vary', 'Origin'); }
    res.writeHead(kode, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache});
    res.end(JSON.stringify(data));
  }
  const ipDari = (req) => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const baca = (req, maks) => new Promise((ok, gagal) => {
    let b = '';
    req.on('data', (c) => { b += c; if (b.length > maks) { gagal(new Error('besar')); req.destroy(); } });
    req.on('end', () => ok(b));
    req.on('error', gagal);
  });
  const adminSah = (t) => typeof t === 'string' && t.length >= 40 && !!app.cache.get('adm:' + app.ctx.hash_(t));
  const STATUS_HTTP = {sesi_habis: 401, rate_limit: 429, validation: 400};

  async function tangani(req, res) {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'OPTIONS') { kirim(res, 204, {}, 'no-store', req); return; }
    if (url.pathname === '/health') return kirim(res, 200, {ok: siap, siap, tertunda: tertunda(), ...info});
    if (!siap) return kirim(res, 503, {ok: false, error: 'busy'});
    if (url.pathname === '/exec') {
      if (req.method === 'GET') {
        const skema = app.props.get('skema_versi');
        const out = app.get(url.searchParams.get('aksi') || '', Object.fromEntries(url.searchParams));
        if (app.props.get('skema_versi') !== skema) tandai();
        return kirim(res, 200, out);
      }
      const body = await baca(req, 2e6);
      let p = null;
      try { p = JSON.parse(body); } catch (_) { return kirim(res, 200, {ok: false, error: 'invalid_request'}); }
      if (p && p.aksi === 'admin-primer') {
        if (!adminSah(p.token)) return kirim(res, 200, {ok: false, error: 'sesi_habis'});
        if (p.perintah === 'tarik-sheet') {
          if (!o.sheetUrl) return kirim(res, 200, {ok: false, error: 'tanpa_sheet'});
          if (tertunda()) return kirim(res, 200, {ok: false, error: 'masih_sinkron'});
          const token = p.token;
          const sesi = app.cache.get('adm:' + app.ctx.hash_(token));
          await impor();
          app.cache.put('adm:' + app.ctx.hash_(token), sesi || '1', 21600); // sesi admin tetap berlaku
          app.ctx.logAdmin_('ambil ulang data dari Sheet', '');
          tandai();
        }
        if (p.perintah === 'monster') return kirim(res, 200, monster.admin({...p.data, token: p.token}));
        return kirim(res, 200, {ok: true, tertunda: tertunda(), ...info});
      }
      const out = app.post(p);
      tandai();
      monster.segarkan();
      return kirim(res, 200, out);
    }
    if (url.pathname === '/monster' || url.pathname === '/monster/admin') {
      if (req.method === 'GET') {
        const uji = url.searchParams.get('uji');
        const st = monster.lihat(uji);
        const cache = uji ? 'no-store' : st.fase === 'tanding' ? 'public, max-age=0, s-maxage=1, stale-while-revalidate=2'
          : st.mulai && st.fase === 'tunggu' ? 'public, max-age=0, s-maxage=' + Math.max(1, Math.min(15, Math.floor((Date.parse(st.mulai) - Date.now()) / 1000) - 1)) : 'public, max-age=0, s-maxage=10';
        return kirim(res, 200, st, cache, req);
      }
      if (req.method !== 'POST') return kirim(res, 405, {ok: false, error: 'method'}, 'no-store', req);
      let p = null;
      try { p = JSON.parse(await baca(req, 4096)); } catch (_) { return kirim(res, 400, {ok: false, error: 'validation'}, 'no-store', req); }
      const out = url.pathname === '/monster/admin' ? monster.admin(p || {}) : p && p.aksi === 'masuk' ? monster.masuk(p, ipDari(req)) : p && p.aksi === 'tap' ? monster.tap(p) : {ok: false, error: 'validation'};
      return kirim(res, out.ok ? 200 : (STATUS_HTTP[out.error] || 422), out, 'no-store', req);
    }
    if (url.pathname === '/internal/sandi-baru' && req.method === 'POST') {
      // Reset sandi admin: sandi baru dibuat Code.gs & ditulis ke tab Admin (sel B2) → ikut diteruskan ke Sheet.
      let p = {};
      try { p = JSON.parse(await baca(req, 4096)); } catch (_) {}
      if (typeof p.rahasia !== 'string' || p.rahasia !== o.rahasia) return kirim(res, 401, {ok: false, error: 'sandi_salah'});
      app.props.delete('ADMIN_HASH'); app.props.delete('skema_versi');
      app.get('siapkan');
      app.ctx.logAdmin_('reset password admin', 'server data');
      tandai();
      return kirim(res, 200, {ok: true, catatan: 'Sandi baru ada di tab Admin sel B2.'});
    }
    return kirim(res, 404, {ok: false, error: 'tidak_ada'});
  }

  const server = http.createServer((req, res) => {
    tangani(req, res).catch((e) => { log('galat', req.method, req.url, e.message); if (!res.headersSent) kirim(res, 500, {ok: false, error: 'server'}); });
  });
  server.keepAliveTimeout = 65000;
  return {server, mulai, sinkron, simpanSinkron, tandai, get app() { return app; }, get monster() { return monster; }, info, tertunda};
}

module.exports = {buatPrimer};

if (require.main === module) {
  const e = process.env;
  if (!e.PRIMARY_SECRET || e.PRIMARY_SECRET.length < 32) { console.error('PRIMARY_SECRET wajib (≥ 32 karakter)'); process.exit(1); }
  if (e.DATA_DIR) fs.mkdirSync(e.DATA_DIR, {recursive: true});
  const p = buatPrimer({dataDir: e.DATA_DIR || null, sheetUrl: e.SHEET_URL || null, rahasia: e.PRIMARY_SECRET, monsterRahasia: e.MONSTER_SECRET,
    origins: e.ALLOWED_ORIGINS || 'https://roadtrip-ycs2026.vercel.app', sinkronMs: Number(e.SINKRON_MS) || 3000, batasMasuk: Number(e.MONSTER_BATAS_MASUK) || 300});
  p.server.listen(Number(e.PORT) || 3000, '0.0.0.0', () => console.log('YCS data siap di port', Number(e.PORT) || 3000));
  p.mulai().catch((err) => { console.error(err); process.exit(1); });
  const tutup = () => { try { p.simpanSinkron(); } catch (err) { console.error(err); } process.exit(0); };
  process.on('SIGTERM', tutup); process.on('SIGINT', tutup);
}
