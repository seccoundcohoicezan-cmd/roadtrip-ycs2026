// Aturan level "Lawan Monster" — dipakai bersama oleh server (api/_monster.js) dan pratinjau panel admin.
// - target: daftar "5000,15000,40000" → jumlah level = panjang daftar. Kosong → rumus dasar × kali^(L-1), dibulatkan ke ratusan.
// - poin per tap: daftar opsional; kosong → poin = nomor level (L1 = 1, L2 = 2, ...).
// - skala monster: 1 + naik × (L-1), maksimal 2,5x.
(function (root, buat) {
  if (typeof module === 'object' && module.exports) module.exports = buat();
  else root.YCSMonsterAturan = buat();
})(typeof self !== 'undefined' ? self : this, function () {
  const angka = (v, d, min, maks) => { const n = Number(String(v ?? '').replace(',', '.')); return String(v ?? '').trim() !== '' && Number.isFinite(n) ? Math.min(maks, Math.max(min, n)) : d; };
  const daftar = (v) => String(v || '').split(/[;,\s]+/).map((x) => Number(x.replace(/\./g, ''))).filter((x) => Number.isFinite(x) && x > 0);

  function aturan(m) {
    m = m || {};
    let target = daftar(m.target).map(Math.round).slice(0, 10);
    if (!target.length) {
      const n = Math.round(angka(m.level, 3, 1, 10));
      const dasar = angka(m.targetDasar, 5000, 10, 1e9), kali = angka(m.targetKali, 2.8, 1, 20);
      target = Array.from({ length: n }, (_, i) => { const t = dasar * Math.pow(kali, i); return Math.max(10, t >= 1000 ? Math.round(t / 100) * 100 : Math.round(t)); });
    }
    const poinAdmin = daftar(m.poin).map(Math.round);
    const naik = angka(m.skalaNaik, 0.3, 0, 1);
    return {
      target,
      poin: target.map((_, i) => poinAdmin[i] || i + 1),
      skala: target.map((_, i) => Math.round(Math.min(2.5, 1 + naik * i) * 100) / 100),
      interval: Math.round(angka(m.interval, 1000, 500, 5000)),
      batasTap: angka(m.batasTap, 10, 3, 30),
    };
  }
  // Interval kirim tap menyesuaikan jumlah pemain aktif agar kuota fungsi Vercel & Redis tetap aman.
  function intervalUntuk(dasar, aktif) {
    const f = aktif < 300 ? 1 : aktif < 1000 ? 2 : aktif < 3000 ? 3 : 5;
    return Math.min(10000, dasar * f);
  }
  return { aturan, intervalUntuk };
});
