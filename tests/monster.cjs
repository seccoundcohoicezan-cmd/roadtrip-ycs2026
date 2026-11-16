// Uji Lawan Monster: aturan level, jadwal (jam server), validasi admin di Apps Script, dan skrip Lua atomik.
// Bagian Lua butuh paket fengari (NODE_PATH); bila tidak ada, bagian itu dilewati.
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../api/_monster.js');
const {muat} = require('./_mock-gas.cjs');
const T = (s) => Date.parse(s);
const fakeMod = require('./_fake-upstash.cjs');
const fake = fakeMod.tersedia ? fakeMod : null;

test('aturan: daftar target, rumus, poin & skala per level', () => {
  assert.deepEqual(M.aturan({target: '5000,15000,40000'}), {target: [5000, 15000, 40000], poin: [1, 2, 3], skala: [1, 1.3, 1.6], interval: 1000, batasTap: 10});
  const r = M.aturan({target: '', level: '4', targetDasar: '5000', targetKali: '2.8'});
  assert.deepEqual(r.target, [5000, 14000, 39200, 109800]);
  assert.deepEqual(M.aturan({target: '10,20', poin: '5'}).poin, [5, 2]);
  assert.equal(M.aturan({target: '1,1,1,1,1,1,1,1,1,1', skalaNaik: '1'}).skala[9], 2.5, 'skala maksimal 2,5x');
  assert.equal(M.aturan({interval: '50'}).interval, 500, 'interval dibatasi minimal 500 ms');
});

test('jadwal: sebelum_live, jadwal, manual, darurat STOP', () => {
  const live = [{judul: 'A', mulai: '2026-11-20T19:00:00+07:00', selesai: '2026-11-20T20:00:00+07:00', link: 'https://x'}];
  const cfg = (m) => ({monster: {aktif: true, menit: '20', durasi: '20', ...m}, live});
  const c = cfg({pemicu: 'sebelum_live'});
  assert.equal(M.jadwal(c, T('2026-11-19T12:00:00+07:00')).fase, 'tidak_ada', 'lebih dari 24 jam sebelumnya');
  assert.equal(M.jadwal(c, T('2026-11-20T18:39:59+07:00')).fase, 'tunggu');
  const j = M.jadwal(c, T('2026-11-20T18:40:00+07:00'));
  assert.equal(j.fase, 'aktif'); assert.equal(j.mulai, T('2026-11-20T18:40:00+07:00')); assert.equal(j.selesai, T('2026-11-20T19:00:00+07:00'));
  assert.equal(M.jadwal(c, T('2026-11-20T19:14:59+07:00')).fase, 'aktif', 'hasil masih tampil 15 menit');
  assert.equal(M.jadwal(c, T('2026-11-20T19:15:00+07:00')).fase, 'tidak_ada');
  assert.equal(M.jadwal({...c, monster: {...c.monster, aktif: false}}, T('2026-11-20T18:50:00+07:00')).fase, 'mati');
  assert.equal(M.jadwal({...c, monster: {...c.monster, darurat: 'STOP'}}, T('2026-11-20T18:50:00+07:00')).dihentikan, true);
  const jw = M.jadwal(cfg({pemicu: 'jadwal', waktu: '2026-11-21T10:00:00+07:00'}), T('2026-11-21T10:05:00+07:00'));
  assert.equal(jw.fase, 'aktif'); assert.equal(jw.selesai - jw.mulai, 20 * 60000); assert.ok(jw.id.startsWith('j'));
  const now = T('2026-11-21T10:00:00+07:00');
  const mn = M.jadwal(cfg({pemicu: 'sebelum_live', darurat: 'MULAI', mulaiManual: now - 1000}), now);
  assert.equal(mn.fase, 'aktif'); assert.ok(mn.id.startsWith('m'), 'Mulai sekarang mengalahkan pemicu lain');
  assert.equal(M.jadwal(cfg({pemicu: 'manual'}), now).fase, 'tidak_ada');
});

test('Apps Script: pengaturan monster divalidasi, Mulai sekarang mencatat jam server, config publik memuat monster', () => {
  const jam = {now: T('2026-11-20T10:00:00+07:00')};
  const app = muat(jam);
  app.get('siapkan');
  const sandi = app.sheets.Admin.rows[1][1];
  const token = app.post({aksi: 'admin-login', sandi}).token;
  const simpan = (nilai) => app.post({aksi: 'admin-simpan-pengaturan', token, nilai});
  assert.equal(app.get('config').monster.aktif, false, 'default mati');
  assert.deepEqual(simpan({monster_target: '5000,abc'}).kunci, ['monster_target']);
  assert.deepEqual(simpan({monster_pemicu: 'kapan-saja'}).kunci, ['monster_pemicu']);
  assert.deepEqual(simpan({monster_interval_ms: '10'}).kunci, ['monster_interval_ms']);
  assert.equal(simpan({monster_aktif: 'YA', monster_target: '100; 200 300', monster_darurat: 'mulai'}).ok, true);
  const m = app.get('config').monster;
  assert.equal(m.aktif, true); assert.equal(m.target, '100,200,300'); assert.equal(m.darurat, 'MULAI');
  assert.equal(m.mulaiManual, jam.now, 'mulai manual = jam server saat tombol ditekan');
});

test('Lua: batas tap, duplikat seq, naik level, kalah, konkurensi', {skip: !fake && 'fengari tidak tersedia'}, () => {
  fake.jalankan(['FLUSHALL']);
  const k = M.kunci('uji');
  const now = 1_800_000_000_000;
  const tap = (pid, n, seq, t = now) => fake.jalankan(['EVAL', M.LUA_TAP, 4, k.e, k.u, k.r(pid), k.a, t, pid, n, '50,100', '1,2', 10, 30, 3600, seq, now + 1e6]);
  assert.deepEqual(tap('a', 100, 1).slice(0, 4), [30, 1, 30, 30], 'burst 30');
  assert.equal(tap('a', 5, 1)[8], 1, 'seq sama = duplikat');
  assert.equal(tap('a', 5, 1)[0], 0);
  assert.equal(tap('a', 30, 2, now + 500)[0], 5, 'isi ulang 10 tap/detik');
  const naik = tap('b', 20, 1);
  assert.equal(naik[1], 2, 'naik ke level 2 saat target 50 tercapai'); assert.equal(naik[2], 0);
  const r = tap('c', 30, 1);
  assert.deepEqual([r[0], r[2], r[3]], [30, 60, 115], 'level 2: 2 poin per tap');
  const menang = tap('d', 30, 1);
  assert.ok(menang[4] > 0, 'kalah tercatat'); assert.equal(menang[2], 100);
  assert.equal(tap('e', 10, 1)[0], 0, 'tap setelah kalah tidak dihitung');
  assert.equal(fake.jalankan(['EVAL', M.LUA_LIHAT, 2, k.e, k.a, now])[5], 5, 'pemain aktif');
  // akhir jendela: tap setelah selesai tidak dihitung
  fake.jalankan(['FLUSHALL']);
  assert.equal(fake.jalankan(['EVAL', M.LUA_TAP, 4, k.e, k.u, k.r('z'), k.a, now, 'z', 5, '50', '1', 10, 30, 3600, 1, now - 1])[0], 0);
});
