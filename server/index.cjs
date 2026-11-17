// Server YCS 2026 (Dokploy) — satu-satunya backend situs.
//   server/data.cjs        state Code.gs + Lawan Monster, simpan ke /data, sinkron ke Google Sheet (cadangan)
//   server/api.cjs         API publik /api/* (kontrak: docs/API.md)
//   server/http.cjs        router HTTP
//   server/monster.cjs     mesin Lawan Monster (jadwal, tap, jurus, tiket, spin)
//   server/gas-memori.cjs  Spreadsheet + layanan Apps Script di memori untuk apps-script/Code.gs
// Env: PRIMARY_SECRET (wajib), SHEET_URL, DATA_DIR, MONSTER_SECRET, ALLOWED_ORIGINS, SINKRON_MS, MONSTER_BATAS_MASUK, PORT.
const fs = require('node:fs');
const {buatData} = require('./data.cjs');
const {buatHttp} = require('./http.cjs');

// Dipakai tests & tools/dev-server.cjs: data + server HTTP dalam satu objek.
function buatPrimer(o = {}) {
  const data = buatData(o);
  const server = buatHttp(data, o);
  return {server, data, mulai: data.mulai, sinkron: data.sinkron, simpanSinkron: data.simpanSinkron, tandai: data.tandai, info: data.info, tertunda: data.tertunda,
    get app() { return data.app; }, get monster() { return data.monster; }};
}

module.exports = {buatPrimer};

if (require.main === module) {
  const e = process.env;
  if (!e.PRIMARY_SECRET || e.PRIMARY_SECRET.length < 32) { console.error('PRIMARY_SECRET wajib (≥ 32 karakter)'); process.exit(1); }
  if (e.DATA_DIR) fs.mkdirSync(e.DATA_DIR, {recursive: true});
  const p = buatPrimer({dataDir: e.DATA_DIR || null, sheetUrl: e.SHEET_URL || null, rahasia: e.PRIMARY_SECRET, monsterRahasia: e.MONSTER_SECRET,
    origins: e.ALLOWED_ORIGINS || 'https://roadtrip-ycs2026.vercel.app', sinkronMs: Number(e.SINKRON_MS) || 3000, batasMasuk: Number(e.MONSTER_BATAS_MASUK) || 300});
  p.server.listen(Number(e.PORT) || 3000, '0.0.0.0', () => console.log('YCS server siap di port', Number(e.PORT) || 3000));
  p.mulai().catch((err) => { console.error(err); process.exit(1); });
  const tutup = () => { try { p.simpanSinkron(); } catch (err) { console.error(err); } process.exit(0); };
  process.on('SIGTERM', tutup); process.on('SIGINT', tutup);
}
