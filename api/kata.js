const {upstreamGet, postHandler, send} = require('./_lib');
const kirim = postHandler({kirim: 'kata-kirim'}, ['kata', 'provinsi', 'ref', 'requestId', 'website', 'perangkat']);
// GET: awan kata Satu Kata (cache CDN 1 menit). POST: kirim satu kata.
module.exports = async function handler(req, res) {
  if (req.method === 'POST') return kirim(req, res);
  try {
    const data = await upstreamGet('kata');
    if (data.ok !== true) throw new Error('kata');
    return send(res, data, 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
  } catch (_) { return send(res, {ok: false, error: 'connection'}); }
};
