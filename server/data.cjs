// Lapisan data server YCS 2026: Code.gs di memori (gas-memori.cjs) + mesin Lawan Monster (monster.cjs),
// disimpan ke DATA_DIR/primer.json dan diteruskan ke Google Sheet (cadangan) beberapa detik sekali.
//
// Alur hidup:
//   1. Ada primer.json  → muat dari file (state + hash baris yang sudah ada di Sheet).
//   2. Tidak ada        → ambil seluruh isi Sheet (Apps Script primer-ekspor), ulangi sampai berhasil.
//      Sebelum selesai, server menjawab 503 agar tidak ada data yang tertimpa.
//   3. Setiap perubahan → tandai() → simpan ke file (debounce 1,5 dtk) + sinkron ke Sheet (tiap SINKRON_MS).
// Sinkron per tab: hanya baris baru di akhir → "append"; selain itu → "replace" isi tab. Tab Rekap (rumus) dilewati.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {muat, keJson} = require('./gas-memori.cjs');
const {buatMonster} = require('./monster.cjs');

const TANPA_SINKRON = ['Rekap'];
const BATAS_PAKET = 4e6; // byte per permintaan ke Apps Script
const hashBaris = (r) => crypto.createHash('sha1').update(JSON.stringify(r.map(keJson))).digest('base64').slice(0, 14);

function buatData(o = {}) {
  const log = o.log || ((...a) => console.log(new Date().toISOString(), ...a));
  const file = o.dataDir ? path.join(o.dataDir, 'primer.json') : null;
  let app = null, monster = null, siap = false, monsterState = {};
  let terkirim = {}; // nama tab → hash baris yang sudah ada di Sheet
  let kotor = true, simpanTimer = 0, sinkronJalan = false, gagalSinkron = 0;
  const info = {sejak: null, sinkronTerakhir: null, galatTerakhir: null, opsTerakhir: 0, impor: null};

  /* ---------- state ---------- */
  function pasang(gas) {
    app = muat({}, gas);
    monster = buatMonster(app, {rahasia: o.monsterRahasia, state: monsterState, saatUbah: tandai, batasMasuk: o.batasMasuk});
    monsterState = monster.state;
  }
  const isiFile = () => JSON.stringify({versi: 1, gas: app.serial(), monster: monsterState, terkirim, info});
  function tandai() {
    kotor = true;
    if (file && !simpanTimer) { simpanTimer = setTimeout(() => simpan().catch((e) => log('simpan gagal:', e.message)), 1500); simpanTimer.unref(); }
  }
  async function simpan() {
    simpanTimer = 0;
    if (!file || !siap) return;
    await fs.promises.writeFile(file + '.tmp', isiFile());
    await fs.promises.rename(file + '.tmp', file);
  }
  function simpanSinkron() { if (file && siap) { fs.writeFileSync(file + '.tmp', isiFile()); fs.renameSync(file + '.tmp', file); } }

  /* ---------- Google Sheet (cadangan) ---------- */
  async function keSheet(body, timeout = 120000) {
    const r = await fetch(o.sheetUrl, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: JSON.stringify(body), redirect: 'follow', signal: AbortSignal.timeout(timeout)});
    if (!r.ok) throw new Error('sheet ' + r.status);
    return r.json();
  }
  const hashSemua = () => { terkirim = {}; app.urutan.forEach((n) => { terkirim[n] = app.sheets[n].rows.map(hashBaris); }); };
  // Ambil seluruh isi Sheet ke memori. Hash awal = isi Sheet, jadi tidak ada yang diteruskan ulang.
  async function impor() {
    const d = await keSheet({aksi: 'primer-ekspor', rahasia: o.rahasia});
    if (!d.ok) throw new Error('ekspor ' + d.error);
    const sheets = {};
    d.tabs.forEach((t) => { sheets[t.nama] = t.baris; });
    pasang({sheets, props: d.props || {}});
    hashSemua();
    app.get('siapkan'); // lengkapi skema (kunci pengaturan/tab baru) → ikut diteruskan
    info.impor = new Date().toISOString();
    log('impor dari Sheet:', d.tabs.map((t) => t.nama + '=' + t.baris.length).join(', '));
  }

  async function mulai() {
    if (file && fs.existsSync(file)) {
      const s = JSON.parse(fs.readFileSync(file, 'utf8'));
      monsterState = s.monster || {};
      pasang(s.gas);
      terkirim = s.terkirim || {};
      Object.assign(info, s.info || {});
      log('state dimuat dari', file);
    } else if (o.sheetUrl) {
      for (let i = 0; ; i++) {
        try { await impor(); break; } catch (e) { log('impor gagal, coba lagi:', e.message); await new Promise((r) => setTimeout(r, Math.min(30000, 2000 * (i + 1)))); }
      }
      info.sejak = new Date().toISOString();
    } else {
      pasang(null);
      app.get('siapkan');
      hashSemua();
    }
    siap = true;
    tandai();
    if (o.sheetUrl) setTimeout(putarSinkron, 1000).unref();
  }

  // Bandingkan tiap tab dengan yang sudah di Sheet → daftar operasi append/replace.
  function opsPerubahan() {
    const ops = [], baru = {};
    for (const nama of app.urutan) {
      if (TANPA_SINKRON.includes(nama)) continue;
      const rows = app.sheets[nama].rows;
      const h = rows.map(hashBaris), lama = terkirim[nama];
      baru[nama] = h;
      const awalSama = lama && lama.length <= h.length && lama.every((x, i) => x === h[i]);
      if (awalSama && lama.length === h.length) continue;
      if (awalSama) ops.push({nama, mode: 'append', dari: lama.length + 1, baris: rows.slice(lama.length).map((r) => r.map(keJson))});
      else ops.push({nama, mode: 'replace', baris: rows.map((r) => r.map(keJson))});
    }
    return {ops, baru};
  }
  function bagiPaket(ops) {
    const paket = [];
    let isi = [], ukuran = 0;
    for (const op of ops) {
      const u = JSON.stringify(op).length;
      if (isi.length && ukuran + u > BATAS_PAKET) { paket.push(isi); isi = []; ukuran = 0; }
      isi.push(op); ukuran += u;
    }
    if (isi.length) paket.push(isi);
    return paket;
  }
  async function sinkron() {
    if (!o.sheetUrl || !siap || sinkronJalan || !kotor) return;
    sinkronJalan = true;
    try {
      kotor = false;
      const {ops, baru} = opsPerubahan();
      if (!ops.length) return;
      for (const p of bagiPaket(ops)) {
        const d = await keSheet({aksi: 'primer-terapkan', rahasia: o.rahasia, ops: p});
        if (!d.ok) throw new Error('terapkan ' + d.error);
        d.hasil.forEach((x) => { terkirim[x.nama] = x.ok ? baru[x.nama] : null; if (!x.ok) kotor = true; });
      }
      Object.assign(info, {sinkronTerakhir: new Date().toISOString(), opsTerakhir: ops.length, galatTerakhir: null});
      gagalSinkron = 0;
      tandai();
    } catch (e) {
      kotor = true; gagalSinkron++;
      info.galatTerakhir = new Date().toISOString() + ' ' + e.message;
      log('sinkron gagal:', e.message);
    } finally { sinkronJalan = false; }
  }
  function putarSinkron() {
    sinkron().finally(() => setTimeout(putarSinkron, gagalSinkron ? Math.min(60000, 3000 * 2 ** gagalSinkron) : (o.sinkronMs || 3000)).unref());
  }

  return {
    mulai, impor, sinkron, simpanSinkron, tandai, info,
    get siap() { return siap; }, get app() { return app; }, get monster() { return monster; },
    tertunda: () => kotor || sinkronJalan,
    adaSheet: !!o.sheetUrl,
    dataDir: o.dataDir || null,
  };
}

module.exports = {buatData};
