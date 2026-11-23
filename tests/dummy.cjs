// Warga pembuka (dummy): hanya tampilan, format sama dengan warga asli, tidak bocor penanda.
const test = require('node:test');
const assert = require('node:assert');
const {buatDummy} = require('../server/dummy.cjs');

test('dummy: gabung ke /api/kata tanpa penanda, warga asli tetap, plaza maks 2.000', () => {
  const st = {}; const d = buatDummy({state: () => st});
  const asli = Array.from({length: 300}, (_, i) => ['Asli' + i + ' A.', 'maju', 'Bali', 1]);
  assert.strictEqual(d.gabungKata({ok: true, total: 300, orang: asli, kata: [['maju', 300]]}, 300).total, 300); // nonaktif
  const r = d.admin({aksi: 'dummy-atur', aktif: true, jumlah: 2000, pejuang: 50, kurangi: false, kustom: 'Budi Santoso;semangat;Jawa Tengah'}, 300);
  assert.ok(r.ok); assert.strictEqual(r.tampil, 2000); assert.strictEqual(r.ramai, 1000);
  const g = d.gabungKata({ok: true, total: 300, orang: asli, kata: [['maju', 300]]}, 300);
  assert.strictEqual(g.total, 2300);
  assert.strictEqual(g.orang.length, 2000);
  assert.ok(asli.every((o) => g.orang.includes(o)), 'semua warga asli tetap tampil');
  assert.ok(g.orang.every((o) => o.length === 4));
  assert.ok(!JSON.stringify(g).toLowerCase().includes('dummy'));
  assert.ok(g.orang.some((o) => o[0] === 'Budi S.' && o[1] === 'semangat'));
});

test('dummy: mode kurangi & kustom tidak valid ditolak tanpa mengubah setelan', () => {
  const st = {}; const d = buatDummy({state: () => st});
  d.admin({aksi: 'dummy-atur', aktif: true, jumlah: 1000, pejuang: 40, kurangi: true}, 0);
  assert.strictEqual(d.jumlahTampil(250), 750);
  assert.strictEqual(d.jumlahTampil(1200), 0);
  const x = d.admin({aksi: 'dummy-atur', aktif: false, jumlah: 5, kustom: 'Andi;x'}, 0);
  assert.strictEqual(x.ok, false);
  assert.strictEqual(st.dummy.jumlah, 1000); assert.strictEqual(st.dummy.aktif, true);
  const y = d.admin({aksi: 'dummy-atur', aktif: true, jumlah: 10, kustom: 'Andi;kasar'}, 0, (k) => k === 'kasar');
  assert.deepStrictEqual(y.kata, ['kasar']);
});
