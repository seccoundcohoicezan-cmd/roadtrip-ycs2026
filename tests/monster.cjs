// Uji Lawan Monster + server data: aturan level, jadwal (jam server), validasi admin di Apps Script,
// mesin monster (1 perangkat = 1 peserta, tiket, spin, batas tap, seq anti-duplikat), dan sinkron server data ↔ Sheet.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const {aturan} = require('../assets/js/monster-aturan.js');
const {jadwal, buatMonster} = require('../server/monster.cjs');
const {muat} = require('../server/gas-memori.cjs');
const {buatPrimer} = require('../server/index.cjs');
const T = (s) => Date.parse(s);

test('aturan: daftar target, rumus, poin & skala per level', () => {
  assert.deepEqual(aturan({target: '5000,15000,40000'}), {target: [5000, 15000, 40000], poin: [1, 2, 3], skala: [1, 1.3, 1.6], interval: 1000, batasTap: 10});
  assert.deepEqual(aturan({target: '', level: '4', targetDasar: '5000', targetKali: '2.8'}).target, [5000, 14000, 39200, 109800]);
  assert.deepEqual(aturan({target: '10,20', poin: '5'}).poin, [5, 2]);
  assert.equal(aturan({target: '1,1,1,1,1,1,1,1,1,1', skalaNaik: '1'}).skala[9], 2.5);
});

test('jadwal: sebelum_live, jadwal, manual, darurat STOP', () => {
  const live = [{judul: 'A', mulai: '2026-11-20T19:00:00+07:00', selesai: '2026-11-20T20:00:00+07:00', link: 'https://x'}];
  const cfg = (m) => ({monster: {aktif: true, menit: '20', durasi: '20', ...m}, live});
  const c = cfg({pemicu: 'sebelum_live'});
  assert.equal(jadwal(c, T('2026-11-19T12:00:00+07:00')).fase, 'tidak_ada');
  assert.equal(jadwal(c, T('2026-11-20T18:39:59+07:00')).fase, 'tunggu');
  const j = jadwal(c, T('2026-11-20T18:40:00+07:00'));
  assert.equal(j.fase, 'aktif'); assert.equal(j.selesai, T('2026-11-20T19:00:00+07:00'));
  assert.equal(jadwal(c, T('2026-11-20T19:15:00+07:00')).fase, 'tidak_ada');
  assert.equal(jadwal({...c, monster: {...c.monster, darurat: 'STOP'}}, T('2026-11-20T18:50:00+07:00')).dihentikan, true);
  const jw = jadwal(cfg({pemicu: 'jadwal', waktu: '2026-11-21T10:00:00+07:00'}), T('2026-11-21T10:05:00+07:00'));
  assert.equal(jw.fase, 'aktif'); assert.ok(jw.id.startsWith('j'));
  const now = T('2026-11-21T10:00:00+07:00');
  assert.ok(jadwal(cfg({darurat: 'MULAI', mulaiManual: now - 1000}), now).id.startsWith('m'));
});

test('Apps Script: pengaturan monster divalidasi, Mulai sekarang mencatat jam server', () => {
  const jam = {now: T('2026-11-20T10:00:00+07:00')};
  const app = muat(jam);
  app.get('siapkan');
  const token = app.post({aksi: 'admin-login', sandi: app.sheets.Admin.rows[1][1]}).token;
  const simpan = (nilai) => app.post({aksi: 'admin-simpan-pengaturan', token, nilai});
  assert.equal(app.get('config').monster.aktif, false, 'default mati');
  assert.deepEqual(simpan({monster_target: '5000,abc'}).kunci, ['monster_target']);
  assert.deepEqual(simpan({monster_tiket_min: '0'}).kunci, ['monster_tiket_min']);
  assert.equal(simpan({monster_aktif: 'YA', monster_target: '100; 200 300', monster_darurat: 'mulai'}).ok, true);
  const m = app.get('config').monster;
  assert.equal(m.target, '100,200,300'); assert.equal(m.darurat, 'MULAI'); assert.equal(m.mulaiManual, jam.now);
});

// Mesin Code.gs + monster dengan jam tiruan dan dua peserta festival.
function siapkanMonster(target = '50,100') {
  const jam = {now: T('2026-11-20T10:00:00+07:00')};
  const app = muat(jam);
  app.get('siapkan');
  const kt = app.sheets['Satu Kata'];
  [['Ani Lestari', 'ani@mail.com'], ['Budi Santoso', 'budi@mail.com'], ['Cici Ayu', 'cici@mail.com']].forEach(([n, e], i) =>
    kt.rows.push(['2026-11-19 10:00', 'k' + i, 'maju', 'Bali', 'web', 'YA', n, 'SMA ' + i, e, 'Ya', 1]));
  const peng = app.sheets.Pengaturan.rows;
  const atur = (k, v) => { const r = peng.find((x) => x[0] === k); r[1] = v; };
  atur('monster_aktif', 'YA'); atur('monster_pemicu', 'manual'); atur('monster_darurat', 'MULAI'); atur('monster_mulai_manual', String(jam.now - 1000)); atur('monster_target', target);
  app.cache.remove('cfg');
  const m = buatMonster(app, {now: () => jam.now, rahasia: 'r'.repeat(40)});
  return {jam, app, m};
}

test('monster: 1 perangkat = 1 peserta festival, token terikat perangkat', () => {
  const {m} = siapkanMonster();
  assert.equal(m.masuk({perangkat: 'dev-aaaaaaaaaaaaaaaa', email: 'tidak@ada.id'}, '1.1.1.1').error, 'belum_festival');
  const a = m.masuk({perangkat: 'dev-aaaaaaaaaaaaaaaa', email: 'ANI@mail.com '}, '1.1.1.1');
  assert.equal(a.ok, true); assert.equal(a.nama, 'Ani L.');
  assert.equal(m.masuk({perangkat: 'dev-aaaaaaaaaaaaaaaa', email: 'budi@mail.com'}, '1.1.1.1').error, 'perangkat_dipakai', 'perangkat sama, email lain');
  assert.equal(m.masuk({perangkat: 'dev-bbbbbbbbbbbbbbbb', email: 'ani@mail.com'}, '1.1.1.1').error, 'email_perangkat_lain', 'email sama, perangkat lain');
  assert.equal(m.masuk({perangkat: 'dev-aaaaaaaaaaaaaaaa', email: 'ani@mail.com'}, '1.1.1.1').token, a.token, 'masuk ulang dari perangkat yang sama = token sama');
  assert.equal(m.tap({token: a.token.slice(0, -2) + 'xx', n: 1, seq: 1, e: 'x'}).error, 'sesi_habis');
});

test('monster: batas tap, seq duplikat, naik level, tiket 1 per peserta, kalah, spin', () => {
  const {jam, app, m} = siapkanMonster();
  const id = m.lihat().id;
  const ta = m.masuk({perangkat: 'dev-aaaaaaaaaaaaaaaa', email: 'ani@mail.com', fp: 'f1'}, '1.1.1.1').token;
  const tb = m.masuk({perangkat: 'dev-bbbbbbbbbbbbbbbb', email: 'budi@mail.com', fp: 'f1'}, '1.1.1.1').token;
  const tc = m.masuk({perangkat: 'dev-cccccccccccccccc', email: 'cici@mail.com', fp: 'f2'}, '2.2.2.2').token;
  let r = m.tap({token: ta, n: 100, seq: 1, e: id});
  assert.equal(r.terima, 30, 'burst 30'); assert.equal(r.tiket, '#0001');
  assert.equal(m.tap({token: ta, n: 5, seq: 1, e: id}).dup, true);
  jam.now += 500;
  assert.equal(m.tap({token: ta, n: 30, seq: 2, e: id}).terima, 5, 'isi ulang 10 tap/detik');
  r = m.tap({token: tb, n: 20, seq: 1, e: id});
  assert.equal(r.status.level, 2, 'target 50 tercapai → level 2'); assert.equal(r.tiket, '#0002');
  r = m.tap({token: tc, n: 30, seq: 1, e: id});
  assert.equal(r.status.tenaga, 60, 'level 2 = 2 poin per tap');
  jam.now += 3000;
  r = m.tap({token: tb, n: 30, seq: 2, e: id});
  assert.equal(r.status.fase, 'menang');
  assert.equal(m.tap({token: tc, n: 5, seq: 2, e: id}).terima, 0, 'tap setelah kalah tidak dihitung');
  const tiket = app.sheets['Tiket Monster'].rows.slice(1);
  assert.equal(tiket.length, 3, '3 peserta = 3 tiket');
  assert.deepEqual(tiket.map((x) => x[2]), ['#0001', '#0002', '#0003']);
  assert.equal(tiket[1][10], 'perangkat mirip #0001', 'sidik jari + IP sama ditandai');
  assert.equal(tiket[0][8], 35, 'kontribusi akhir ditulis saat event selesai');
  assert.equal(app.sheets['Monster Event'].rows.length, 2);
  // spin oleh admin
  const token = app.post({aksi: 'admin-login', sandi: app.sheets.Admin.rows[1][1]}).token;
  assert.equal(m.admin({token: 'salah'.repeat(10), aksi: 'spin'}).error, 'sesi_habis');
  const pemenang = new Set();
  for (let i = 0; i < 3; i++) { const s = m.admin({token, aksi: 'spin', event: id}); assert.equal(s.ok, true); pemenang.add(s.pemenang.nomor); }
  assert.equal(pemenang.size, 3, 'pemenang tidak terulang');
  assert.equal(m.admin({token, aksi: 'spin', event: id}).error, 'tidak_ada_tiket');
  assert.ok(/MENANG #1/.test(app.sheets['Tiket Monster'].rows.slice(1).map((x) => x[9]).join()));
  // lepas perangkat
  assert.equal(m.admin({token, aksi: 'lepas-perangkat', email: 'ani@mail.com'}).ok, true);
  assert.equal(m.masuk({perangkat: 'dev-dddddddddddddddd', email: 'ani@mail.com'}, '1.1.1.1').ok, true, 'setelah dilepas boleh perangkat baru');
});

test('server data: impor dari Sheet, tulis lewat /exec, diteruskan ke Sheet (append & replace), simpan & muat ulang file', async () => {
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const RAHASIA = 'r'.repeat(40);
  const sheet = muat();
  sheet.ctx.primerSah_ = (r) => r === RAHASIA;
  sheet.get('siapkan');
  sheet.sheets['Satu Kata'].rows.push(['2026-11-19 10:00', 'lama', 'damai', 'Bali', 'web', 'YA', 'Lama', 'SMA', 'lama@mail.com', 'Ya', 1]);
  const srv = http.createServer((req, res) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => { res.end(JSON.stringify(sheet.post(b))); }); });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ycs-'));
  const opsi = {dataDir: dir, sheetUrl: `http://127.0.0.1:${srv.address().port}/exec`, rahasia: RAHASIA, sinkronMs: 50, log: () => {}};
  const p = buatPrimer(opsi);
  await p.mulai();
  assert.equal(p.app.sheets['Satu Kata'].rows.length, 2, 'data Sheet terimpor');
  const kirim = p.app.post({aksi: 'kata-kirim', kata: 'hebat', karakter: 2, nama: 'Raka Pratama', sekolah: 'SMA 1', email: 'raka@mail.com', provinsi: 'Bali', channelClicked: true, consent: true, requestId: '11111111-1111-1111-1111-111111111111'});
  assert.equal(kirim.ok, true);
  p.tandai();
  await p.sinkron();
  assert.equal(sheet.sheets['Satu Kata'].rows.length, 3, 'baris baru diteruskan (append)');
  assert.equal(sheet.sheets['Satu Kata'].rows[2][8], 'raka@mail.com');
  p.app.sheets.Pengaturan.rows[1][1] = 'diubah';
  p.tandai();
  await p.sinkron();
  assert.equal(sheet.sheets.Pengaturan.rows[1][1], 'diubah', 'perubahan sel diteruskan (replace)');
  p.simpanSinkron();
  const p2 = buatPrimer(opsi);
  await p2.mulai();
  assert.equal(p2.app.sheets['Satu Kata'].rows.length, 3, 'dimuat dari file, bukan impor ulang');
  srv.close();
  fs.rmSync(dir, {recursive: true, force: true});
});

test('mode uji: event terpisah lewat kode, tanpa ikatan perangkat, tiket tidak masuk Sheet', () => {
  const {jam, app, m} = siapkanMonster();
  app.sheets.Pengaturan.rows.find((x) => x[0] === 'monster_aktif')[1] = 'TIDAK';
  app.cache.remove('cfg'); m.segarkan();
  const token = app.post({aksi: 'admin-login', sandi: app.sheets.Admin.rows[1][1]}).token;
  assert.equal(m.lihat().fase, 'mati', 'pengunjung biasa tidak melihat monster');
  const u = m.admin({token, aksi: 'uji-mulai', menit: 5}).uji;
  assert.equal(m.lihat().fase, 'mati', 'uji tidak terlihat tanpa kode');
  assert.equal(m.lihat('salah').ujiSalah, true);
  const s = m.lihat(u.kode);
  assert.equal(s.fase, 'tanding'); assert.equal(s.uji, true); assert.ok(s.id.startsWith('u'));
  const a = m.masuk({perangkat: 'dev-uji-aaaaaaaaaaaa', email: '', uji: u.kode}, '1.1.1.1');
  assert.equal(a.ok, true, 'tanpa email festival pun boleh');
  assert.equal(Object.keys(m.state.perangkat).length, 0, 'perangkat tidak diikat');
  const r = m.tap({token: a.token, n: 10, seq: 1, e: s.id, uji: u.kode});
  assert.equal(r.terima, 10); assert.equal(r.tiket, '#0001');
  assert.equal(m.tap({token: a.token, n: 10, seq: 2, e: s.id}).buang, true, 'tanpa kode uji tidak masuk event uji');
  assert.equal((app.sheets['Tiket Monster'] || {rows: [0]}).rows.length, 1, 'tiket uji tidak ditulis ke Sheet');
  const t = m.admin({token, aksi: 'tiket', event: s.id});
  assert.equal(t.tiket.length, 1); assert.equal(t.tiket[0].catatan, 'UJI');
  assert.equal(m.admin({token, aksi: 'spin', event: s.id}).ok, true, 'tiket uji bisa dicoba di-spin');
  m.admin({token, aksi: 'uji-stop'});
  assert.equal(m.masuk({perangkat: 'dev-uji-aaaaaaaaaaaa', uji: u.kode}, '1.1.1.1').error, 'uji_berakhir');
  jam.now += 1;
});

test('spin: hadiah berbobot, stok habis tidak ikut, latihan tidak dicatat, peluang sebanding kontribusi', () => {
  const {jam, app, m} = siapkanMonster('100000');
  const id = m.lihat().id;
  const token = app.post({aksi: 'admin-login', sandi: app.sheets.Admin.rows[1][1]}).token;
  ['ani', 'budi', 'cici'].forEach((n, i) => {
    const tk = m.masuk({perangkat: 'dev-' + n.padEnd(16, 'x'), email: n + '@mail.com'}, '9.9.9.' + i).token;
    m.tap({token: tk, n: i === 0 ? 30 : 1, seq: 1, e: id});
  });
  assert.equal(m.admin({token, aksi: 'spin-atur', hadiah: [{nama: 'Voucher', stok: 'x', bobot: 1}]}).error, 'nilai_tidak_valid');
  const atur = m.admin({token, aksi: 'spin-atur', hadiah: [{nama: 'Voucher 100rb', stok: 1, bobot: 1}, {nama: 'Merchandise', stok: '', bobot: 3}], peluang: 'rata'});
  assert.deepEqual(atur.roda.map((h) => h.persen), [25, 75]);
  assert.equal(app.sheets['Hadiah Spin'].rows[1][0], 'Voucher 100rb', 'pengaturan hadiah dicadangkan ke Sheet');
  const lat = m.admin({token, aksi: 'spin', event: id, latihan: true});
  assert.equal(lat.ok, true); assert.equal(lat.latihan, true);
  assert.equal(app.sheets['Tiket Monster'].rows.filter((r) => /^MENANG/.test(r[9])).length, 0, 'latihan tidak mencatat pemenang');
  const s1 = m.admin({token, aksi: 'spin', event: id});
  assert.ok(s1.hadiah); assert.match(app.sheets['Tiket Monster'].rows.find((r) => r[2] === s1.pemenang.nomor)[9], /^MENANG #1 · /);
  // paksa Voucher habis lalu pastikan hanya Merchandise yang keluar
  m.state.spin.hadiah[0].terpakai = 1;
  const s2 = m.admin({token, aksi: 'spin', event: id});
  assert.equal(s2.hadiah.nama, 'Merchandise'); assert.deepEqual(s2.rodaPutar.map((h) => h.nama), ['Merchandise']);
  m.state.spin.hadiah = [{id: 'h1', nama: 'A', stok: 0, bobot: 1, terpakai: 0}];
  assert.equal(m.admin({token, aksi: 'spin', event: id}).error, 'hadiah_habis');
  // sebaran: bobot 1:3 → ±25%:75% (latihan, 4000 putaran)
  m.admin({token, aksi: 'spin-atur', hadiah: [{nama: 'A', bobot: 1}, {nama: 'B', bobot: 3}], peluang: 'kontribusi'});
  app.sheets['Tiket Monster'].rows.forEach((r, i) => { if (i) r[9] = 'aktif'; });
  let b = 0, ani = 0;
  for (let i = 0; i < 4000; i++) { const x = m.admin({token, aksi: 'spin', event: id, latihan: true}); if (x.hadiah.nama === 'B') b++; if (x.pemenang.nama === 'Ani Lestari') ani++; }
  assert.ok(b / 4000 > 0.71 && b / 4000 < 0.79, 'hadiah B ±75%: ' + b / 4000);
  assert.ok(ani / 4000 > 0.85, 'peluang sebanding kontribusi (Ani 30 vs 1 vs 1): ' + ani / 4000);
  jam.now += 1;
});

test('karakter ber-nyawa: sasaran diumumkan dulu, tiap pukulan −1 nyawa, tumbang di 0, HINDAR membuat pukulan meleset', () => {
  const {jam, app, m} = siapkanMonster('100000');
  app.sheets.Pengaturan.rows.find((x) => x[0] === 'monster_perisai')[1] = '0';
  app.cache.remove('cfg'); m.segarkan();
  let s = m.lihat();
  assert.equal(s.totalWarga, 3); assert.equal(s.hpMaks, 5);
  assert.equal(s.jurusTarget.length, 1, 'sasaran jurus berikutnya sudah diumumkan (3 × 4% → 1 pukulan)');
  const ta = m.masuk({perangkat: 'dev-karakter-aaaaaaa', email: 'ani@mail.com'}, '1.1.1.1').token;
  assert.equal(m.saya({token: ta}).hp, 5);
  // jurus 1: satu karakter kena, nyawa 5 → 4, belum tumbang
  jam.now += 8000; s = m.lihat();
  assert.equal(s.hidup, 3); assert.equal(s.jurusInfo.pukulan, 1); assert.equal(s.jurusInfo.kena[0][2], 4);
  // bila Ani jadi sasaran berikutnya, HINDAR → meleset
  for (let i = 0; i < 6; i++) {
    if (m.saya({token: ta}).sasaran) {
      const hpSebelum = m.saya({token: ta}).hp;
      jam.now += 6000; assert.equal(m.hindar({token: ta, e: s.id}).aman, true);
      jam.now += 2000; s = m.lihat();
      assert.equal(s.jurusInfo.menghindar, 1); assert.equal(m.saya({token: ta}).hp, hpSebelum, 'nyawa tidak berkurang saat menghindar');
      break;
    }
    jam.now += 8000; s = m.lihat();
  }
  // tanpa menghindar: total nyawa 3 × 5 = 15 pukulan → semua tumbang → monster menang
  jam.now += 8000 * 30; s = m.lihat();
  assert.equal(s.fase, 'monster_menang'); assert.equal(s.hidup, 0);
  assert.equal(m.tap({token: ta, n: 5, seq: 9, e: s.id}).terima, 0);
  assert.equal(m.saya({token: ta}).mati, true); assert.equal(m.saya({token: ta}).hp, 0);
});

test('karakter tumbang di tengah event: tap ditolak (mati) walau event masih berjalan', () => {
  const {jam, app, m} = siapkanMonster('100000');
  const kt = app.sheets['Satu Kata'];
  for (let i = 0; i < 40; i++) kt.rows.push(['2026-11-19', 'x' + i, 'maju', 'Bali', 'web', 'YA', 'Warga ' + i, 'SMA', 'w' + i + '@mail.com', 'Ya', 1]);
  app.sheets.Pengaturan.rows.find((x) => x[0] === 'monster_jurus_damage')[1] = '60';
  app.sheets.Pengaturan.rows.find((x) => x[0] === 'monster_perisai')[1] = '0';
  app.cache.remove('cfg'); m.segarkan();
  const tk = m.masuk({perangkat: 'dev-tumbang-aaaaaaaa', email: 'ani@mail.com'}, '1.1.1.1').token;
  let mati = false, s = null;
  for (let i = 0; i < 30 && !mati; i++) { jam.now += 8000; s = m.lihat(); mati = m.saya({token: tk}).mati; }
  assert.ok(mati, 'Ani akhirnya tumbang setelah 5 pukulan');
  if (s.fase === 'tanding') { const r = m.tap({token: tk, n: 5, seq: 1, e: s.id}); assert.equal(r.mati, true); assert.equal(r.terima, 0); }
});

test('pemenang publik: nama disingkat, hadiah, tanpa event uji', () => {
  const {app, m} = siapkanMonster('100000');
  const id = m.lihat().id;
  const token = app.post({aksi: 'admin-login', sandi: app.sheets.Admin.rows[1][1]}).token;
  const tk = m.masuk({perangkat: 'dev-pub-aaaaaaaaaaaa', email: 'ani@mail.com'}, '1.1.1.1').token;
  m.tap({token: tk, n: 5, seq: 1, e: id});
  m.admin({token, aksi: 'spin-atur', hadiah: [{nama: 'HP Android', stok: 1, bobot: 1}]});
  const s = m.admin({token, aksi: 'spin', event: id});
  assert.equal(s.targetRoda, s.hadiah.id);
  const p = m.pemenangPublik().pemenang;
  assert.equal(p.length, 1); assert.equal(p[0].nama, 'Ani L.'); assert.equal(p[0].hadiah, 'HP Android'); assert.ok(!JSON.stringify(p).includes('@'));
  // tanpa hadiah → roda nama (lingkaran tetap ada)
  m.admin({token, aksi: 'spin-atur', hadiah: []});
  const tb = m.masuk({perangkat: 'dev-pub-bbbbbbbbbbbb', email: 'budi@mail.com'}, '1.1.1.2').token;
  m.tap({token: tb, n: 5, seq: 1, e: id});
  const s2 = m.admin({token, aksi: 'spin', event: id});
  assert.ok(s2.rodaPutar.length >= 1); assert.equal(s2.targetRoda, s2.pemenang.nomor); assert.ok(s2.rodaPutar.some((x) => x.id === s2.pemenang.nomor));
});

test('mode uji: target tap sendiri & durasi animasi jurus tervalidasi', () => {
  const {app, m} = siapkanMonster('5000,15000,40000');
  const token = app.post({aksi: 'admin-login', sandi: app.sheets.Admin.rows[1][1]}).token;
  const u = m.admin({token, aksi: 'uji-mulai', menit: 3, target: '30, 60'}).uji;
  assert.equal(u.target, '30,60');
  const s = m.lihat(u.kode);
  assert.deepEqual(s.target, [30, 60], 'event uji memakai target tap uji'); assert.equal(s.levelMaks, 2);
  assert.deepEqual(m.lihat().target, [5000, 15000, 40000], 'event asli tetap memakai target pengaturan');
  assert.equal(s.jurusAnimMs, 1600);
  const simpan = (nilai) => app.post({aksi: 'admin-simpan-pengaturan', token, nilai});
  assert.deepEqual(simpan({monster_jurus_anim: '9'}).kunci, ['monster_jurus_anim']);
  assert.equal(simpan({monster_jurus_anim: '2,5'}).ok, true);
  app.cache.remove('cfg'); m.segarkan();
  assert.equal(m.lihat(u.kode).jurusAnimMs, 2500);
});
