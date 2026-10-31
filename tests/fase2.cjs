// Uji logika Apps Script fase pengumuman dengan Spreadsheet tiruan di memori.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const {muat} = require('./_mock-gas.cjs');
const T = (s) => Date.parse(s);
const uuid = () => crypto.randomUUID();

test('skema dibuat otomatis, sandi admin awal ditulis ke tab Admin, config publik tanpa data rahasia', () => {
  const jam = {now: T('2026-11-10T10:00:00+07:00')};
  const app = muat(jam);
  const cfg = app.get('config');
  assert.equal(cfg.ok, true);
  assert.equal(cfg.fase, 'pra');
  assert.equal(cfg.pengumuman, '2026-11-16T19:00:00+07:00');
  assert.equal(cfg.live.length, 3);
  assert.ok(!JSON.stringify(cfg).includes('YCS-'), 'kode akses Dana Kaget tidak bocor');
  assert.match(app.sheets.Admin.rows[1][1], /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.ok(app.props.get('ADMIN_HASH'));
});

test('reveal ditolak sebelum waktunya dan terbuka setelahnya', () => {
  const jam = {now: T('2026-11-16T18:59:59+07:00')};
  const app = muat(jam);
  app.get('siapkan');
  app.sheets.Finalis.rows.push(['Aisyah', 'SMAN 1', 'Kota Semarang', 'Jawa Tengah', 'golden buzzer', 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view', 'YA'], ['Raka', 'SMK 2', 'Kab. Grobogan', 'Jawa Tengah', '', '', 'TIDAK']);
  assert.equal(app.get('reveal').error, 'belum_waktunya');
  jam.now += 1000;
  const r = app.get('reveal');
  assert.equal(r.ok, true);
  assert.equal(r.finalis.length, 1);
  assert.equal(r.finalis[0].jalur, 'Golden Buzzer');
  assert.equal(r.finalis[0].foto, 'https://lh3.googleusercontent.com/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345=w480');
  assert.equal(app.get('config').fase, 'pasca');
});

test('klaim: email harus cocok, sekali pakai, idempoten, hangus, dan dibatasi 5 kali salah', () => {
  const jam = {now: T('2026-11-17T09:00:00+07:00')};
  const app = muat(jam);
  app.get('siapkan');
  app.sheets['Kode Wildcard'].rows.push(['ABCD2345', 'budi@mail.com', 'Budi Santoso', 'belum klaim', '', '', 0, ''], ['HANG5678', 'ani@mail.com', 'Ani', 'belum klaim', '2026-11-17 08:00', '', 0, '']);
  const dasar = {perangkat: 'dev-1', ipHash: 'ip-1'};
  assert.equal(app.post({aksi: 'klaim-cek', kode: 'ABCD2345', email: 'lain@mail.com', ...dasar}).error, 'tidak_cocok');
  const cek = app.post({aksi: 'klaim-cek', kode: 'abcd-2345', email: 'BUDI@mail.com', ...dasar});
  assert.equal(cek.status, 'siap');
  assert.equal(cek.email, 'bu•••@mail.com');
  assert.equal(cek.nama, 'Budi');
  assert.equal(app.post({aksi: 'klaim-verifikasi', kode: 'ABCD2345', email: 'budi@mail.com', ...dasar}).status, 'aktif');
  assert.equal(app.sheets['Kode Wildcard'].rows[1][3], 'sudah klaim');
  const lagi = app.post({aksi: 'klaim-verifikasi', kode: 'ABCD2345', email: 'budi@mail.com', ...dasar});
  assert.equal(lagi.status, 'sudah');
  assert.ok(lagi.waktuKlaim);
  assert.equal(app.post({aksi: 'klaim-cek', kode: 'HANG5678', email: 'ani@mail.com', ...dasar}).error, 'hangus');
  for (let i = 0; i < 4; i++) app.post({aksi: 'klaim-cek', kode: 'ZZZZ9999', email: 'x@mail.com', ...dasar});
  assert.equal(app.post({aksi: 'klaim-cek', kode: 'ABCD2345', email: 'budi@mail.com', ...dasar}).error, 'terlalu_banyak');
  assert.equal(app.post({aksi: 'klaim-cek', kode: 'ABCD2345', email: 'budi@mail.com', perangkat: 'dev-2', ipHash: 'ip-2'}).status, 'sudah');
});

test('klaim ditutup sebelum pengumuman', () => {
  const app = muat({now: T('2026-11-01T09:00:00+07:00')});
  assert.equal(app.post({aksi: 'klaim-cek', kode: 'ABCD2345', email: 'budi@mail.com'}).error, 'belum_waktunya');
});

test('Dana Kaget: kode akses, kuota tidak jebol, satu orang satu pengajuan', () => {
  const app = muat({now: T('2026-11-20T09:00:00+07:00')});
  app.get('siapkan');
  const peng = app.sheets.Pengaturan.rows;
  const set = (k, v) => { peng.find((r) => r[0] === k)[1] = v; app.cache.delete('cfg'); };
  const kode = peng.find((r) => r[0] === 'dana_kode_akses')[1];
  const isi = (i, extra = {}) => ({aksi: 'dana-kirim', kodeAkses: kode, nama: 'Peserta ' + i, email: `p${i}@mail.com`, wa: '+62 812-0000-00' + String(i).padStart(2, '0'), sekolah: 'SMA ' + i, kota: 'Kota Semarang', provinsi: 'Jawa Tengah', requestId: uuid(), consent: true, perangkat: 'd' + i, ...extra});
  assert.equal(app.post(isi(1)).error, 'nonaktif');
  set('dana_aktif', 'YA'); set('dana_kuota', '2');
  assert.equal(app.post({...isi(1), kodeAkses: 'SALAH'}).error, 'kode_salah');
  assert.equal(app.post({aksi: 'dana-akses', kodeAkses: kode.toLowerCase(), perangkat: 'd9'}).sisa, 2);
  const a = isi(1);
  assert.equal(app.post(a).sisa, 1);
  assert.equal(app.post(a).duplicate, true, 'kirim ulang dengan requestId sama tidak menggandakan');
  assert.equal(app.post({...isi(2), email: 'p1@mail.com'}).error, 'sudah_mengajukan');
  assert.equal(app.post({...isi(3), wa: '081200000001'}).error, 'sudah_mengajukan', 'nomor sama (format beda) ditolak');
  assert.equal(app.post(isi(4)).sisa, 0);
  assert.equal(app.post(isi(5)).error, 'habis');
  const cfg = app.get('config');
  assert.equal(cfg.dana.aktif, false);
  assert.equal(cfg.dana.penuh, true);
  assert.equal(app.sheets['Dana Kaget'].rows.length, 3);
});

test('survei: validasi pilihan dan dedup requestId', () => {
  const app = muat({now: T('2026-11-17T09:00:00+07:00')});
  const id = uuid();
  const p = {aksi: 'survei-kirim', destinasi: ['Bali', 'Raja Ampat', 'Hack', 'Bali'], kegiatan: ['Bakti sosial'], waktu: 'Akhir pekan panjang', status: 'Kelas 11', provinsi: 'Jawa Tengah', impian: 'Derawan', requestId: id, ipHash: 'x'};
  assert.equal(app.post({...p, kegiatan: []}).error, 'validation');
  assert.equal(app.post(p).ok, true);
  assert.equal(app.post(p).duplicate, true);
  assert.equal(app.sheets.Survei.rows[1][2], 'Bali, Raja Ampat');
});

test('admin: login, sesi, simpan pengaturan tervalidasi, impor kode dengan kode acak, ekspor', () => {
  const app = muat({now: T('2026-11-10T09:00:00+07:00')});
  app.get('siapkan');
  const sandi = app.sheets.Admin.rows[1][1];
  assert.equal(app.post({aksi: 'admin-data', token: 'x'.repeat(64)}).error, 'sesi_habis');
  assert.equal(app.post({aksi: 'admin-login', sandi: 'salah-sekali'}).error, 'sandi_salah');
  const {token} = app.post({aksi: 'admin-login', sandi});
  assert.ok(token);
  assert.equal(app.post({aksi: 'admin-simpan-pengaturan', token, nilai: {waktu_pengumuman: 'besok'}}).error, 'nilai_tidak_valid');
  assert.equal(app.post({aksi: 'admin-simpan-pengaturan', token, nilai: {waktu_pengumuman: '2026-11-16T20:00', dana_aktif: 'ya', link_event: 'https://contoh.id/event'}}).ok, true);
  const cfg = app.get('config');
  assert.equal(cfg.pengumuman, '2026-11-16T20:00:00+07:00');
  assert.equal(cfg.event.link, 'https://contoh.id/event');
  const imp = app.post({aksi: 'admin-impor', token, jenis: 'kode', mode: 'tambah', baris: [['Email', 'Nama'], ['a@mail.com', 'A'], ['bukan-email', 'B'], ['A@mail.com', 'A lagi'], ['c@mail.com', 'C']]});
  assert.equal(imp.jumlah, 2);
  assert.equal(imp.dilewati, 2);
  const kode = app.sheets['Kode Wildcard'].rows.slice(1).map((r) => r[0]);
  kode.forEach((k) => assert.match(k, /^[A-HJ-NP-Z2-9]{8}$/));
  const eks = app.post({aksi: 'admin-ekspor', token, jenis: 'kode'});
  assert.equal(eks.total, 2);
  assert.equal(eks.header[0], 'Kode');
  const live = app.post({aksi: 'admin-simpan-live', token, baris: [['Live A', 'YouTube', '2026-11-16 19:00', '2026-11-16 18:00', 'https://y.tb', '', 'YA']]});
  assert.equal(live.error, 'baris_tidak_valid');
  assert.equal(app.post({aksi: 'admin-ganti-sandi', token, sandi, sandiBaru: 'sandi-baru-panjang'}).ok, true);
  assert.ok(app.post({aksi: 'admin-login', sandi: 'sandi-baru-panjang'}).token);
});

test('twibbon: migrasi header lama, simpan kota/provinsi/ref, statistik leaderboard', () => {
  const app = muat({now: T('2026-11-10T09:00:00+07:00')});
  const tw = app.ctx.SpreadsheetApp.openById().insertSheet('Twibbon YCS 2026');
  tw.rows.push(['Waktu', 'ID permintaan', 'Nama', 'Sekolah', 'Email', 'Bingkai', 'Klik saluran WhatsApp', 'Persetujuan data', 'Sumber']);
  tw.rows.push([new Date(), uuid(), 'Lama', 'SMA', 'l@mail.com', 'squad', 'Ya', 'Ya', 'web-ycs2026']);
  const base = {name: 'Budi', school: 'SMAN 1', email: 'b@mail.com', frame: 'delegasi', channelClicked: true, consent: true};
  assert.equal(app.post({...base, requestId: uuid(), city: 'Kota Semarang', province: 'Jawa Tengah', ref: 'ig-bio'}).ok, true);
  assert.equal(app.post({...base, email: 'c@mail.com', requestId: uuid(), city: 'Kota Semarang', province: 'Jawa Tengah'}).ok, true);
  assert.equal(tw.rows[0].length, 11);
  assert.equal(tw.rows[2][8], 'ig-bio');
  assert.equal(tw.rows[3][8], 'web-ycs2026');
  const st = app.get('stats');
  assert.equal(st.road.current, 3);
  assert.deepEqual(st.kota[0], {nama: 'Kota Semarang', jumlah: 2});
});

test('proxy reveal menolak sebelum waktunya tanpa memanggil endpoint reveal', async () => {
  const previous = global.fetch;
  const calls = [];
  global.fetch = async (url) => { calls.push(url); return {ok: true, json: async () => ({ok: true, pengumuman: new Date(Date.now() + 60000).toISOString()})}; };
  try {
    delete require.cache[require.resolve('../api/reveal.js')];
    const handler = require('../api/reveal.js');
    let code, body; const headers = {};
    const res = {setHeader: (k, v) => { headers[k] = v; }, status(n) { code = n; return this; }, json(v) { body = v; return this; }};
    await handler({method: 'GET', headers: {}}, res);
    assert.equal(code, 425);
    assert.equal(body.error, 'belum_waktunya');
    assert.ok(calls.every((u) => !u.includes('aksi=reveal')));
    assert.match(headers['Cache-Control'], /s-maxage=(\d+)/);
  } finally { global.fetch = previous; }
});
