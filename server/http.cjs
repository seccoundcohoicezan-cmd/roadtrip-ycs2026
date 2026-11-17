// Router HTTP server YCS 2026.
//   /api/<nama>          API publik (server/api.cjs) — dipanggil browser lewat rewrite vercel.json
//   /health              status server & sinkron Sheet
//   /internal/sandi-baru reset password admin (butuh PRIMARY_SECRET)
//   alias lama           /exec (protokol Apps Script), /monster, /monster/admin, /monster/pemenang
const http = require('node:http');
const {buatApi} = require('./api.cjs');

const ALIAS = {'/monster': 'monster', '/monster/admin': 'monster/admin', '/monster/pemenang': 'pemenang'};

function buatHttp(data, o = {}) {
  const log = o.log || ((...a) => console.log(new Date().toISOString(), ...a));
  const {rute} = buatApi(data);
  const asal = new Set(String(o.origins || '').split(',').map((s) => s.trim()).filter(Boolean));

  function kirim(req, res, kode, body, cache = 'no-store', header = {}) {
    const origin = req.headers.origin;
    if (origin && (asal.has(origin) || asal.has('*'))) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
    res.writeHead(kode, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache, ...header});
    res.end(JSON.stringify(body));
  }
  // IP asli: entri pertama X-Forwarded-For (diisi Vercel/Traefik).
  const ipDari = (req) => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const bacaBody = (req, maks) => new Promise((ok, gagal) => {
    let b = '';
    req.on('data', (c) => { b += c; if (b.length > maks) { gagal(Object.assign(new Error('besar'), {besar: true})); req.destroy(); } });
    req.on('end', () => ok(b));
    req.on('error', gagal);
  });

  async function tangani(req, res) {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'OPTIONS') return kirim(req, res, 204, {});
    if (url.pathname === '/health') return kirim(req, res, 200, {ok: data.siap, siap: data.siap, tertunda: data.tertunda(), ...data.info});
    if (!data.siap) return kirim(req, res, 503, {ok: false, error: 'busy'});

    // API publik (+ alias lama Lawan Monster)
    const nama = url.pathname.startsWith('/api/') ? url.pathname.slice(5).replace(/\/+$/, '') : ALIAS[url.pathname];
    if (nama) {
      const r = rute[req.method + ' ' + nama];
      if (!r) return kirim(req, res, rute['GET ' + nama] || rute['POST ' + nama] ? 405 : 404, {ok: false, error: rute['GET ' + nama] || rute['POST ' + nama] ? 'method' : 'tidak_ada'});
      let body = null;
      if (req.method === 'POST') {
        try { body = JSON.parse(await bacaBody(req, r.maks || 8192) || 'null'); } catch (e) { return kirim(req, res, 400, {ok: false, error: 'validation'}); }
        if (!body || typeof body !== 'object' || Array.isArray(body)) return kirim(req, res, 400, {ok: false, error: 'validation'});
      }
      const j = await r.fn(body, ipDari(req), url);
      return kirim(req, res, j.kode, j.body, j.cache, j.header);
    }

    // Protokol Apps Script (alias lama, dipakai fungsi Vercel lama selama masa transisi)
    if (url.pathname === '/exec') {
      if (req.method === 'GET') return kirim(req, res, 200, data.app.get(url.searchParams.get('aksi') || ''));
      let p = null;
      try { p = JSON.parse(await bacaBody(req, 2e6)); } catch (_) { return kirim(req, res, 200, {ok: false, error: 'invalid_request'}); }
      if (p && p.aksi === 'admin-primer') { const j = await rute['POST admin'].fn(p, ipDari(req)); return kirim(req, res, 200, j.body); }
      const out = data.app.post(p);
      data.tandai(); data.monster.segarkan();
      return kirim(req, res, 200, out);
    }

    // Reset password admin: password baru dibuat Code.gs di tab Admin sel B2 (ikut diteruskan ke Sheet).
    if (url.pathname === '/internal/sandi-baru' && req.method === 'POST') {
      let p = {};
      try { p = JSON.parse(await bacaBody(req, 4096)); } catch (_) {}
      if (typeof p.rahasia !== 'string' || p.rahasia !== o.rahasia) return kirim(req, res, 401, {ok: false, error: 'sandi_salah'});
      data.app.props.delete('ADMIN_HASH'); data.app.props.delete('skema_versi');
      data.app.get('siapkan');
      data.app.ctx.logAdmin_('reset password admin', 'server data');
      data.tandai();
      return kirim(req, res, 200, {ok: true, catatan: 'Sandi baru ada di tab Admin sel B2.'});
    }
    return kirim(req, res, 404, {ok: false, error: 'tidak_ada'});
  }

  const server = http.createServer((req, res) => {
    tangani(req, res).catch((e) => {
      if (e.besar) { if (!res.headersSent) kirim(req, res, 413, {ok: false, error: 'validation'}); return; }
      log('galat', req.method, req.url, e.message);
      if (!res.headersSent) kirim(req, res, 500, {ok: false, error: 'server'});
    });
  });
  server.keepAliveTimeout = 65000;
  return server;
}

module.exports = {buatHttp};
