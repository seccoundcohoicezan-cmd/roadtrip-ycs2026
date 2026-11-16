// Logika "Lawan Monster": aturan level, penentuan jadwal event, dan skrip Lua atomik untuk Redis.
// Dipisah dari api/monster.js agar bisa diuji tanpa jaringan (tests/monster.cjs).

const MENIT = 60000;
const PASCA = 15 * MENIT;     // hasil event (menang/habis) masih ditampilkan 15 menit setelah jendela berakhir
const TUNGGU = 24 * 60 * MENIT; // hitung mundur "monster muncul dalam ..." mulai tampil 24 jam sebelumnya
const PREFIKS = {sebelum_live: 'l', jadwal: 'j', manual: 'm'};

const {aturan, intervalUntuk} = require('../assets/js/monster-aturan.js');
const angka = (v, d, min, maks) => { const n = Number(String(v ?? '').replace(',', '.')); return String(v ?? '').trim() !== '' && Number.isFinite(n) ? Math.min(maks, Math.max(min, n)) : d; };

// Menentukan event yang sedang/akan berjalan berdasarkan JAM SERVER.
// Hasil: {fase: 'mati'|'tidak_ada'|'tunggu'|'aktif', id, mulai, selesai, live}
// 'aktif' berarti dalam jendela [mulai, selesai + PASCA); fase akhir (tanding/menang/habis) ditentukan bersama state Redis.
function jadwal(cfg, now) {
  const m = (cfg && cfg.monster) || {};
  if (!m.aktif) return {fase: 'mati'};
  if (String(m.darurat).toUpperCase() === 'STOP') return {fase: 'mati', dihentikan: true};
  const durasi = angka(m.durasi, 20, 1, 180) * MENIT;
  const live = (cfg.live || []).map((l) => ({judul: l.judul, platform: l.platform, link: l.link, mulai: Date.parse(l.mulai), selesai: Date.parse(l.selesai)}))
    .filter((l) => Number.isFinite(l.mulai)).sort((a, b) => a.mulai - b.mulai);
  const liveSetelah = (t) => live.find((l) => l.mulai >= t - MENIT) || null;
  const jendela = (prefiks, mulai, selesai, lv) => {
    if (now < mulai) return now >= mulai - TUNGGU ? {fase: 'tunggu', id: prefiks + mulai.toString(36), mulai, selesai, live: lv} : null;
    if (now < selesai + PASCA) return {fase: 'aktif', id: prefiks + mulai.toString(36), mulai, selesai, live: lv};
    return null;
  };
  // Tombol darurat "Mulai sekarang" mengalahkan pemicu lain.
  const manual = Number(m.mulaiManual);
  if (String(m.darurat).toUpperCase() === 'MULAI' && Number.isFinite(manual) && manual > 0) {
    const j = jendela('m', manual, manual + durasi, liveSetelah(manual));
    if (j) return j;
  }
  const pemicu = PREFIKS[m.pemicu] ? m.pemicu : 'sebelum_live';
  if (pemicu === 'sebelum_live') {
    const menit = angka(m.menit, 20, 1, 180) * MENIT;
    for (const l of live) {
      const j = jendela('l', l.mulai - menit, l.mulai, l);
      if (j) return j;
    }
  } else if (pemicu === 'jadwal') {
    const t = Date.parse(m.waktu);
    if (Number.isFinite(t)) { const j = jendela('j', t, t + durasi, liveSetelah(t + durasi)); if (j) return j; }
  }
  return {fase: 'tidak_ada'};
}

// KEYS: 1 state event (hash), 2 kontribusi per pemain (hash), 3 batas tap pemain (hash), 4 pemain aktif (zset)
// ARGV: 1 now(ms), 2 id pemain, 3 jumlah tap, 4 target csv, 5 poin csv, 6 tap/detik, 7 burst, 8 ttl detik, 9 seq batch, 10 akhir jendela(ms)
// Seluruh skrip berjalan atomik di Redis: tidak ada dua pemanggilan yang saling menimpa.
const LUA_TAP = `
local now = tonumber(ARGV[1])
local pid = ARGV[2]
local n = math.floor(tonumber(ARGV[3]) or 0)
local targets, poin = {}, {}
for v in string.gmatch(ARGV[4], '[^,]+') do targets[#targets + 1] = tonumber(v) end
for v in string.gmatch(ARGV[5], '[^,]+') do poin[#poin + 1] = tonumber(v) end
local rate, burst, ttl = tonumber(ARGV[6]), tonumber(ARGV[7]), tonumber(ARGV[8])
local seq, akhir = tonumber(ARGV[9]) or 0, tonumber(ARGV[10]) or 0
local maks = #targets
local st = redis.call('HMGET', KEYS[1], 'lvl', 'tenaga', 'total', 'kalah', 'naik')
local lvl = tonumber(st[1]) or 1
local tenaga = tonumber(st[2]) or 0
local total = tonumber(st[3]) or 0
local kalah = tonumber(st[4]) or 0
local naik = tonumber(st[5]) or 0
if lvl > maks then lvl = maks end
local terima, dup = 0, 0
local rl = redis.call('HMGET', KEYS[3], 't', 's', 'q')
local lastSeq = tonumber(rl[3]) or -1
if seq <= lastSeq then dup = 1 end
if kalah == 0 and now < akhir and n > 0 and dup == 0 then
  local t = tonumber(rl[1]) or now
  local s = tonumber(rl[2]) or burst
  s = math.min(burst, s + math.max(0, now - t) * rate / 1000)
  terima = math.max(0, math.min(n, math.floor(s)))
  s = s - terima
  redis.call('HMSET', KEYS[3], 't', now, 's', s, 'q', seq)
  redis.call('EXPIRE', KEYS[3], ttl)
  if terima > 0 then
    local pts = terima * (poin[lvl] or lvl)
    tenaga = tenaga + pts
    total = total + pts
    redis.call('HINCRBY', KEYS[2], pid, pts)
    if tenaga >= targets[lvl] then
      if lvl < maks then
        lvl = lvl + 1
        tenaga = 0
        naik = now
      else
        tenaga = targets[lvl]
        kalah = now
      end
    end
    redis.call('HMSET', KEYS[1], 'lvl', lvl, 'tenaga', tenaga, 'total', total, 'kalah', kalah, 'naik', naik)
    redis.call('EXPIRE', KEYS[1], ttl)
    redis.call('EXPIRE', KEYS[2], ttl)
  end
end
redis.call('ZADD', KEYS[4], now, pid)
redis.call('ZREMRANGEBYSCORE', KEYS[4], '-inf', now - 15000)
redis.call('EXPIRE', KEYS[4], ttl)
local aktif = redis.call('ZCARD', KEYS[4])
local saya = tonumber(redis.call('HGET', KEYS[2], pid)) or 0
return {terima, lvl, tenaga, total, kalah, naik, aktif, saya, dup}
`;

// KEYS: 1 state event, 2 pemain aktif. ARGV: 1 now(ms)
const LUA_LIHAT = `
local st = redis.call('HMGET', KEYS[1], 'lvl', 'tenaga', 'total', 'kalah', 'naik')
local aktif = redis.call('ZCOUNT', KEYS[2], tonumber(ARGV[1]) - 15000, '+inf')
return {tonumber(st[1]) or 1, tonumber(st[2]) or 0, tonumber(st[3]) or 0, tonumber(st[4]) or 0, tonumber(st[5]) or 0, aktif}
`;

// KEYS: 1 penghitung per IP. ARGV: 1 batas, 2 detik. Hasil: 1 = boleh, 0 = ditolak.
const LUA_BATAS = `
local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2])) end
if n > tonumber(ARGV[1]) then return 0 end
return 1
`;

const kunci = (id) => ({e: 'm:e:' + id, u: 'm:u:' + id, a: 'm:a:' + id, r: (pid) => 'm:r:' + id + ':' + pid});

module.exports = {aturan, jadwal, intervalUntuk, LUA_TAP, LUA_LIHAT, LUA_BATAS, kunci, PASCA, MENIT};
