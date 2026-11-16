// Spreadsheet + layanan Apps Script di memori untuk menjalankan apps-script/Code.gs di Node.
// Dipakai server data (server/index.cjs, produksi di Dokploy) dan uji (tests/_mock-gas.cjs).
// - CacheService punya kedaluwarsa (TTL) seperti aslinya, jadi batas percobaan/sesi admin tetap berjalan.
// - Isi sheet + Script Properties bisa diserialisasi ke JSON (Date disimpan sebagai {"$d": ms}).
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function buatSheet(nama, rows = []) {
  const sheet = {
    nama, rows,
    getName: () => nama,
    getLastRow: () => rows.length,
    getLastColumn: () => Math.max(0, ...rows.map((r) => r.length)),
    getMaxRows: () => Math.max(1000, rows.length),
    appendRow: (r) => { rows.push(r.map((v) => (typeof v === 'string' && v[0] === "'" ? v.slice(1) : v))); },
    getRange(a, c, n = 1, w = 1) {
      if (typeof a === 'string') {
        const m = a.match(/^([A-Z])(\d+)(?::([A-Z])(\d+))?$/);
        if (!m) return range(sheet, 1, 1, 1, 1, true);
        const col = (x) => x.charCodeAt(0) - 64;
        return range(sheet, +m[2], col(m[1]), m[4] ? m[4] - m[2] + 1 : 1, m[3] ? col(m[3]) - col(m[1]) + 1 : 1);
      }
      return range(sheet, a, c, n, w);
    },
    getDataRange: () => range(sheet, 1, 1, Math.max(1, rows.length), Math.max(1, sheet.getLastColumn())),
    getBandings: () => [1], getFilter: () => null, getProtections: () => [], protect: () => chain(),
    clear() { rows.length = 0; }, setFrozenRows() {}, setColumnWidth() {}, setRowHeight() {}, setHiddenGridlines() {},
  };
  return sheet;
}
function chain() { return new Proxy({}, {get: () => () => chain()}); }
const tampil = (v) => (v instanceof Date ? v.toISOString() : String(v));
function range(sheet, r, c, n, w, dummy) {
  const rows = sheet.rows;
  const api = {
    getValues: () => Array.from({length: n}, (_, i) => Array.from({length: w}, (_, j) => (rows[r - 1 + i] || [])[c - 1 + j] ?? '')),
    getDisplayValues: () => api.getValues().map((x) => x.map(tampil)),
    setValues(v) { if (dummy) return px; v.forEach((row, i) => { rows[r - 1 + i] = rows[r - 1 + i] || []; row.forEach((x, j) => { rows[r - 1 + i][c - 1 + j] = x; }); }); for (let i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = []; return px; },
    setValue(x) { return px.setValues([[x]]); },
    clearContent() { for (let i = 0; i < n; i++) if (rows[r - 1 + i]) for (let j = 0; j < w; j++) rows[r - 1 + i][c - 1 + j] = ''; while (rows.length && rows[rows.length - 1].every((x) => x === '')) rows.pop(); return px; },
    createTextFinder: (t) => {
      const f = {matchEntireCell: () => f, matchCase: () => f, findNext: () => {
        for (let i = 0; i < n; i++) if (String((rows[r - 1 + i] || [])[c - 1]).toUpperCase() === String(t).toUpperCase()) return {getRow: () => r + i};
        return null;
      }};
      return f;
    },
  };
  const px = new Proxy(api, {get: (o, k) => (k in o ? o[k] : () => px)});
  return px;
}

// Cache dengan TTL (detik, bawaan 600, maksimal 21600 seperti Apps Script).
function buatCache(jam) {
  const m = new Map();
  const now = () => jam.now ?? Date.now();
  const hidup = (k) => { const e = m.get(k); if (!e) return null; if (e.exp < now()) { m.delete(k); return null; } return e.v; };
  // Bersihkan entri kedaluwarsa berkala agar memori tidak terus tumbuh.
  if (!jam.now) setInterval(() => { const t = now(); for (const [k, e] of m) if (e.exp < t) m.delete(k); }, 60000).unref();
  return {
    get: hidup,
    put: (k, v, ttl = 600) => { m.set(k, {v: String(v), exp: now() + Math.min(21600, Math.max(1, Number(ttl) || 600)) * 1000}); },
    remove: (k) => m.delete(k),
    delete: (k) => m.delete(k),
    removeAll: (ks) => ks.forEach((k) => m.delete(k)),
    clear: () => m.clear(),
    get size() { return m.size; },
  };
}

const keJson = (v) => (v instanceof Date ? {$d: v.getTime()} : v);
const dariJson = (v) => (v && typeof v === 'object' && '$d' in v ? new Date(v.$d) : v);

// jam.now kosong = jam asli. awal = {sheets: {nama: rows}, props: {k: v}} hasil serialisasi.
function muat(jam = {}, awal = null) {
  const sheets = {};
  const urutan = [];
  const ss = {
    getSheetByName: (n) => sheets[n] || null,
    getSheets: () => urutan.map((n) => sheets[n]),
    insertSheet: (n) => { sheets[n] = buatSheet(n); urutan.push(n); return sheets[n]; },
    getSpreadsheetLocale: () => 'in_ID', setActiveSheet() {},
  };
  const props = new Map();
  const cache = buatCache(jam);
  if (awal) {
    Object.entries(awal.sheets || {}).forEach(([n, rows]) => { sheets[n] = buatSheet(n, rows.map((r) => r.map(dariJson))); urutan.push(n); });
    Object.entries(awal.props || {}).forEach(([k, v]) => props.set(k, v));
  }
  const ctx = {
    console, Date: class extends Date { constructor(...a) { super(...(a.length ? a : [jam.now ?? Date.now()])); } static now() { return jam.now ?? Date.now(); } },
    ContentService: {MimeType: {JSON: 'json'}, createTextOutput: (s) => ({setMimeType: () => JSON.parse(s)})},
    LockService: {getScriptLock: () => ({tryLock: () => true, waitLock() {}, hasLock: () => true, releaseLock() {}})},
    SpreadsheetApp: {openById: () => ss, getActive: () => ss, flush() {}, BandingTheme: {}, ProtectionType: {RANGE: 1}},
    PropertiesService: {getScriptProperties: () => ({getProperty: (k) => props.get(k) ?? null, setProperty: (k, v) => props.set(k, String(v)), deleteProperty: (k) => props.delete(k)})},
    CacheService: {getScriptCache: () => cache},
    Utilities: {
      DigestAlgorithm: {SHA_256: 1}, getUuid: () => crypto.randomUUID(),
      computeDigest: (_, s) => [...crypto.createHash('sha256').update(s).digest()],
      base64EncodeWebSafe: (b) => Buffer.from(b).toString('base64url'),
      sleep() {},
    },
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8'), ctx, {filename: 'Code.gs'});
  const get = (aksi, extra = {}) => ctx.doGet({parameter: {aksi, ...extra}});
  const post = (p) => ctx.doPost({postData: {contents: typeof p === 'string' ? p : JSON.stringify(p)}});
  const serial = () => ({sheets: Object.fromEntries(urutan.map((n) => [n, sheets[n].rows.map((r) => r.map(keJson))])), props: Object.fromEntries(props)});
  return {ctx, ss, sheets, urutan, props, cache, get, post, serial};
}
module.exports = {muat, keJson, dariJson};
