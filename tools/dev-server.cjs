// Server lokal untuk uji ujung-ke-ujung tanpa Vercel, Dokploy, dan Google — susunannya sama dengan produksi:
// - port      : file statis repo + fungsi api/*.js (seperti Vercel) + rewrite /srv/monster → server data
// - port + 1  : server data (server/index.cjs, seperti Dokploy) — menjalankan Code.gs di memori + Lawan Monster
// - port + 2  : "Google Sheet" tiruan (Code.gs di memori) — sumber impor awal & tujuan penerusan cadangan
// Pakai: node tools/dev-server.cjs [port=8787]. Data contoh: POST /__seed (lihat di bawah).
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {muat} = require('../server/gas-memori.cjs');
const {buatPrimer} = require('../server/index.cjs');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.argv[2] || 8787);
const DATA_PORT = PORT + 1, SHEET_PORT = PORT + 2;
const RAHASIA = 'rahasia-uji-lokal-' + 'x'.repeat(32);
const MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon'};
const baca = (req) => new Promise((ok) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => ok(b)); });

// "Google Sheet" tiruan: Code.gs asli, dengan hash rahasia uji (Code.gs produksi memakai hash rahasia asli).
const sheet = muat();
sheet.ctx.primerSah_ = (r) => r === RAHASIA;
sheet.get('siapkan');
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const out = req.method === 'POST' ? sheet.post(await baca(req) || '{}') : sheet.get(url.searchParams.get('aksi'));
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(out));
}).listen(SHEET_PORT, '127.0.0.1');

// Server data (seperti Dokploy), tanpa file (memori saja), meneruskan ke Sheet tiruan tiap 1 detik.
const primer = buatPrimer({sheetUrl: `http://127.0.0.1:${SHEET_PORT}/exec`, rahasia: RAHASIA, sinkronMs: 1000, origins: '*', log: () => {}});
primer.server.listen(DATA_PORT, '127.0.0.1');
const siap = primer.mulai();
process.env.YCS_APPS_SCRIPT_URL = `http://127.0.0.1:${DATA_PORT}/exec`;

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    await siap;
    if (url.pathname === '/__seed' && req.method === 'POST') return seed(JSON.parse(await baca(req) || '{}'), res);
    if (url.pathname === '/__sheet') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify(Object.fromEntries(Object.entries(sheet.sheets).map(([n, x]) => [n, x.rows])))); }
    if (url.pathname.startsWith('/srv/')) { // seperti rewrite vercel.json → server data
      const tujuan = url.pathname === '/srv/pemenang' ? 'monster/pemenang' : url.pathname.slice(5);
      const r = await fetch(`http://127.0.0.1:${DATA_PORT}/` + tujuan + url.search, {method: req.method, headers: {'content-type': 'application/json', 'x-forwarded-for': req.headers['x-forwarded-for'] || '127.0.0.1'}, body: req.method === 'POST' ? await baca(req) : undefined});
      res.statusCode = r.status;
      ['content-type', 'cache-control'].forEach((h) => r.headers.get(h) && res.setHeader(h, r.headers.get(h)));
      return res.end(await r.text());
    }
    if (url.pathname.startsWith('/api/')) {
      const nama = url.pathname.slice(5).replace(/[^a-z]/g, '');
      const file = path.join(ROOT, 'api', nama + '.js');
      if (!fs.existsSync(file)) { res.statusCode = 404; return res.end('{}'); }
      const raw = await baca(req);
      let body = raw;
      if ((req.headers['content-type'] || '').includes('json')) { try { body = JSON.parse(raw || '{}'); } catch (_) { body = raw; } }
      const handler = require(file);
      const r = {
        setHeader: (k, v) => res.setHeader(k, v),
        status(n) { res.statusCode = n; return r; },
        json(v) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(v)); return r; },
      };
      return await handler({method: req.method, headers: {...req.headers, 'x-forwarded-for': req.headers['x-forwarded-for'] || '127.0.0.1'}, body, query: Object.fromEntries(url.searchParams)}, r);
    }
    let file = path.join(ROOT, decodeURIComponent(url.pathname));
    if (!file.startsWith(ROOT)) { res.statusCode = 403; return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      if (!url.pathname.endsWith('/')) { res.statusCode = 308; res.setHeader('Location', url.pathname + '/'); return res.end(); }
      file = path.join(file, 'index.html');
    }
    if (!fs.existsSync(file)) { res.statusCode = 404; return res.end('404'); }
    res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  } catch (err) {
    console.error(err);
    res.statusCode = 500; res.end('{}');
  }
}).listen(PORT, '127.0.0.1', () => console.log(`YCS dev: http://127.0.0.1:${PORT}  (server data :${DATA_PORT}, Sheet tiruan :${SHEET_PORT})`));

// POST /__seed {pengaturan:{kunci:nilai}, finalis:n, kode:[[kode,email,nama]], twibbon:n}
function seed(p, res) {
  const app = primer.app;
  app.get('siapkan');
  const s = app.sheets;
  const peng = s.Pengaturan.rows;
  Object.entries(p.pengaturan || {}).forEach(([k, v]) => { const r = peng.find((x) => x[0] === k); if (r) r[1] = v; else peng.push([k, v, '']); });
  if (p.finalis) {
    const nama = ['Aisyah Putri', 'Raka Pratama', 'Salsabila Nur', 'Dimas Arif', 'Nadia Fadila', 'Rizky Maulana', 'Intan Permata', 'Fajar Nugroho', 'Citra Ayu', 'Bagas Saputra', 'Laila Rahma', 'Yoga Firmansyah'];
    const daerah = [['Kota Semarang', 'Jawa Tengah'], ['Kab. Grobogan', 'Jawa Tengah'], ['Kota Surabaya', 'Jawa Timur'], ['Kota Yogyakarta', 'DI Yogyakarta'], ['Kota Denpasar', 'Bali'], ['Kota Makassar', 'Sulawesi Selatan']];
    s.Finalis.rows.length = 1;
    for (let i = 0; i < p.finalis; i++) {
      const d = daerah[i % daerah.length];
      s.Finalis.rows.push([nama[i % nama.length] + (i >= nama.length ? ' ' + (i + 1) : ''), 'SMA Negeri ' + (i + 1) + ' ' + d[0].replace(/^(Kota|Kab\.) /, ''), d[0], d[1], i % 4 === 0 ? 'Golden Buzzer' : 'Seleksi Umum', p.foto && i % 3 !== 2 ? p.foto : '', 'YA']);
    }
  }
  (p.kode || []).forEach((k) => s['Kode Wildcard'].rows.push([k[0], k[1], k[2] || '', 'belum klaim', k[3] || '', '', 0, '']));
  if (p.twibbon) {
    const tw = s['Twibbon YCS 2026'] || app.ctx.SpreadsheetApp.openById().insertSheet('Twibbon YCS 2026');
    if (!tw.rows.length) tw.rows.push(['Waktu', 'ID permintaan', 'Nama', 'Sekolah', 'Email', 'Bingkai', 'Klik saluran WhatsApp', 'Persetujuan data', 'Sumber', 'Kota/Kabupaten', 'Provinsi']);
    const daerah = [['Kota Semarang', 'Jawa Tengah', 9], ['Kab. Grobogan', 'Jawa Tengah', 6], ['Kota Surabaya', 'Jawa Timur', 4], ['Kota Denpasar', 'Bali', 3], ['Kab. Kendal', 'Jawa Tengah', 2], ['Kota Bandung', 'Jawa Barat', 1]];
    let n = 0;
    while (n < p.twibbon) daerah.forEach(([k, pr, w]) => { for (let i = 0; i < w && n < p.twibbon; i++, n++) tw.rows.push([new Date(), 'id-' + n, 'N' + n, 'S', `e${n}@x.id`, 'squad', 'Ya', 'Ya', ['web-ycs2026', 'email-1', 'ig-bio'][n % 3], k, pr]); });
  }
  if (p.kata) {
    const kt = s['Satu Kata'];
    const depan = ['Fauzan', 'Sinta', 'Raka', 'Nadia', 'Bagas', 'Aisyah', 'Dimas', 'Citra', 'Yoga', 'Laila', 'Rizky', 'Intan', 'Putu', 'Made', 'Kadek', 'Wayan', 'Siti', 'Budi', 'Ayu', 'Gilang'];
    const belakang = ['Rahman', 'Pratama', 'Lestari', 'Saputra', 'Wulandari', 'Hidayat', 'Purnama', '', 'Santoso', 'Anggraini'];
    const kata = ['sejahtera', 'maju', 'damai', 'berani', 'jujur', 'bersatu', 'hebat', 'peduli', 'cerdas', 'toleran', 'mandiri', 'adil', 'gotong-royong', 'kreatif', 'berkarakter'];
    const prov = ['Jawa Tengah', 'Bali', 'Jawa Timur', 'DI Yogyakarta', 'Jawa Barat', 'Sulawesi Selatan', 'DKI Jakarta'];
    for (let i = 0; i < p.kata; i++) {
      const nama = depan[i % depan.length] + ' ' + belakang[(i * 7) % belakang.length];
      kt.rows.push(['2026-11-01 10:00', 'k-' + i, kata[(i * 3) % kata.length], prov[(i * 5) % prov.length], 'web', 'YA', nama.trim(), 'SMA ' + (i % 30 + 1), `w${i}@mail.com`, 'Ya', (i % 10) + 1]);
    }
  }
  app.cache.clear();
  if (p.monsterReset) { const st = primer.monster.state; st.events = {}; if (p.monsterReset === 'semua') { st.perangkat = {}; st.email = {}; } }
  primer.monster.segarkan();
  primer.tandai();
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ok: true, sandi: s.Admin.rows[1][1], kodeAkses: peng.find((x) => x[0] === 'dana_kode_akses')[1]}));
}
