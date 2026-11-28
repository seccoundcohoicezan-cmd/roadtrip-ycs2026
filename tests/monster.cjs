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

test('kode undian unik lintas event: tidak mulai lagi dari #0001, lanjut dari Sheet walau state di-reset', () => {
  const {jam, app, m} = siapkanMonster('1000000');
  const ta = m.masuk({perangkat: 'dev-aaaaaaaaaaaaaaaa', email: 'ani@mail.com'}, '1.1.1.1').token;
  const tb = m.masuk({perangkat: 'dev-bbbbbbbbbbbbbbbb', email: 'budi@mail.com'}, '1.1.1.1').token;
  const tc = m.masuk({perangkat: 'dev-cccccccccccccccc', email: 'cici@mail.com'}, '2.2.2.2').token;
  const mulaiEvent = () => {
    app.sheets.Pengaturan.rows.find((x) => x[0] === 'monster_mulai_manual')[1] = String(jam.now - 1000);
    app.cache.remove('cfg'); m.segarkan(); jam.now += 1100;
    return m.lihat().id;
  };
  const id1 = m.lihat().id;
  assert.equal(m.tap({token: ta, n: 5, seq: 1, e: id1}).tiket, '#0001');
  assert.equal(m.tap({token: tb, n: 5, seq: 1, e: id1}).tiket, '#0002');
  jam.now += 60 * 60000; // event 1 selesai
  m.lihat();
  const id2 = mulaiEvent();
  assert.notEqual(id2, id1);
  assert.equal(m.tap({token: tc, n: 5, seq: 1, e: id2}).tiket, '#0003', 'peserta lain di event berikutnya tidak mendapat #0001 lagi');
  assert.equal(m.tap({token: ta, n: 5, seq: 1, e: id2}).tiket, '#0004', 'peserta yang sama dapat kode baru, bukan #0001 lagi');
  // server pindah / state event hilang: kode tetap lanjut dari tab "Tiket Monster"
  jam.now += 60 * 60000; m.lihat();
  const m2 = buatMonster(app, {now: () => jam.now, rahasia: 'r'.repeat(40), state: {perangkat: m.state.perangkat, email: m.state.email}});
  app.sheets.Pengaturan.rows.find((x) => x[0] === 'monster_mulai_manual')[1] = String(jam.now - 1000);
  app.cache.remove('cfg'); jam.now += 1100;
  const id3 = m2.lihat().id;
  assert.equal(m2.tap({token: tb, n: 5, seq: 1, e: id3}).tiket, '#0005');
  const semua = app.sheets['Tiket Monster'].rows.slice(1).map((x) => x[2]);
  assert.equal(new Set(semua).size, semua.length, 'tidak ada kode kembar di Sheet: ' + semua);
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
  assert.equal(r.terima, 10); assert.equal(r.tiket, '#U0001', 'kode uji berawalan U, tidak bentrok dengan kode asli');
  assert.equal(m.tap({token: a.token, n: 10, seq: 2, e: s.id}).buang, true, 'tanpa kode uji tidak masuk event uji');
  assert.equal((app.sheets['Tiket Monster'] || {rows: [0]}).rows.length, 1, 'tiket uji tidak ditulis ke Sheet');
  const t = m.admin({token, aksi: 'tiket', event: s.id});
  assert.equal(t.tiket.length, 1); assert.equal(t.tiket[0].catatan, 'UJI');
  assert.equal(m.admin({token, aksi: 'spin', event: s.id}).error, 'bos_tidak_tumbang', 'event uji mengikuti skema asli');
  m.state.events[s.id].kalah = jam.now;
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
  // skema hadiah: event yang bosnya belum/tidak tumbang tidak bisa diundi (latihan tetap boleh)
  assert.equal(m.admin({token, aksi: 'spin', event: id}).error, 'bos_tidak_tumbang');
  m.state.events[id].kalah = jam.now; // anggap Raja Batu tumbang
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

test('jurus ke-3 = Hujan Meteor (area): semua karakter hidup kena kecuali yang memasang PERISAI', () => {
  const {jam, app, m} = siapkanMonster('100000');
  const kt = app.sheets['Satu Kata'];
  for (let i = 0; i < 20; i++) kt.rows.push(['2026-11-19', 'm' + i, 'maju', 'Bali', 'web', 'YA', 'Warga ' + i, 'SMA', 'm' + i + '@mail.com', 'Ya', 1]);
  app.sheets.Pengaturan.rows.find((x) => x[0] === 'monster_perisai')[1] = '0';
  app.cache.remove('cfg'); m.segarkan();
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9].map(m.jenisJurus), ['tusuk', 'tebas', 'meteor', 'hentak', 'tusuk', 'meteor', 'tebas', 'hentak', 'meteor']);
  const ta = m.masuk({perangkat: 'dev-meteor-aaaaaaaaa', email: 'ani@mail.com'}, '1.1.1.1').token;
  const tb = m.masuk({perangkat: 'dev-meteor-bbbbbbbbb', email: 'budi@mail.com'}, '1.1.1.2').token;
  let s = m.lihat();
  jam.now += 16000; s = m.lihat(); // dua jurus sasaran lewat
  assert.equal(s.jurusKe, 2); assert.equal(s.jurusJenis, 'meteor'); assert.equal(s.jurusTarget.length, 0, 'meteor tidak mengunci sasaran');
  assert.equal(m.saya({token: tb}).sasaran, true, 'semua yang hidup terancam meteor');
  const hpA = m.saya({token: ta}).hp, hpB = m.saya({token: tb}).hp, hidup = s.hidup;
  jam.now += 6500; const r = m.hindar({token: ta, e: s.id}); // PERISAI saat peringatan
  assert.equal(r.aman, true); assert.equal(r.jenis, 'meteor');
  jam.now += 1600; s = m.lihat();
  assert.equal(s.jurusInfo.jenis, 'meteor'); assert.equal(s.jurusInfo.menghindar, 1);
  assert.equal(s.jurusInfo.pukulan, hidup - 1, 'semua karakter hidup kena kecuali yang berperisai');
  assert.equal(m.saya({token: ta}).hp, hpA, 'perisai menahan meteor'); assert.equal(m.saya({token: tb}).hp, hpB - 1, 'tanpa perisai −1 nyawa');
  assert.equal(s.jurusJenis, 'hentak');
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
  const tb = m.masuk({perangkat: 'dev-pub-bbbbbbbbbbbb', email: 'budi@mail.com'}, '1.1.1.2').token;
  m.tap({token: tb, n: 5, seq: 1, e: id});
  m.state.events[id].kalah = Date.now(); // Raja Batu tumbang → kode sah diundi
  m.admin({token, aksi: 'spin-atur', hadiah: [{nama: 'HP Android', stok: 1, bobot: 1}]});
  const s = m.admin({token, aksi: 'spin', event: id});
  assert.equal(s.targetRoda, s.hadiah.id);
  const p = m.pemenangPublik().pemenang;
  assert.equal(p.length, 1); assert.ok(['Ani L.', 'Budi S.'].includes(p[0].nama), p[0].nama); // dua tiket berbobot sama → pemenang acak assert.equal(p[0].hadiah, 'HP Android'); assert.ok(!JSON.stringify(p).includes('@'));
  // tanpa hadiah → roda nama (lingkaran tetap ada)
  m.admin({token, aksi: 'spin-atur', hadiah: []});
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

test('skema hadiah: kode dicadangkan saat ikut menyerang, hangus bila monster menang (tidak ikut spin)', () => {
  const {jam, app, m} = siapkanMonster('100000');
  app.sheets.Pengaturan.rows.find((x) => x[0] === 'monster_perisai')[1] = '0';
  app.cache.remove('cfg'); m.segarkan();
  const id = m.lihat().id;
  const ta = m.masuk({perangkat: 'dev-hangus-aaaaaaaaa', email: 'ani@mail.com'}, '1.1.1.1').token;
  m.tap({token: ta, n: 3, seq: 1, e: id});
  const baris = () => app.sheets['Tiket Monster'].rows.find((r) => r[1] === id);
  assert.equal(baris()[9], 'aktif', 'kode dicadangkan dengan status aktif selama event');
  jam.now += 8000 * 40; const s = m.lihat();
  assert.equal(s.fase, 'monster_menang');
  assert.match(baris()[9], /^hangus/, 'monster menang → kode hangus');
  const token = app.post({aksi: 'admin-login', sandi: app.sheets.Admin.rows[1][1]}).token;
  assert.equal(m.admin({token, aksi: 'spin', event: id}).error, 'bos_tidak_tumbang');
});

test('undian 2 tahap: spin nama (wild card) → spin hadiah; peserta lolos (duta) TIDAK ikut undian; gambar hadiah', () => {
  const {app, m} = siapkanMonster('100000');
  const token = app.post({aksi: 'admin-login', sandi: app.sheets.Admin.rows[1][1]}).token;
  app.post({aksi: 'admin-impor', token, jenis: 'finalis', mode: 'ganti', baris: [['nama', 'sekolah', 'kota', 'provinsi', 'jalur'], ['Ani Lestari', 'SMA 0', 'Denpasar', 'Bali', 'Seleksi Umum']]});
  app.post({aksi: 'admin-impor', token, jenis: 'kode', mode: 'ganti', baris: [['email', 'nama'], ['fajar@mail.com', 'Fajar Nugroho'], ['gita@mail.com', 'Gita Ayu'], ['hadi@mail.com', 'Hadi W']]});
  const adm = (d) => m.admin({token, ...d});
  assert.equal(adm({aksi: 'peserta', sumber: 'lolos'}).sumber, 'tiket', 'sumber "lolos" tidak tersedia untuk undian');
  assert.equal(adm({aksi: 'peserta', sumber: 'wildcard'}).peserta.length, 3);
  assert.equal(adm({aksi: 'spin-hadiah'}).error, 'putar_nama_dulu');
  adm({aksi: 'spin-atur', hadiah: [{nama: 'HP Android', stok: 1, bobot: 1}, {nama: 'Tumbler', stok: '', bobot: 3}]});
  const hid = adm({aksi: 'spin-info'}).hadiah[0].id;
  const gb = 'data:image/webp;base64,' + Buffer.from('gambar').toString('base64');
  assert.equal(adm({aksi: 'hadiah-gambar', id: hid, gambar: gb}).hadiah[0].gambar, gb);
  assert.equal(adm({aksi: 'hadiah-gambar', id: hid, gambar: 'javascript:alert(1)'}).error, 'gambar_tidak_valid');
  adm({aksi: 'spin-atur', hadiah: adm({aksi: 'spin-info'}).hadiah});
  assert.equal(adm({aksi: 'spin-info'}).hadiah[0].gambar, gb);
  const l1 = adm({aksi: 'spin-nama', sumber: 'wildcard', latihan: true}); assert.equal(l1.ok, true);
  assert.ok(l1.rodaPutar.some((x) => x.id === l1.targetRoda));
  assert.equal(adm({aksi: 'spin-hadiah'}).latihan, true);
  assert.equal(adm({aksi: 'peserta', sumber: 'wildcard'}).hasil.length, 0);
  const menang = new Set();
  for (let i = 0; i < 3; i++) {
    assert.equal(adm({aksi: 'spin-nama', sumber: 'wildcard'}).ok, true);
    const h = adm({aksi: 'spin-hadiah'}); assert.equal(h.ok, true); assert.equal(h.ke, i + 1);
    menang.add(h.pemenang.id);
  }
  assert.equal(menang.size, 3);
  assert.equal(adm({aksi: 'spin-nama', sumber: 'wildcard'}).error, 'tidak_ada_peserta');
  assert.ok(adm({aksi: 'spin-info'}).hadiah.find((x) => x.nama === 'HP Android').terpakai <= 1);
  assert.equal(app.sheets['Hasil Undian'].rows.length, 4);
  assert.ok(m.pemenangPublik().pemenang.length >= 3);
  // tiket Lawan Monster milik peserta lolos (Ani Lestari, SMA 0) tidak masuk undian
  const id = m.lihat().id;
  const ta = m.masuk({perangkat: 'dev-duta-aaaaaaaaaaa', email: 'ani@mail.com'}, '1.1.1.1').token; m.tap({token: ta, n: 5, seq: 1, e: id});
  const tb = m.masuk({perangkat: 'dev-duta-bbbbbbbbbbb', email: 'budi@mail.com'}, '1.1.1.2').token; m.tap({token: tb, n: 5, seq: 1, e: id});
  const ps = adm({aksi: 'peserta', sumber: 'tiket', event: id}).peserta;
  assert.ok(ps.length >= 1 && !ps.some((x) => x.nama === 'Ani Lestari'), 'duta dikecualikan dari tiket undian: ' + ps.map((x) => x.nama));
});

test('duta: link referral per peserta lolos, warga lewat link terhitung, finalis jadi warga plaza', () => {
  const {app} = siapkanMonster('100000');
  const token = app.post({aksi: 'admin-login', sandi: app.sheets.Admin.rows[1][1]}).token;
  app.post({aksi: 'admin-impor', token, jenis: 'finalis', mode: 'ganti', baris: [['nama', 'sekolah', 'kota', 'provinsi', 'jalur'], ['Dewi Sartika', 'SMAN 1', 'Semarang', 'Jawa Tengah', 'Seleksi Umum'], ['Eko Prasetyo', 'SMAN 2', 'Solo', 'Jawa Tengah', 'Seleksi Umum']]});
  const {buatDuta, kodeDuta} = require('../server/duta.cjs');
  const duta = buatDuta(() => app, {memoMs: 0});
  const kd = kodeDuta('Dewi Sartika', 'SMAN 1');
  assert.match(kd, /^duta-[0-9a-z]{6}$/);
  assert.equal(kodeDuta(' dewi  sartika ', 'sman 1'), kd, 'kode stabil (tidak peka spasi/huruf besar)');
  for (let i = 0; i < 3; i++) {
    const r = app.post({aksi: 'kata-kirim', kata: 'maju', karakter: 2, nama: 'Teman ' + i, sekolah: 'SMA X', email: 't' + i + '@mail.com', provinsi: 'Bali', channelClicked: true, consent: true, ref: kd, requestId: '0000000' + i + '-0000-4000-8000-000000000000'});
    assert.equal(r.ok, true, JSON.stringify(r));
  }
  const l = duta.lihat();
  assert.equal(l.totalDuta, 2); assert.equal(l.totalWarga, 3);
  assert.equal(l.duta[0].kode, kd); assert.equal(l.duta[0].warga, 3); assert.equal(l.duta[0].peringkat, 1);
  const d = duta.lihat(kd);
  assert.equal(d.duta.terbaru.length, 3); assert.equal(d.duta.terbaru[0].nama, 'Teman 2.'); assert.ok(!JSON.stringify(d).includes('@'), 'tanpa email');
  assert.equal(duta.lihat('duta-zzzzzz').error, 'tidak_ditemukan');
  // duta jadi warga plaza; kata awal "duta" lalu diganti tulisan sendiri (beragam)
  assert.ok(duta.orangPlaza().some((o) => o[0] === 'Dewi S.' && o[1] === 'duta'));
  assert.equal(duta.tulisKata({kode: kd, kata: 'Berani'}, 'ip1').kata, 'berani');
  assert.equal(duta.tulisKata({kode: kd, kata: 'dua kata'}, 'ip1').error, 'validation');
  assert.equal(duta.tulisKata({kode: 'duta-zzzzzz', kata: 'maju'}, 'ip1').error, 'tidak_ditemukan');
  assert.ok(duta.orangPlaza().some((o) => o[0] === 'Dewi S.' && o[1] === 'berani'), 'kata duta tampil di plaza');
  assert.equal(duta.lihat(kd).duta.kata, 'berani');
  for (let i = 0; i < 9; i++) duta.tulisKata({kode: kd, kata: 'maju'}, 'ip' + i);
  assert.equal(duta.tulisKata({kode: kd, kata: 'hebat'}, 'ipz').error, 'terlalu_banyak', 'maks 10 ganti kata per hari');
  assert.equal(app.get('kata').total, 6, 'duta tidak menambah hitungan kata (3 warga awal + 3 ajakan)');
});

test('impor ulang finalis tidak menggandakan data; data tersimpan bisa dilihat & duplikat lama dirapikan', () => {
  const {app, m} = siapkanMonster('100000');
  const token = app.post({aksi: 'admin-login', sandi: app.sheets.Admin.rows[1][1]}).token;
  const baris = [['nama', 'sekolah', 'kota', 'provinsi', 'jalur'], ...Array.from({length: 150}, (_, i) => ['Siswa ' + i, 'SMA ' + i, 'Kota', 'Jateng', 'Seleksi Umum'])];
  assert.equal(app.post({aksi: 'admin-impor', token, jenis: 'finalis', mode: 'ganti', baris}).jumlah, 150);
  const dua = app.post({aksi: 'admin-impor', token, jenis: 'finalis', mode: 'tambah', baris});
  assert.equal(dua.jumlah, 0); assert.equal(dua.dilewati, 150, 'file yang sama diimpor lagi → semua dilewati');
  const adm = (d) => m.admin({token, ...d});
  // data lama yang sudah terlanjur ganda (impor dua kali sebelum perbaikan)
  app.sheets.Finalis.rows.push(...app.sheets.Finalis.rows.slice(1, 151).map((r) => r.slice()));
  let d = adm({aksi: 'data-lihat', jenis: 'finalis'});
  assert.equal(d.total, 300); assert.equal(d.unik, 150); assert.equal(d.duplikat, 150);
  d = adm({aksi: 'data-rapikan', jenis: 'finalis'});
  assert.equal(d.dihapus, 150); assert.equal(d.total, 150); assert.equal(d.duplikat, 0);
  assert.equal(adm({aksi: 'data-lihat', jenis: 'kode'}).total, 0);
});

test('top kontributor dapat hadiah otomatis saat event selesai; peringkat & hadiah tampil di "saya"; misi bisa diatur admin', () => {
  const {jam, app, m} = siapkanMonster('100000');
  const token = app.post({aksi: 'admin-login', sandi: app.sheets.Admin.rows[1][1]}).token;
  const id = m.lihat().id;
  const ta = m.masuk({perangkat: 'dev-top-aaaaaaaaaaaa', email: 'ani@mail.com'}, '1.1.1.1').token;
  const tb = m.masuk({perangkat: 'dev-top-bbbbbbbbbbbb', email: 'budi@mail.com'}, '1.1.1.2').token;
  const tc = m.masuk({perangkat: 'dev-top-cccccccccccc', email: 'cici@mail.com'}, '1.1.1.3').token;
  m.tap({token: tb, n: 9, seq: 1, e: id}); m.tap({token: ta, n: 5, seq: 1, e: id}); m.tap({token: tc, n: 2, seq: 1, e: id});
  assert.equal(m.saya({token: ta}).peringkat, 2);
  jam.now += 25 * 60000; // event berakhir (bos kabur)
  const s = m.lihat();
  assert.notEqual(s.fase, 'tanding');
  assert.deepEqual(s.top.map((x) => [x.peringkat, x.nama, x.nominal]), [[1, 'Budi S.', 100000], [2, 'Ani L.', 50000], [3, 'Cici A.', 50000]], 'syarat "selalu": tetap dapat hadiah walau bos tidak tumbang');
  const sa = m.saya({token: ta, e: id});
  assert.equal(sa.peringkat, 2); assert.deepEqual(sa.top, {peringkat: 2, nominal: 50000}); assert.equal(sa.pemain, 3);
  const sh = app.sheets['Top Kontributor'];
  assert.equal(sh.rows.length, 4); assert.equal(sh.rows[1][3], 'Budi Santoso'); assert.equal(sh.rows[1][8], 100000); assert.equal(sh.rows[1][6], 'budi@mail.com');
  const ti = m.admin({token, aksi: 'top-info', event: id});
  assert.equal(ti.top.length, 3); assert.equal(ti.top[0].kunci, 'budi@mail.com');
  // misi
  assert.equal(m.misiPublik().misi.length, 5);
  assert.equal(m.admin({token, aksi: 'misi-atur', misi: [{judul: 'Follow IG YCS', jenis: 'link', link: 'javascript:x'}]}).error, 'link_tidak_valid');
  const mi = m.admin({token, aksi: 'misi-atur', misi: [{judul: 'Follow IG YCS', sub: '@ycs', jenis: 'link', link: 'https://instagram.com/x'}, {id: 'latihan', jenis: 'latihan', judul: 'Latihan dulu'}]});
  assert.equal(mi.misi.length, 2); assert.equal(m.misiPublik().misi[0].judul, 'Follow IG YCS');
});

test('misi harian: reset 00.00 WIB, hadiah bergilir Racun → Petir → Gempa, potion menambah tenaga di server', () => {
  const {m, jam} = siapkanMonster('5000,9000');
  const GILIR = ['racun', 'petir', 'gempa'], hariKe = (t) => Math.floor((t + 7 * 3600e3) / 86400e3);
  const tok = m.masuk({perangkat: 'dev-potion-aaaaaaaaa', email: 'cici@mail.com'}, '1.1.1.9').token;
  const LIMA = ['gabung', 'wa', 'latihan', 'ingat', 'bagi'];
  // misi belum lengkap → belum ada potion; id misi asing diabaikan
  let r = m.klaimMisi({token: tok, misi: ['gabung', 'wa', 'palsu', 'latihan']});
  assert.equal(r.bekal.misi, 3); assert.equal(r.hadiah, null); assert.deepEqual(r.bekal.sisa, {racun: 0, gempa: 0, petir: 0});
  const hariIni = GILIR[hariKe(jam.now) % 3];
  assert.deepEqual(r.bekal.hadiahHari, [hariIni]); assert.deepEqual(r.bekal.besok, [GILIR[(hariKe(jam.now) + 1) % 3]]);
  r = m.klaimMisi({token: tok, misi: LIMA});
  assert.deepEqual(r.hadiah, [hariIni]); assert.equal(r.bekal.sisa[hariIni], 1); assert.equal(r.bekal.sudahDapat, true);
  assert.equal(Object.values(r.bekal.sisa).reduce((a, b) => a + b), 1, 'mode gilir = 1 potion per hari');
  assert.equal(m.klaimMisi({token: tok, misi: LIMA}).hadiah, null, 'hadiah sekali per hari');
  // besok: misi kosong lagi, hadiah jenis berikutnya; potion kemarin tetap ada
  jam.now += 86400e3;
  r = m.klaimMisi({token: tok, misi: []});
  assert.equal(r.bekal.misi, 0); assert.equal(r.bekal.sudahDapat, false); assert.equal(r.bekal.sisa[hariIni], 1);
  const besok = GILIR[hariKe(jam.now) % 3];
  r = m.klaimMisi({token: tok, misi: LIMA});
  assert.deepEqual(r.hadiah, [besok]); assert.notEqual(besok, hariIni); assert.equal(r.bekal.sisa[besok], 1);
  // pakai potion di event (event manual 20 menit → mulai ulang event untuk hari berikutnya)
  const id = m.lihat().id;
  if (id) {
    const pts = {racun: 50, gempa: 150, petir: 200};
    const p1 = m.pakaiPotion({token: tok, jenis: besok, rid: 'rid-00000002', e: id});
    if (p1.ok) { assert.equal(p1.pts, pts[besok]); assert.equal(p1.bekal.sisa[besok], 0); assert.equal(m.pakaiPotion({token: tok, jenis: besok, rid: 'rid-00000002', e: id}).dup, true); }
  }
  assert.equal(m.pakaiPotion({token: tok, jenis: 'api', rid: 'rid-00000006', e: id}).error, 'validation');
  assert.equal(m.pakaiPotion({token: 'x.y', jenis: 'racun', rid: 'rid-00000007', e: id}).error, 'sesi_habis');
});

test('misi harian: admin bisa set hadiah tetap atau semua; potion dipakai saat event', () => {
  const {m, app} = siapkanMonster('5000,9000');
  const peng = app.sheets.Pengaturan.rows, atur = (k, v) => { peng.find((x) => x[0] === k)[1] = v; app.cache.remove('cfg'); m.segarkan(); };
  const LIMA = ['gabung', 'wa', 'latihan', 'ingat', 'bagi'];
  atur('monster_hadiah_misi', 'petir');
  const a = m.masuk({perangkat: 'dev-potion-bbbbbbbbb', email: 'budi@mail.com'}, '1.1.1.8').token;
  assert.deepEqual(m.klaimMisi({token: a, misi: LIMA}).hadiah, ['petir']);
  const id = m.lihat().id;
  const p = m.pakaiPotion({token: a, jenis: 'petir', rid: 'rid-00000011', e: id});
  assert.equal(p.ok, true); assert.equal(p.pts, 200); assert.equal(p.saya, 200);
  assert.equal(m.pakaiPotion({token: a, jenis: 'petir', rid: 'rid-00000012', e: id}).error, 'potion_habis');
  assert.equal(m.pakaiPotion({token: a, jenis: 'racun', rid: 'rid-00000013', e: 'event-lain'}).error, 'bukan_waktunya');
  atur('monster_hadiah_misi', 'semua');
  const b = m.masuk({perangkat: 'dev-potion-ccccccccc', email: 'ani@mail.com'}, '1.1.1.7').token;
  const r = m.klaimMisi({token: b, misi: LIMA});
  assert.deepEqual(r.hadiah, ['racun', 'gempa', 'petir']); assert.deepEqual(r.bekal.sisa, {racun: 1, gempa: 1, petir: 1});
  assert.equal(m.misiLobi().hadiah.mode, 'semua');
});

test('Apps Script: monster_hadiah_misi divalidasi', () => {
  const app = muat({now: T('2026-11-20T10:00:00+07:00')}); app.get('siapkan');
  const token = app.post({aksi: 'admin-login', sandi: app.sheets.Admin.rows[1][1]}).token;
  assert.equal(app.post({aksi: 'admin-simpan-pengaturan', token, nilai: {monster_hadiah_misi: 'Gempa'}}).ok, true);
  assert.equal(app.get('config').ok, true);
  assert.equal(app.post({aksi: 'admin-simpan-pengaturan', token, nilai: {monster_hadiah_misi: 'api'}}).error, 'nilai_tidak_valid');
});

test('klaim hadiah undian (MRKT-87): nomor WA dari admin divalidasi, pemenang tiket menyertakan event + kode + waktu, batas 48 jam', () => {
  const {jam, app, m} = siapkanMonster('100000');
  const token = app.post({aksi: 'admin-login', sandi: app.sheets.Admin.rows[1][1]}).token;
  assert.equal(app.get('config').monster.klaimWa, '6287848775292', 'nomor bawaan');
  assert.deepEqual(app.post({aksi: 'admin-simpan-pengaturan', token, nilai: {monster_klaim_wa: '12ab'}}).kunci, ['monster_klaim_wa']);
  assert.equal(app.post({aksi: 'admin-simpan-pengaturan', token, nilai: {monster_klaim_wa: '0812-3456-7890'}}).ok, true);
  assert.equal(app.get('config').monster.klaimWa, '6281234567890', 'awalan 0 → 62');
  app.cache.remove('cfg'); m.segarkan();
  const id = m.lihat().id;
  assert.equal(m.lihat().klaimWa, '6281234567890'); assert.equal(m.lihat().klaimJam, 48);
  const ta = m.masuk({perangkat: 'dev-klm-aaaaaaaaaaaa', email: 'ani@mail.com'}, '1.1.1.1');
  m.tap({token: ta.token, n: 5, seq: 1, e: id});
  const kode = m.saya({token: ta.token, e: id}).tiket;
  m.state.events[id].kalah = jam.now;
  m.admin({token, aksi: 'spin-atur', hadiah: [{nama: 'HP 5G', stok: 1, bobot: 1}]});
  assert.equal(m.admin({token, aksi: 'spin-nama', sumber: 'tiket', event: id}).ok, true);
  assert.equal(m.admin({token, aksi: 'spin-hadiah'}).ok, true);
  const p = m.pemenangPublik();
  assert.equal(p.klaimJam, 48);
  assert.equal(p.pemenang.length, 1, 'pemenang tiket undian 2 tahap tidak digandakan');
  assert.deepEqual([p.pemenang[0].event, p.pemenang[0].tiket, p.pemenang[0].hadiah], [id, kode, 'HP 5G']);
  assert.equal(p.pemenang[0].t, Math.floor(jam.now / 60000) * 60000, 'waktu diundi (ms, presisi menit)');
});

test('papan peringkat: Top kontributor event terakhir tetap tampil di status lobi', () => {
  const {jam, m} = siapkanMonster('100000');
  const id = m.lihat().id;
  const ta = m.masuk({perangkat: 'dev-lb-aaaaaaaaaaaa', email: 'ani@mail.com'}, '1.1.1.1').token;
  const tb = m.masuk({perangkat: 'dev-lb-bbbbbbbbbbbb', email: 'budi@mail.com'}, '1.1.1.2').token;
  m.tap({token: tb, n: 9, seq: 1, e: id}); m.tap({token: ta, n: 5, seq: 1, e: id});
  assert.equal(m.lihat().juaraTop, undefined, 'belum ada juara selama event pertama');
  jam.now += 25 * 60000; m.lihat();
  jam.now += 24 * 3600e3; // jauh setelah event: hasil event sudah hilang dari status, juara tetap ada
  const s = m.lihat();
  assert.equal(s.top, undefined);
  assert.equal(s.juaraTop.event, id);
  assert.deepEqual(s.juaraTop.top.map((x) => [x.peringkat, x.nama]), [[1, 'Budi S.'], [2, 'Ani L.']]);
  assert.ok(!JSON.stringify(s.juaraTop).includes('@'));
});
