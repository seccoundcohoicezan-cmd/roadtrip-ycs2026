/* Potion (equipment) Lawan Raja Batu — data, ikon botol, dan efek kanvas saat dipakai ke Raja Batu.
   Dipakai monster.js (event asli, jumlah dari server) dan latihan.js (coba gratis 1x per potion).
   Racun = 50 tap, Gempa = 150 tap, Petir = 200 tap. Didapat dari Misi Pejuang: tiap 5 misi = 1 peti (1 potion tiap jenis). */
(() => {
  'use strict';
  const DATA = {
    racun: { nama: 'Racun', tap: 50, warna: '#3DDC4A', gelap: '#0E6B2A', teks: 'RACUN!', ket: 'Kabut racun menggerogoti' },
    gempa: { nama: 'Gempa', tap: 150, warna: '#FF9A3C', gelap: '#7A3B10', teks: 'GEMPA!', ket: 'Tanah terbelah di kaki bos' },
    petir: { nama: 'Petir', tap: 200, warna: '#FFE14D', gelap: '#4B2BB3', teks: 'PETIR!', ket: 'Sambaran petir dari langit' },
  };
  const URUT = ['racun', 'gempa', 'petir'];
  const SIMBOL = {
    racun: '<path d="M12 14.2c-1.6 0-2.8 1-2.8 2.4 0 .9.5 1.5 1.1 1.8v1h3.4v-1c.6-.3 1.1-.9 1.1-1.8 0-1.4-1.2-2.4-2.8-2.4Z" fill="#0b2a12"/><circle cx="10.9" cy="16.6" r=".6" fill="#3DDC4A"/><circle cx="13.1" cy="16.6" r=".6" fill="#3DDC4A"/>',
    gempa: '<path d="M7.5 19.5l2.2-3.2 1.4 1.3 1.6-2.8 1.3 1.9 2.5-2.2" fill="none" stroke="#3b1a06" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
    petir: '<path d="M12.8 12.5 9.6 17.2h2.2l-1 3.3 3.6-4.9h-2.3l1.2-3.1Z" fill="#2a1466"/>',
  };
  // Botol potion (SVG) dengan warna & simbol jenisnya.
  let nIkon = 0; // id gradien unik per ikon: id kembar membuat url(#..) menunjuk ke SVG lain yang mungkin tersembunyi
  function ikon(jenis) {
    const d = DATA[jenis], id = 'pg-' + jenis + '-' + (++nIkon);
    return `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".35" stop-color="${d.warna}"/><stop offset="1" stop-color="${d.gelap}"/></linearGradient></defs>`
      + '<rect x="10" y="2.5" width="4" height="2" rx=".6" fill="#8a5a2b"/><path d="M10.4 4.5h3.2v3.2c2.9 1 4.9 3.7 4.9 6.8a6.5 6.5 0 0 1-13 0c0-3.1 2-5.8 4.9-6.8Z" fill="url(#' + id + ')" stroke="#fff" stroke-opacity=".7" stroke-width=".8"/>'
      + '<ellipse cx="9.4" cy="11.6" rx="1" ry="1.8" fill="#fff" opacity=".55"/>' + SIMBOL[jenis] + '</svg>';
  }

  const LAMA = { racun: 2000, gempa: 1500, petir: 1300 };
  // Sambaran petir: titik zig-zag deterministik per sambaran.
  function jalurPetir(x0, y0, x1, y1, seed) {
    let a = seed * 9301 + 49297; const r = () => ((a = (a * 9301 + 49297) % 233280) / 233280);
    const n = 9, pts = [[x0, y0]];
    for (let i = 1; i < n; i++) { const k = i / n; pts.push([x0 + (x1 - x0) * k + (r() - 0.5) * 60, y0 + (y1 - y0) * k + (r() - 0.5) * 14]); }
    pts.push([x1, y1]); return pts;
  }
  function garis(ctx, pts, lebar, warna) { ctx.strokeStyle = warna; ctx.lineWidth = lebar; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }

  // Gambar efek. ef = {jenis, t0, seed}; sasaran = {x, kaki, tinggi}. Mengembalikan {getar, selesai, tint} untuk kamera/monster.
  function gambar(ctx, ef, t, sasaran, W, H, hemat) {
    const u = (t - ef.t0) / LAMA[ef.jenis];
    if (u >= 1) return { getar: 0, selesai: true };
    if (u < 0) return { getar: 0, selesai: false };
    const { x, kaki, tinggi } = sasaran, dada = kaki - tinggi * 0.55, kepala = kaki - tinggi * 0.85;
    let getar = 0, tint = null;
    ctx.save();
    if (ef.jenis === 'petir') {
      ctx.fillStyle = `rgba(20,10,60,${0.45 * Math.min(1, u / 0.1) * (u > 0.8 ? (1 - u) / 0.2 : 1)})`; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      [0.12, 0.3, 0.48].forEach((tt, i) => {
        const d = u - tt;
        if (d < 0 || d > 0.16) return;
        const k = 1 - d / 0.16, pts = jalurPetir(x + (i - 1) * W * 0.18, -10, x + (i - 1) * 12, kepala + tinggi * 0.1 * i, ef.seed + i);
        garis(ctx, pts, 14 * k, 'rgba(120,90,255,.5)'); garis(ctx, pts, 6 * k, 'rgba(255,240,140,.9)'); garis(ctx, pts, 2.2, `rgba(255,255,255,${k})`);
        if (d < 0.05) { ctx.fillStyle = `rgba(255,255,230,${0.55 * (1 - d / 0.05)})`; ctx.fillRect(0, 0, W, H); getar = Math.max(getar, 1); }
        const g = ctx.createRadialGradient(x, kepala, 0, x, kepala, tinggi * 0.6 * (1 + d * 3)); g.addColorStop(0, `rgba(255,255,200,${k})`); g.addColorStop(1, 'rgba(120,90,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, kepala, tinggi * 0.6 * (1 + d * 3), 0, 6.283); ctx.fill();
      });
      if (u > 0.15 && u < 0.85 && !hemat) { // bos kesetrum: busur listrik kecil di sekujur tubuh
        for (let i = 0; i < 4; i++) { const a = (t / 40 + i * 1.7) % 6.283, r1 = tinggi * 0.3; const pts = jalurPetir(x + Math.cos(a) * r1, dada + Math.sin(a) * r1 * 1.2, x + Math.cos(a + 1.2) * r1, dada + Math.sin(a + 1.2) * r1 * 1.2, Math.floor(t / 60) + i); garis(ctx, pts.slice(0, 5), 2, 'rgba(200,220,255,.85)'); }
        tint = 'rgba(160,170,255,.35)';
      }
    } else if (ef.jenis === 'gempa') {
      getar = u < 0.75 ? 1.6 * (1 - u / 0.75) + 0.3 : 0;
      // retakan menjalar dari kaki bos
      const panjang = Math.min(1, u / 0.35) * W * 0.55;
      ctx.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * (0.02 + 0.96 * i / 8) + Math.sin(ef.seed + i) * 0.1, pts = [[x, kaki]];
        let px = x, py = kaki;
        for (let s = 1; s <= 6; s++) { px += Math.cos(a) * panjang / 6 * (s % 2 ? 1.1 : 0.9); py += Math.sin(a) * panjang / 6 * 0.28 + Math.sin(ef.seed * 3 + i * 7 + s) * 4; pts.push([px, py]); }
        ctx.globalAlpha = u > 0.8 ? (1 - u) / 0.2 : 1;
        garis(ctx, pts, 7, 'rgba(40,18,6,.85)'); ctx.globalCompositeOperation = 'lighter'; garis(ctx, pts, 2.5, 'rgba(255,140,40,.9)'); ctx.globalCompositeOperation = 'source-over';
      }
      // gelombang kejut & batu terlempar
      ctx.globalAlpha = 1;
      [0, 0.15].forEach((td) => { const k = Math.max(0, Math.min(1, (u - td) / 0.5)); if (k <= 0 || k >= 1) return; ctx.strokeStyle = `rgba(255,190,110,${1 - k})`; ctx.lineWidth = 8 * (1 - k) + 1; ctx.beginPath(); ctx.ellipse(x, kaki, tinggi * (0.3 + 2.2 * k), tinggi * (0.08 + 0.5 * k), 0, 0, 6.283); ctx.stroke(); });
      const nBatu = hemat ? 8 : 22;
      for (let i = 0; i < nBatu; i++) {
        const a = -Math.PI * (0.1 + 0.8 * ((i * 0.37 + ef.seed * 0.01) % 1)), v = tinggi * (0.8 + ((i * 0.53) % 1) * 1.4), k = Math.min(1, u / 0.85);
        const bx = x + Math.cos(a) * v * k * 1.2, by = kaki + Math.sin(a) * v * k + tinggi * 2.2 * k * k, r = 3 + (i % 4) * 2.2;
        if (by > kaki + 30) continue;
        ctx.fillStyle = i % 3 ? '#6b4a2f' : '#8d6a48'; ctx.beginPath(); ctx.arc(bx, by, r, 0, 6.283); ctx.fill();
      }
      ctx.fillStyle = `rgba(180,150,110,${0.4 * (1 - u)})`; ctx.beginPath(); ctx.ellipse(x, kaki, tinggi * (0.6 + u), tinggi * 0.25, 0, 0, 6.283); ctx.fill();
      tint = u < 0.6 ? 'rgba(255,150,60,.25)' : null;
    } else { // racun: kabut hijau mendidih menyelimuti bos, gelembung naik, tetesan
      const muncul = Math.min(1, u / 0.15), hilang = u > 0.8 ? (1 - u) / 0.2 : 1, al = muncul * hilang;
      const n = hemat ? 10 : 26;
      for (let i = 0; i < n; i++) {
        const fase = (u * 1.6 + i / n) % 1, a = i * 2.39, r = tinggi * (0.25 + 0.35 * ((i * 0.61) % 1));
        const bx = x + Math.cos(a) * r, by = dada + Math.sin(a) * r * 0.9 - fase * tinggi * 0.5, br = tinggi * (0.08 + 0.1 * ((i * 0.29) % 1)) * (0.6 + fase);
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, br); g.addColorStop(0, `rgba(120,255,110,${0.55 * al * (1 - fase)})`); g.addColorStop(1, 'rgba(20,120,40,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, br, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = al;
      for (let i = 0; i < (hemat ? 4 : 10); i++) { // gelembung berkilau
        const fase = (u * 2.2 + i * 0.13) % 1, bx = x + Math.sin(i * 3.1) * tinggi * 0.35, by = kaki - fase * tinggi * 1.1;
        ctx.strokeStyle = 'rgba(200,255,190,.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(bx, by, 3 + (i % 3) * 2, 0, 6.283); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(60,220,80,.9)';
      for (let i = 0; i < 6; i++) { const fase = (u * 3 + i / 6) % 1, dx = x + (i - 2.5) * tinggi * 0.12; ctx.beginPath(); ctx.ellipse(dx, dada + fase * tinggi * 0.5, 2.5, 4, 0, 0, 6.283); ctx.fill(); }
      tint = `rgba(60,220,80,${0.35 * al})`;
    }
    ctx.restore();
    return { getar, selesai: false, tint };
  }
  // Waktu "kena" (ms sejak mulai) untuk suara & angka kerusakan — selaras dengan gambar() di atas.
  const KENA = { petir: [156, 390, 624], gempa: [0, 225], racun: [300, 700, 1100, 1500] };

  window.YCSPotion = { DATA, URUT, ikon, gambar, LAMA, KENA };
})();
