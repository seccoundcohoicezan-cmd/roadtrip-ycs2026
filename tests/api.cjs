// Uji API publik server (server/api.cjs): status HTTP, cache, whitelist field, reveal berbasis jam server, twibbon, admin.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {muat} = require('../server/gas-memori.cjs');
const {buatApi, FORMULIR} = require('../server/api.cjs');

function siapkan(jam = {}) {
  const app = muat(jam);
  app.get('siapkan');
  const data = {app, tandai() {}, monster: {segarkan() {}, lihat: () => ({ok: true, fase: 'mati'}), pemenangPublik: () => ({ok: true, pemenang: []})}, tertunda: () => false, info: {}, adaSheet: false};
  return {app, rute: buatApi(data).rute};
}
const url = (q = '') => new URL('http://x/api/' + q);

test('reveal ditolak 425 sebelum waktu pengumuman (jam server) dan tidak membaca data finalis', async () => {
  const {app, rute} = siapkan({now: Date.now()});
  const asli = app.get;
  const dipanggil = [];
  app.get = (aksi) => { dipanggil.push(aksi); return aksi === 'config' ? {ok: true, pengumuman: new Date(Date.now() + 60000).toISOString()} : asli(aksi); };
  const j = await rute['GET reveal'].fn(null, '1.1.1.1', url('reveal'));
  assert.equal(j.kode, 425); assert.equal(j.body.error, 'belum_waktunya');
  assert.match(j.cache, /s-maxage=\d+/); assert.ok(Number(j.header['Retry-After']) >= 1);
  assert.ok(!dipanggil.includes('reveal'));
});

test('config & kata: cache CDN, tanpa field rahasia', async () => {
  const {rute} = siapkan();
  const c = await rute['GET config'].fn(null, '', url('config'));
  assert.equal(c.kode, 200); assert.match(c.cache, /s-maxage=30/); assert.equal(c.body.now, undefined);
  assert.ok(!JSON.stringify(c.body).includes('YCS-'), 'kode akses Dana Kaget tidak bocor');
  const k = await rute['GET kata'].fn(null, '', url('kata'));
  assert.equal(k.kode, 200); assert.match(k.cache, /s-maxage=60/);
});

test('formulir: aksi tidak dikenal 400, field di luar whitelist dibuang, IP hanya dikirim sebagai hash', async () => {
  const {app, rute} = siapkan();
  let dikirim = null;
  const asli = app.post;
  app.post = (p) => { dikirim = p; return asli(p); };
  assert.equal((await rute['POST kata'].fn({aksi: 'hapus'}, '1.2.3.4', url())).kode, 400);
  await rute['POST kata'].fn({aksi: 'kirim', kata: 'maju', nama: 'Ani', admin: true, token: 'x'}, '1.2.3.4', url());
  assert.equal(dikirim.aksi, 'kata-kirim'); assert.equal(dikirim.admin, undefined); assert.equal(dikirim.token, undefined);
  assert.ok(dikirim.ipHash && dikirim.ipHash.length === 32 && !dikirim.ipHash.includes('1.2.3.4'));
  assert.deepEqual(Object.keys(FORMULIR).sort(), ['dana', 'kata', 'klaim', 'survei']);
});

test('twibbon: validasi 400, gagal simpan 502, sukses 200 dengan requestId', async () => {
  const {app, rute} = siapkan();
  const p = {name: 'Nama Uji', school: 'Sekolah Uji', email: 'uji@example.com', frame: 'squad', requestId: crypto.randomUUID(), channelClicked: true, consent: true};
  assert.equal((await rute['POST twibbon'].fn({...p, email: 'salah'}, '', url())).kode, 400);
  const asli = app.post;
  app.post = () => ({ok: false, error: 'save_failed'});
  assert.equal((await rute['POST twibbon'].fn(p, '', url())).kode, 502);
  app.post = asli;
  const ok = await rute['POST twibbon'].fn(p, '', url());
  assert.equal(ok.kode, 200); assert.equal(ok.body.requestId, p.requestId);
});

test('admin: aksi di luar daftar ditolak, sesi salah 401, login benar mendapat token', async () => {
  const {app, rute} = siapkan();
  assert.equal((await rute['POST admin'].fn({aksi: 'twibbon'}, '', url())).kode, 400);
  assert.equal((await rute['POST admin'].fn({aksi: 'admin-data', token: 'x'.repeat(50)}, '', url())).kode, 401);
  assert.equal((await rute['POST admin'].fn({aksi: 'admin-primer', token: 'x'.repeat(50), perintah: 'status'}, '', url())).kode, 401);
  const l = await rute['POST admin'].fn({aksi: 'admin-login', sandi: app.sheets.Admin.rows[1][1]}, '', url());
  assert.equal(l.kode, 200); assert.ok(l.body.token);
  const s = await rute['POST admin'].fn({aksi: 'admin-primer', token: l.body.token, perintah: 'status'}, '', url());
  assert.equal(s.body.ok, true);
});

test('daftar festival dengan nomor WhatsApp (tanpa email): valid, 1 nomor = 1 warga, bisa masuk Lawan Monster', async () => {
  const {app, rute} = siapkan();
  const kirim = (extra) => rute['POST kata'].fn({aksi: 'kirim', kata: 'maju', karakter: 2, nama: 'Raka Pratama', sekolah: 'SMA 1', provinsi: 'Bali', channelClicked: true, consent: true, requestId: crypto.randomUUID(), ...extra}, '9.9.9.9', url());
  assert.equal((await kirim({wa: '12345'})).kode, 400, 'nomor tidak valid & tanpa email ditolak');
  const a = await kirim({wa: '0812-3456-7890'});
  assert.equal(a.kode, 200); assert.equal(a.body.ok, true);
  const b = await kirim({wa: '+62 812 3456 7890'});
  assert.equal(b.body.sudah, true, 'nomor yang sama (format lain) = warga yang sama');
  const baris = app.sheets['Satu Kata'].rows.at(-1);
  assert.equal(String(baris[11]), '6281234567890'); assert.equal(baris[8], '');
  const {buatMonster} = require('../server/monster.cjs');
  const m = buatMonster(app, {rahasia: 'r'.repeat(40)});
  const masuk = m.masuk({perangkat: 'dev-wa-aaaaaaaaaaaaa', wa: '081234567890'}, '1.1.1.1');
  assert.equal(masuk.ok, true); assert.equal(masuk.nama, 'Raka P.');
});
