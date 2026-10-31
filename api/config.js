const {upstreamGet, send} = require('./_lib');
// Pengaturan publik (waktu pengumuman, jadwal live, saklar fitur). Di-cache CDN 30 detik.
module.exports = async function handler(req, res) {
  try {
    const data = await upstreamGet('config');
    if (data.ok !== true) throw new Error('config');
    delete data.now;
    return send(res, data, 'public, max-age=0, s-maxage=30, stale-while-revalidate=300');
  } catch (_) { return send(res, {ok: false, error: 'connection'}); }
};
