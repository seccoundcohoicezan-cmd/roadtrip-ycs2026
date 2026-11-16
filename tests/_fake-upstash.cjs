// Upstash Redis REST tiruan untuk uji lokal: Redis di memori + skrip Lua dijalankan sungguhan dengan fengari (Lua 5.3 di JS).
// Butuh paket "fengari" (tidak ikut deploy): npm i fengari di folder mana pun lalu set NODE_PATH ke node_modules-nya.
// Satu proses Node = satu thread, jadi tiap EVAL berjalan utuh tanpa disela (sama seperti Redis asli).
const http = require('node:http');
const crypto = require('node:crypto');
let F = null;
try { F = require('fengari'); } catch (_) { /* tanpa fengari: modul tetap bisa dimuat, EVAL ditolak */ }
const {lua, lauxlib, lualib, to_luastring, to_jsstring} = F || {};

const data = new Map(); // key -> {t:'s'|'h'|'z', v, exp}
const skrip = new Map(); // sha -> lua
let jumlahPerintah = 0;

function ambil(k, t) {
  const e = data.get(k);
  if (!e) return null;
  if (e.exp && e.exp < Date.now()) { data.delete(k); return null; }
  if (t && e.t !== t) throw new Error('WRONGTYPE');
  return e;
}
function buat(k, t, v) { const e = ambil(k, t) || {t, v}; data.set(k, e); return e; }
const num = (s) => Number(s);

function jalankan(a) {
  const c = String(a[0]).toUpperCase();
  const k = a[1];
  switch (c) {
    case 'GET': { const e = ambil(k, 's'); return e ? e.v : null; }
    case 'SET': { const e = {t: 's', v: String(a[2])}; const i = a.findIndex((x) => String(x).toUpperCase() === 'EX'); if (i > 0) e.exp = Date.now() + num(a[i + 1]) * 1000; data.set(k, e); return 'OK'; }
    case 'DEL': { let n = 0; a.slice(1).forEach((x) => { if (data.delete(x)) n++; }); return n; }
    case 'INCR': { const e = buat(k, 's', '0'); e.v = String(num(e.v) + 1); return num(e.v); }
    case 'EXPIRE': { const e = ambil(k); if (!e) return 0; e.exp = Date.now() + num(a[2]) * 1000; return 1; }
    case 'HGET': { const e = ambil(k, 'h'); return e && e.v.has(a[2]) ? e.v.get(a[2]) : null; }
    case 'HMGET': { const e = ambil(k, 'h'); return a.slice(2).map((f) => (e && e.v.has(f) ? e.v.get(f) : null)); }
    case 'HSET': case 'HMSET': { const e = buat(k, 'h', new Map()); let n = 0; for (let i = 2; i < a.length; i += 2) { if (!e.v.has(a[i])) n++; e.v.set(a[i], String(a[i + 1])); } return c === 'HSET' ? n : 'OK'; }
    case 'HINCRBY': { const e = buat(k, 'h', new Map()); const v = num(e.v.get(a[2]) || 0) + num(a[3]); e.v.set(a[2], String(v)); return v; }
    case 'HGETALL': { const e = ambil(k, 'h'); return e ? [...e.v].flat() : []; }
    case 'HLEN': { const e = ambil(k, 'h'); return e ? e.v.size : 0; }
    case 'ZADD': { const e = buat(k, 'z', new Map()); let n = 0; for (let i = 2; i < a.length; i += 2) { if (!e.v.has(a[i + 1])) n++; e.v.set(String(a[i + 1]), num(a[i])); } return n; }
    case 'ZCARD': { const e = ambil(k, 'z'); return e ? e.v.size : 0; }
    case 'ZCOUNT': case 'ZREMRANGEBYSCORE': {
      const e = ambil(k, 'z'); if (!e) return 0;
      const b = (s) => (s === '-inf' ? -Infinity : s === '+inf' ? Infinity : num(s));
      const lo = b(String(a[2])), hi = b(String(a[3]));
      let n = 0;
      for (const [m, s] of [...e.v]) if (s >= lo && s <= hi) { n++; if (c === 'ZREMRANGEBYSCORE') e.v.delete(m); }
      return n;
    }
    case 'EVAL': return evalLua(String(a[1]), a.slice(3, 3 + num(a[2])), a.slice(3 + num(a[2])));
    case 'EVALSHA': { const s = skrip.get(String(a[1])); if (!s) throw new Error('NOSCRIPT No matching script'); return evalLua(s, a.slice(3, 3 + num(a[2])), a.slice(3 + num(a[2]))); }
    case 'FLUSHALL': data.clear(); return 'OK';
  }
  throw new Error('ERR unknown command ' + c);
}

// --- Jembatan Lua ↔ JS ---
function dorong(L, v) {
  if (v === null || v === undefined) lua.lua_pushboolean(L, 0);
  else if (Array.isArray(v)) { lua.lua_createtable(L, v.length, 0); v.forEach((x, i) => { dorong(L, x); lua.lua_rawseti(L, -2, i + 1); }); }
  else if (typeof v === 'number') lua.lua_pushinteger(L, Math.trunc(v));
  else lua.lua_pushstring(L, to_luastring(String(v)));
}
function baca(L, i) {
  const t = lua.lua_type(L, i);
  if (t === lua.LUA_TNUMBER) return Math.trunc(lua.lua_tonumber(L, i)); // Redis memotong angka Lua menjadi integer
  if (t === lua.LUA_TSTRING) return to_jsstring(lua.lua_tostring(L, i));
  if (t === lua.LUA_TBOOLEAN) return lua.lua_toboolean(L, i) ? 1 : null;
  if (t === lua.LUA_TTABLE) {
    const out = [];
    for (let n = 1; ; n++) { lua.lua_rawgeti(L, i, n); if (lua.lua_isnil(L, -1)) { lua.lua_pop(L, 1); break; } out.push(baca(L, lua.lua_gettop(L))); lua.lua_pop(L, 1); }
    return out;
  }
  return null;
}
function evalLua(src, keys, argv) {
  if (!F) throw new Error('ERR fengari tidak tersedia');
  skrip.set(crypto.createHash('sha1').update(src).digest('hex'), src);
  const L = lauxlib.luaL_newstate();
  lualib.luaL_openlibs(L);
  const tabel = (nama, arr) => { lua.lua_createtable(L, arr.length, 0); arr.forEach((x, i) => { lua.lua_pushstring(L, to_luastring(String(x))); lua.lua_rawseti(L, -2, i + 1); }); lua.lua_setglobal(L, to_luastring(nama)); };
  tabel('KEYS', keys); tabel('ARGV', argv);
  lua.lua_createtable(L, 0, 1);
  lua.lua_pushcfunction(L, (L2) => {
    const n = lua.lua_gettop(L2);
    const args = [];
    for (let i = 1; i <= n; i++) { args.push(to_jsstring(lauxlib.luaL_tolstring(L2, i))); lua.lua_pop(L2, 1); }
    // Redis mengubah angka Lua ke string dengan %.17g; angka bulat tanpa ".0".
    dorong(L2, jalankan(args.map((s) => (/^-?\d+\.0$/.test(s) ? s.slice(0, -2) : s))));
    return 1;
  });
  lua.lua_setfield(L, -2, to_luastring('call'));
  lua.lua_setglobal(L, to_luastring('redis'));
  if (lauxlib.luaL_loadstring(L, to_luastring(src)) !== lua.LUA_OK || lua.lua_pcall(L, 0, 1, 0) !== lua.LUA_OK) throw new Error('ERR lua: ' + to_jsstring(lua.lua_tostring(L, -1)));
  return baca(L, lua.lua_gettop(L));
}

function mulai(port, token = 'uji-token') {
  return new Promise((ok) => {
    const srv = http.createServer((req, res) => {
      let b = '';
      req.on('data', (c) => { b += c; });
      req.on('end', () => {
        res.setHeader('Content-Type', 'application/json');
        if (req.headers.authorization !== 'Bearer ' + token) { res.statusCode = 401; return res.end(JSON.stringify({error: 'Unauthorized'})); }
        try { jumlahPerintah++; res.end(JSON.stringify({result: jalankan(JSON.parse(b))})); }
        catch (e) { res.statusCode = 400; res.end(JSON.stringify({error: e.message})); }
      });
    }).listen(port, '127.0.0.1', () => ok(srv));
  });
}
module.exports = {tersedia: !!F, mulai, jalankan, data, perintah: () => jumlahPerintah};
