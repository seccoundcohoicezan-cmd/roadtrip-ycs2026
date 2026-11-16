// Klien Redis REST (Upstash) tanpa dependensi. File berawalan "_" tidak menjadi route.
// Variabel lingkungan otomatis terisi saat Upstash Redis dihubungkan lewat Vercel → Storage:
// KV_REST_API_URL + KV_REST_API_TOKEN (nama dari integrasi Vercel) atau UPSTASH_REDIS_REST_URL + _TOKEN.
const crypto = require('node:crypto');

const URL_REDIS = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const TOKEN = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const siap = () => !!(URL_REDIS() && TOKEN());

async function perintah(args, timeout = 4000) {
  const r = await fetch(URL_REDIS(), {
    method: 'POST',
    headers: {Authorization: 'Bearer ' + TOKEN(), 'Content-Type': 'application/json'},
    body: JSON.stringify(args.map(String)),
    signal: AbortSignal.timeout(timeout),
  });
  const d = await r.json().catch(() => ({error: 'json'}));
  if (d.error) { const e = new Error(String(d.error)); e.redis = true; throw e; }
  return d.result;
}

// EVALSHA dulu (hemat bandwidth); bila skrip belum termuat di server, kirim EVAL sekali.
const sha = new Map();
async function skrip(lua, keys, argv) {
  if (!sha.has(lua)) sha.set(lua, crypto.createHash('sha1').update(lua).digest('hex'));
  try {
    return await perintah(['EVALSHA', sha.get(lua), keys.length, ...keys, ...argv]);
  } catch (e) {
    if (!/NOSCRIPT/i.test(e.message)) throw e;
    return perintah(['EVAL', lua, keys.length, ...keys, ...argv]);
  }
}

module.exports = {siap, perintah, skrip};
