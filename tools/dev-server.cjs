// Server lokal untuk uji ujung-ke-ujung tanpa Vercel dan tanpa Google:
// - file statis repo + fungsi api/*.js (seperti Vercel)
// - Apps Script tiruan yang menjalankan apps-script/Code.gs dengan Spreadsheet di memori
// Pakai: node tools/dev-server.cjs [port=8787]. Data contoh: POST /__seed (lihat di bawah).
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {muat} = require('../tests/_mock-gas.cjs');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.argv[2] || 8787);
const GAS_PORT = PORT + 1;
const app = muat();
const MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon'};

const baca = (req) => new Promise((ok) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => ok(b)); });

// Apps Script tiruan
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const out = req.method === 'POST' ? app.post(JSON.parse(await baca(req) || '{}')) : app.get(url.searchParams.get('aksi'));
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(out));
}).listen(GAS_PORT, '127.0.0.1');
process.env.YCS_APPS_SCRIPT_URL = `http://127.0.0.1:${GAS_PORT}/exec`;

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname === '/__seed' && req.method === 'POST') return seed(JSON.parse(await baca(req) || '{}'), res);
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
      return await handler({method: req.method, headers: {...req.headers, 'x-forwarded-for': '127.0.0.1'}, body, query: Object.fromEntries(url.searchParams)}, r);
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
}).listen(PORT, '127.0.0.1', () => console.log(`YCS dev: http://127.0.0.1:${PORT}  (Apps Script tiruan :${GAS_PORT})`));

// POST /__seed {pengaturan:{kunci:nilai}, finalis:n, kode:[[kode,email,nama]], twibbon:n}
function seed(p, res) {
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
  app.cache.clear();
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ok: true, sandi: s.Admin.rows[1][1], kodeAkses: peng.find((x) => x[0] === 'dana_kode_akses')[1]}));
}
