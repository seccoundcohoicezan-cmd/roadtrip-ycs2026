// Warga pembuka (dummy) + plaza bergilir 50.000 warga.
const test = require('node:test');
const assert = require('node:assert');
const {buatDummy} = require('../server/dummy.cjs');
const {buatPlaza} = require('../server/plaza.cjs');

const warga = (n, awalan = 'Asli') => Array.from({length: n}, (_, i) => [awalan + i + ' A.', 'maju', 'Bali', 1 + (i % 24)]);

test('dummy: tampil + hitungan kata, mode kurangi, kustom tidak valid ditolak', () => {
  const st = {}; const d = buatDummy({state: () => st});
  assert.deepStrictEqual(d.tampil(10), []);
  const r = d.admin({aksi: 'dummy-atur', aktif: true, jumlah: 2000, pejuang: 50, kurangi: false, kustom: 'Budi Santoso;semangat;Jawa Tengah'}, 300);
  assert.ok(r.ok); assert.strictEqual(r.tampil, 2000); assert.strictEqual(r.ramai, 1000);
  const dm = d.tampil(300);
  assert.strictEqual(dm.length, 2000);
  assert.ok(dm.every((o) => o.length === 4) && !JSON.stringify(dm).toLowerCase().includes('dummy'));
  assert.ok(dm.some((o) => o[0] === 'Budi S.' && o[1] === 'semangat'));
  const kata = d.hitungKata([['maju', 300]], dm);
  assert.ok(kata.find((x) => x[0] === 'maju')[1] >= 300);
  d.admin({aksi: 'dummy-atur', aktif: true, jumlah: 1000, pejuang: 40, kurangi: true}, 0);
  assert.strictEqual(d.jumlahTampil(250), 750);
  assert.strictEqual(d.jumlahTampil(1200), 0);
  const x = d.admin({aksi: 'dummy-atur', aktif: false, jumlah: 5, kustom: 'Andi;x'}, 0);
  assert.strictEqual(x.ok, false); assert.strictEqual(st.dummy.jumlah, 1000);
  const y = d.admin({aksi: 'dummy-atur', aktif: true, jumlah: 10, kustom: 'Andi;kasar'}, 0, (k) => k === 'kasar');
  assert.deepStrictEqual(y.kata, ['kasar']);
});

test('plaza: 50.000 warga → tampil 2.000 bergilir; duta & terbaru selalu ada; cari di seluruh warga', () => {
  let t = Date.UTC(2026, 11, 23, 10, 0);
  const p = buatPlaza({now: () => t});
  const asli = warga(50000), duta = warga(150, 'Duta'), dm = warga(2000, 'Pembuka');
  const t0 = performance.now();
  const s1 = p.sampel(duta, asli, dm);
  assert.ok(performance.now() - t0 < 1500, 'cepat');
  assert.strictEqual(s1.length, 2000);
  assert.ok(duta.every((o) => s1.includes(o)), 'duta selalu tampil');
  assert.ok(asli.slice(0, 400).every((o) => s1.includes(o)), '400 warga terbaru selalu tampil');
  t += 60000;
  const s2 = p.sampel(duta, asli, dm);
  const beda = s2.filter((o) => !s1.includes(o)).length;
  assert.ok(beda > 50 && beda <= 200, 'tiap menit sebagian warga berganti: ' + beda);
  const t1 = performance.now(); p.sampel(duta, asli, dm); assert.ok(performance.now() - t1 < 50, 'memo kolam');
  // dalam ±7 jam seluruh warga sempat tampil
  const pernah = new Set();
  for (let m = 0; m < 60 * 7; m += 1) { t += 60000; p.sampel(duta, asli, dm).forEach((o) => pernah.add(o)); }
  assert.ok(pernah.size >= 50000, 'semua warga bergilir tampil: ' + pernah.size);
  assert.deepStrictEqual(p.cari('asli49999', asli, duta, dm)[0], asli[49999]);
  assert.deepStrictEqual(p.cari('a'), []);
});
