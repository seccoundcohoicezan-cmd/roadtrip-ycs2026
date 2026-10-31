// Spreadsheet + layanan Apps Script tiruan di memori untuk menjalankan apps-script/Code.gs di Node.
// Dipakai tests/fase2.cjs dan tests/dev-server.cjs. jam.now kosong = jam asli.
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function buatSheet(nama) {
  const rows = [];
  const sheet = {
    nama, rows,
    getLastRow: () => rows.length,
    getLastColumn: () => Math.max(0, ...rows.map((r) => r.length)),
    getMaxRows: () => 1000,
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
    getBandings: () => [1], getFilter: () => null, getProtections: () => [], protect: () => chain(),
    clear() { rows.length = 0; }, setFrozenRows() {}, setColumnWidth() {}, setRowHeight() {}, setHiddenGridlines() {},
  };
  return sheet;
}
function chain() { return new Proxy({}, {get: () => () => chain()}); }
function range(sheet, r, c, n, w, dummy) {
  const rows = sheet.rows;
  const api = {
    getValues: () => Array.from({length: n}, (_, i) => Array.from({length: w}, (_, j) => (rows[r - 1 + i] || [])[c - 1 + j] ?? '')),
    getDisplayValues: () => api.getValues().map((x) => x.map(String)),
    setValues(v) { if (dummy) return px; v.forEach((row, i) => { rows[r - 1 + i] = rows[r - 1 + i] || []; row.forEach((x, j) => { rows[r - 1 + i][c - 1 + j] = x; }); }); return px; },
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

function muat(jam = {}) {
  const sheets = {};
  const ss = {
    getSheetByName: (n) => sheets[n] || null,
    insertSheet: (n) => (sheets[n] = buatSheet(n)),
    getSpreadsheetLocale: () => 'in_ID', setActiveSheet() {},
  };
  const props = new Map(), cache = new Map();
  const ctx = {
    console, Date: class extends Date { constructor(...a) { super(...(a.length ? a : [jam.now ?? Date.now()])); } static now() { return jam.now ?? Date.now(); } },
    ContentService: {MimeType: {JSON: 'json'}, createTextOutput: (s) => ({setMimeType: () => JSON.parse(s)})},
    LockService: {getScriptLock: () => ({tryLock: () => true, hasLock: () => true, releaseLock() {}})},
    SpreadsheetApp: {openById: () => ss, flush() {}, BandingTheme: {}, ProtectionType: {RANGE: 1}},
    PropertiesService: {getScriptProperties: () => ({getProperty: (k) => props.get(k) ?? null, setProperty: (k, v) => props.set(k, v)})},
    CacheService: {getScriptCache: () => ({get: (k) => cache.get(k) ?? null, put: (k, v) => cache.set(k, v), remove: (k) => cache.delete(k), removeAll: (ks) => ks.forEach((k) => cache.delete(k))})},
    Utilities: {
      DigestAlgorithm: {SHA_256: 1}, getUuid: () => crypto.randomUUID(),
      computeDigest: (_, s) => [...crypto.createHash('sha256').update(s).digest()],
      base64EncodeWebSafe: (b) => Buffer.from(b).toString('base64url'),
    },
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8'), ctx);
  const get = (aksi) => ctx.doGet({parameter: {aksi}});
  const post = (p) => ctx.doPost({postData: {contents: JSON.stringify(p)}});
  return {ctx, sheets, props, cache, get, post};
}
module.exports = {muat};
