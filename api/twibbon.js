const {upstreamPost} = require('./_lib');
const opsional = (v, max, re) => v === undefined || v === '' || (typeof v === 'string' && v.length <= max && (!re || re.test(v)));
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ok: false}); }
  try {
    const p = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!p || JSON.stringify(p).length > 4096 || typeof p.name !== 'string' || typeof p.school !== 'string' || typeof p.email !== 'string' || p.name.trim().length < 2 || p.name.length > 60 || p.school.trim().length < 2 || p.school.length > 100 || p.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(p.email.trim()) || !/^[a-f0-9-]{36}$/i.test(p.requestId || '') || !['delegasi', 'squad'].includes(p.frame) || p.consent !== true || p.channelClicked !== true || p.website || !opsional(p.city, 80) || !opsional(p.province, 40) || !opsional(p.ref, 40, /^[\w-]+$/)) return res.status(400).json({ok: false, error: 'validation'});
    const result = await upstreamPost(p, 20000);
    if (result.ok !== true || result.requestId !== p.requestId) return res.status(result.error === 'rate_limit' ? 429 : 502).json({ok: false, error: result.error || 'save_failed'});
    return res.status(200).json({ok: true, requestId: result.requestId});
  } catch (_) { return res.status(502).json({ok: false, error: 'connection'}); }
};
