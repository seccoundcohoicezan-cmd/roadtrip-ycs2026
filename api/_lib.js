// Utilitas bersama fungsi Vercel. File berawalan "_" tidak menjadi route.
const crypto = require('node:crypto');

// Endpoint Apps Script bersifat publik; tidak ada OAuth/token akun di frontend.
const ENDPOINT = process.env.YCS_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbzbzKw_rqGIgOxczylvv9C9jt1YkJdRK6wmgNK3Jkxh7XFbAhMA3aBhRgOENjYHjdI7/exec';
const STATUS = {kata_ditolak: 422, validation: 400, sesi_habis: 401, sandi_salah: 401, terlalu_banyak: 429, rate_limit: 429, busy: 503, server: 502, save_failed: 502, connection: 502};

async function upstreamGet(aksi, timeout = 20000) {
  const r = await fetch(ENDPOINT + '?aksi=' + encodeURIComponent(aksi), {headers: {Accept: 'application/json'}, redirect: 'follow', signal: AbortSignal.timeout(timeout)});
  if (!r.ok) throw new Error('upstream ' + r.status);
  return r.json();
}
async function upstreamPost(payload, timeout = 25000) {
  const r = await fetch(ENDPOINT, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: JSON.stringify(payload), redirect: 'follow', signal: AbortSignal.timeout(timeout)});
  if (!r.ok) throw new Error('upstream ' + r.status);
  return r.json();
}
// IP tidak dikirim mentah ke Apps Script; hanya hash bergaram untuk batas percobaan.
function ipHash(req) {
  const ip = String((req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) || '').split(',')[0].trim();
  return ip ? crypto.createHash('sha256').update((process.env.YCS_IP_SALT || 'ycs2026-salt') + ip).digest('base64url').slice(0, 32) : '';
}
function readBody(req, max = 8192) {
  const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  if (raw.length > max) return null;
  try { const p = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; return p && typeof p === 'object' && !Array.isArray(p) ? p : null; } catch (_) { return null; }
}
function send(res, data, cache = 'no-store') {
  res.setHeader('Cache-Control', cache);
  return res.status(data.ok ? 200 : (STATUS[data.error] || 422)).json(data);
}
// POST sederhana: validasi metode + ukuran, teruskan field yang diizinkan beserta aksi & hash IP.
function postHandler(map, fields, max = 8192) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ok: false, error: 'method'}); }
    const p = readBody(req, max);
    const aksi = p && map[p.aksi];
    if (!aksi) return send(res, {ok: false, error: 'validation'});
    const payload = {aksi, ipHash: ipHash(req)};
    fields.forEach((f) => { if (p[f] !== undefined) payload[f] = p[f]; });
    try { return send(res, await upstreamPost(payload)); } catch (_) { return send(res, {ok: false, error: 'connection'}); }
  };
}
module.exports = {ENDPOINT, upstreamGet, upstreamPost, ipHash, readBody, send, postHandler};
