// "Lawan Monster": event kolaboratif sebelum live.
// GET  → status event (di-cache CDN 1 detik, jadi ribuan HP yang memantau hanya memicu ±1 panggilan/detik per region).
// POST {aksi:'masuk'} → token pemain bertanda tangan HMAC (dibatasi per IP).
// POST {aksi:'tap', token, n, seq, e} → batch tap; poin dihitung di server dari level saat ini (atomik di Redis).
const crypto = require('node:crypto');
const {upstreamGet, ipHash, readBody, send} = require('./_lib');
const redis = require('./_redis');
const M = require('./_monster');

const TTL = 2 * 24 * 3600;
const RAHASIA = () => process.env.MONSTER_SECRET || crypto.createHash('sha256').update('ycs-monster:' + (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '')).digest('hex');

// Pengaturan: memori instance 5 detik → Redis "m:cfg" (60 detik, dihapus api/admin.js saat admin menyimpan) → Apps Script.
let memo = {at: 0, cfg: null};
async function ambilCfg() {
  if (memo.cfg && Date.now() - memo.at < 5000) return memo.cfg;
  try {
    let cfg = null;
    const simpan = await redis.perintah(['GET', 'm:cfg']).catch(() => null);
    if (simpan) cfg = JSON.parse(simpan);
    if (!cfg) {
      const d = await upstreamGet('config', 8000);
      if (d.ok !== true) throw new Error('config');
      cfg = {monster: d.monster || {}, live: d.live || []};
      await redis.perintah(['SET', 'm:cfg', JSON.stringify(cfg), 'EX', 60]).catch(() => null);
    }
    memo = {at: Date.now(), cfg};
  } catch (e) {
    if (!memo.cfg) throw e; // pakai pengaturan terakhir bila Apps Script lambat
  }
  return memo.cfg;
}

const tanda = (pid) => crypto.createHmac('sha256', RAHASIA()).update(pid).digest('base64url').slice(0, 22);
function cekToken(t) {
  if (typeof t !== 'string' || t.length > 80) return null;
  const [pid, sig] = t.split('.');
  if (!/^[\w-]{16,24}$/.test(pid || '') || !sig) return null;
  const a = Buffer.from(sig), b = Buffer.from(tanda(pid));
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? pid : null;
}

// Gabungkan jadwal + state Redis menjadi satu objek publik.
function status(cfg, j, st, now) {
  const m = cfg.monster || {};
  const a = M.aturan(m);
  const dasar = {ok: true, now, fase: j.fase, nama: m.nama || 'Raja Batu', wujud: m.wujud === 'lucu' ? 'lucu' : 'raja_batu'};
  if (j.dihentikan) dasar.dihentikan = true;
  if (!j.id) return dasar;
  const live = j.live ? {judul: j.live.judul, platform: j.live.platform, link: j.live.link, mulai: new Date(j.live.mulai).toISOString()} : null;
  const out = {...dasar, id: j.id, mulai: new Date(j.mulai).toISOString(), selesai: new Date(j.selesai).toISOString(), live,
    levelMaks: a.target.length, target: a.target, poin: a.poin, skala: a.skala};
  if (j.fase === 'tunggu') return out;
  const [lvl, tenaga, total, kalah, naik, aktif] = st;
  out.fase = kalah ? 'menang' : now < j.selesai ? 'tanding' : 'habis';
  Object.assign(out, {level: lvl, tenaga, total, kalah: kalah ? new Date(kalah).toISOString() : null, naik: naik || null, pemain: aktif,
    interval: M.intervalUntuk(a.interval, aktif)});
  return out;
}

async function lihat(req, res) {
  if (!redis.siap()) return send(res, {ok: true, fase: 'mati', alasan: 'penyimpanan', now: Date.now()}, 'public, max-age=0, s-maxage=30');
  const cfg = await ambilCfg();
  const now = Date.now();
  const j = M.jadwal(cfg, now);
  if (j.fase !== 'aktif') {
    // Tidak ada pertandingan: cache lebih lama, tapi jangan melewati detik monster muncul.
    const sisa = j.mulai ? Math.floor((j.mulai - now) / 1000) : 30;
    return send(res, status(cfg, j, null, now), 'public, max-age=0, s-maxage=' + Math.max(1, Math.min(15, sisa - 1)));
  }
  const k = M.kunci(j.id);
  const st = await redis.skrip(M.LUA_LIHAT, [k.e, k.a], [now]);
  return send(res, status(cfg, j, st, now), 'public, max-age=0, s-maxage=1, stale-while-revalidate=2');
}

async function masuk(req, res) {
  const ip = ipHash(req) || 'tanpa-ip';
  // Batas token baru per IP: 300 / 10 menit (env MONSTER_BATAS_MASUK). Longgar karena operator seluler memakai CGNAT
  // (ratusan pelajar bisa berbagi satu IP); tiap token tetap dibatasi 10 tap/detik di skrip Lua.
  const boleh = await redis.skrip(M.LUA_BATAS, ['m:ip:' + ip], [Number(process.env.MONSTER_BATAS_MASUK) || 300, 600]);
  if (!boleh) return send(res, {ok: false, error: 'rate_limit'});
  const pid = crypto.randomBytes(12).toString('base64url');
  return send(res, {ok: true, token: pid + '.' + tanda(pid)});
}

async function tap(req, res, p) {
  const pid = cekToken(p.token);
  if (!pid) return send(res, {ok: false, error: 'sesi_habis'});
  const n = Math.floor(Number(p.n));
  const seq = Math.floor(Number(p.seq));
  if (!Number.isFinite(n) || n < 0 || n > 200 || !Number.isFinite(seq) || seq < 0) return send(res, {ok: false, error: 'validation'});
  const cfg = await ambilCfg();
  const now = Date.now();
  const j = M.jadwal(cfg, now);
  if (j.fase !== 'aktif' || p.e !== j.id) {
    // Tap untuk event lain (mis. antrean offline dari event lama) dibuang dengan aman.
    return send(res, {ok: true, terima: 0, buang: true, status: status(cfg, j, j.fase === 'aktif' ? await redis.skrip(M.LUA_LIHAT, [M.kunci(j.id).e, M.kunci(j.id).a], [now]) : null, now)});
  }
  const a = M.aturan(cfg.monster);
  const k = M.kunci(j.id);
  const r = await redis.skrip(M.LUA_TAP, [k.e, k.u, k.r(pid), k.a],
    [now, pid, n, a.target.join(','), a.poin.join(','), a.batasTap, Math.round(a.batasTap * 3), TTL, seq, j.selesai]);
  const [terima, lvl, tenaga, total, kalah, naik, aktif, saya, dup] = r;
  return send(res, {ok: true, terima, dup: !!dup, saya, status: status(cfg, j, [lvl, tenaga, total, kalah, naik, aktif], now)});
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') return await lihat(req, res);
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ok: false, error: 'method'}); }
    if (!redis.siap()) return send(res, {ok: false, error: 'busy'});
    const p = readBody(req, 2048);
    if (!p) return send(res, {ok: false, error: 'validation'});
    if (p.aksi === 'masuk') return await masuk(req, res);
    if (p.aksi === 'tap') return await tap(req, res, p);
    return send(res, {ok: false, error: 'validation'});
  } catch (e) {
    console.error('monster: ' + (e.redis ? 'redis ' : '') + e.message);
    return send(res, {ok: false, error: e.redis ? 'busy' : 'connection'});
  }
};
