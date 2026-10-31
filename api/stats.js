const {upstreamGet, send} = require('./_lib');
// Progres Road to Bali + leaderboard daerah, dihitung dari data twibbon. Di-cache CDN 2 menit.
module.exports = async function handler(req, res) {
  try {
    const data = await upstreamGet('stats');
    if (data.ok !== true) throw new Error('stats');
    return send(res, data, 'public, max-age=0, s-maxage=120, stale-while-revalidate=600');
  } catch (_) { return send(res, {ok: false, error: 'connection'}); }
};
