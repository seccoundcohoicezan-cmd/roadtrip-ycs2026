const {upstreamPost, ipHash, readBody, send} = require('./_lib');
const AKSI = ['admin-login', 'admin-data', 'admin-simpan-pengaturan', 'admin-simpan-live', 'admin-impor', 'admin-ekspor', 'admin-ganti-sandi', 'admin-keluar'];
// Semua pemeriksaan password/sesi terjadi di Apps Script; fungsi ini hanya meneruskan.
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ok: false, error: 'method'}); }
  const p = readBody(req, 600000);
  if (!p || !AKSI.includes(p.aksi)) return send(res, {ok: false, error: 'validation'});
  try { return send(res, await upstreamPost({...p, ipHash: ipHash(req)}, 60000)); } catch (_) { return send(res, {ok: false, error: 'connection'}); }
};
