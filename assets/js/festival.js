/* Festival YCS: setiap kiriman Satu Kata digambar sebagai satu warga kecil di plaza Bali.
   Dipakai beranda (#satu-kata) dan layar acara (/harapan/?display=1). Mengekspos window.YCSFestival. */
(() => {
  'use strict';
  const LATAR = { kecil: '/assets/img/festival/latar-900.webp', besar: '/assets/img/festival/latar-1600.webp' };
  const KULIT = ['#F2C9A0', '#E0AC7E', '#C68A5C', '#A8693F', '#8A5530'];
  const BAJU = ['#FFFFFF', '#FFFFFF', '#F4F1EA', '#0E5A66', '#C2410C', '#FFC93C', '#7C3AED', '#DC2626', '#15803D', '#2563EB', '#DB2777', '#F59E0B'];
  const BAWAH = ['#374151', '#1F2937', '#6B4F2A', '#7F1D1D', '#14532D', '#1E3A8A', '#9A3412'];
  const KEPALA = ['pendek', 'pendek', 'panjang', 'hijab', 'udeng', 'topi'];
  const WARNA_HIJAB = ['#F9FAFB', '#E11D48', '#0E7490', '#7C3AED', '#F59E0B', '#111827', '#DB2777'];
  const RAMBUT = ['#1F1A17', '#2B211C', '#3B2A20', '#111111'];

  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  const pilih = (arr, h, geser) => arr[(h >>> geser) % arr.length];

  // Ciri warga ditentukan dari nama + kata, jadi orang yang sama selalu tampil sama.
  function ciri(e) {
    const h = hash((e.n || '') + '|' + (e.k || ''));
    return {
      kulit: pilih(KULIT, h, 0), baju: pilih(BAJU, h, 3), bawah: pilih(BAWAH, h, 7), kepala: pilih(KEPALA, h, 11),
      hijab: pilih(WARNA_HIJAB, h, 14), rambut: pilih(RAMBUT, h, 17), sarung: ((h >>> 20) % 4) === 0, lambai: ((h >>> 23) % 5) === 0,
      fase: ((h >>> 9) % 628) / 100, lompat: ((h >>> 26) % 3) === 0,
    };
  }
  const kunciCiri = (c) => [c.kulit, c.baju, c.bawah, c.kepala, c.hijab, c.rambut, c.sarung, c.lambai].join();

  function rrect(x, ctx, a, b, w, h, r) {
    x.beginPath();
    if (x.roundRect) x.roundRect(a, b, w, h, r); else x.rect(a, b, w, h);
    ctx();
  }
  // Gambar satu warga berdiri menghadap depan; (0,0) = titik kaki tengah, tinggi H.
  function gambarOrang(x, H, c) {
    const kepalaR = H * 0.13, kepalaY = -H * 0.83;
    x.fillStyle = 'rgba(0,0,0,.18)';
    x.beginPath(); x.ellipse(0, 0, H * 0.2, H * 0.045, 0, 0, Math.PI * 2); x.fill();
    // kaki / sarung
    x.fillStyle = c.bawah;
    if (c.sarung) { x.beginPath(); x.moveTo(-H * 0.17, -H * 0.36); x.lineTo(H * 0.17, -H * 0.36); x.lineTo(H * 0.14, -H * 0.03); x.lineTo(-H * 0.14, -H * 0.03); x.closePath(); x.fill(); }
    else { x.fillRect(-H * 0.15, -H * 0.37, H * 0.12, H * 0.35); x.fillRect(H * 0.03, -H * 0.37, H * 0.12, H * 0.35); }
    x.fillStyle = '#2B2B2B';
    x.fillRect(-H * 0.16, -H * 0.04, H * 0.14, H * 0.04); x.fillRect(H * 0.02, -H * 0.04, H * 0.14, H * 0.04);
    // lengan
    x.fillStyle = c.baju;
    x.fillRect(-H * 0.27, -H * 0.66, H * 0.09, H * 0.3);
    if (c.lambai) { x.save(); x.translate(H * 0.22, -H * 0.64); x.rotate(-2.5); x.fillRect(-H * 0.045, 0, H * 0.09, H * 0.3); x.fillStyle = c.kulit; x.beginPath(); x.arc(0, H * 0.32, H * 0.05, 0, Math.PI * 2); x.fill(); x.restore(); }
    else x.fillRect(H * 0.18, -H * 0.66, H * 0.09, H * 0.3);
    x.fillStyle = c.kulit;
    x.beginPath(); x.arc(-H * 0.225, -H * 0.34, H * 0.05, 0, Math.PI * 2); x.fill();
    if (!c.lambai) { x.beginPath(); x.arc(H * 0.225, -H * 0.34, H * 0.05, 0, Math.PI * 2); x.fill(); }
    // badan
    x.fillStyle = c.baju;
    rrect(x, () => x.fill(), -H * 0.19, -H * 0.7, H * 0.38, H * 0.37, H * 0.08);
    if (c.baju === '#FFFFFF' || c.baju === '#F4F1EA') { x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = H * 0.02; rrect(x, () => x.stroke(), -H * 0.19, -H * 0.7, H * 0.38, H * 0.37, H * 0.08); }
    // kepala
    if (c.kepala === 'hijab') {
      x.fillStyle = c.hijab;
      x.beginPath(); x.arc(0, kepalaY, kepalaR * 1.3, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.moveTo(-kepalaR * 1.3, kepalaY); x.lineTo(kepalaR * 1.3, kepalaY); x.lineTo(H * 0.2, -H * 0.6); x.lineTo(-H * 0.2, -H * 0.6); x.closePath(); x.fill();
      x.fillStyle = c.kulit; x.beginPath(); x.ellipse(0, kepalaY + kepalaR * 0.12, kepalaR * 0.78, kepalaR * 0.88, 0, 0, Math.PI * 2); x.fill();
    } else {
      x.fillStyle = c.kulit; x.beginPath(); x.arc(0, kepalaY, kepalaR, 0, Math.PI * 2); x.fill();
      x.fillStyle = c.rambut;
      if (c.kepala === 'panjang') { x.beginPath(); x.arc(0, kepalaY - kepalaR * 0.1, kepalaR * 1.08, Math.PI, 0); x.fill(); x.fillRect(-kepalaR * 1.08, kepalaY - kepalaR * 0.1, kepalaR * 0.4, kepalaR * 1.6); x.fillRect(kepalaR * 0.68, kepalaY - kepalaR * 0.1, kepalaR * 0.4, kepalaR * 1.6); }
      else { x.beginPath(); x.arc(0, kepalaY - kepalaR * 0.15, kepalaR * 1.02, Math.PI * 1.05, Math.PI * 1.95); x.fill(); x.fillRect(-kepalaR, kepalaY - kepalaR * 0.55, kepalaR * 2, kepalaR * 0.45); }
      if (c.kepala === 'udeng') { x.fillStyle = c.hijab === '#111827' ? '#F9FAFB' : c.hijab; x.fillRect(-kepalaR * 1.05, kepalaY - kepalaR * 0.75, kepalaR * 2.1, kepalaR * 0.42); x.beginPath(); x.moveTo(0, kepalaY - kepalaR * 0.8); x.lineTo(kepalaR * 0.45, kepalaY - kepalaR * 1.35); x.lineTo(kepalaR * 0.55, kepalaY - kepalaR * 0.7); x.fill(); }
      if (c.kepala === 'topi') { x.fillStyle = c.baju === '#FFFFFF' ? '#0E5A66' : c.baju; x.beginPath(); x.arc(0, kepalaY - kepalaR * 0.3, kepalaR * 1.02, Math.PI, 0); x.fill(); x.fillRect(-kepalaR * 0.2, kepalaY - kepalaR * 0.42, kepalaR * 1.5, kepalaR * 0.25); }
    }
    // mata kecil (terlihat di barisan depan)
    x.fillStyle = '#1F1A17';
    x.beginPath(); x.arc(-kepalaR * 0.35, kepalaY + kepalaR * 0.15, kepalaR * 0.11, 0, Math.PI * 2); x.arc(kepalaR * 0.35, kepalaY + kepalaR * 0.15, kepalaR * 0.11, 0, Math.PI * 2); x.fill();
  }

  // Sprite per kombinasi ciri, digambar sekali lalu diskalakan (ringan untuk ribuan warga).
  const SPR_H = 96, SPR_W = 72;
  const cacheSprite = new Map();
  function sprite(c) {
    const k = kunciCiri(c);
    let s = cacheSprite.get(k);
    if (s) return s;
    s = document.createElement('canvas');
    s.width = SPR_W; s.height = SPR_H + 8;
    const x = s.getContext('2d');
    x.translate(SPR_W / 2, SPR_H + 2);
    gambarOrang(x, SPR_H * 0.98, c);
    cacheSprite.set(k, s);
    return s;
  }

  function YCSFestival(canvas, opsi = {}) {
    const ctx = canvas.getContext('2d');
    const gerakMinim = opsi.gerakMinim ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
    const latar = new Image();
    let siapLatar = false, W = 0, H = 0, dpr = 1, warga = [], slot = [], sorotan = null, sorotSampai = 0, raf = 0, terlihat = true, tAkhir = 0;
    latar.onload = () => { siapLatar = true; gambar(performance.now()); };
    latar.src = (canvas.clientWidth > 700 ? LATAR.besar : LATAR.kecil);

    function ukur() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = w; H = h;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      tata();
      gambar(performance.now());
    }

    // Slot berdiri di plaza dengan perspektif: belakang kecil, depan besar. Ukuran disesuaikan jumlah warga.
    function tata() {
      const n = warga.length;
      const y0 = H * 0.47, y1 = H * 0.985;
      let b = Math.min(H * 0.2, W * 0.09);
      let hasil = [];
      for (let iter = 0; iter < 40; iter++) {
        hasil = [];
        let y = y0, baris = 0;
        while (y < y1) {
          const d = (y - y0) / (y1 - y0);
          const s = 0.42 + 0.7 * d;
          const jarak = b * s * 0.46;
          const muat = Math.max(1, Math.floor(W / jarak));
          const geser = (baris % 2) * 0.5;
          for (let j = 0; j < muat; j++) {
            const jit = ((hash(baris + ':' + j) % 100) / 100 - 0.5) * 0.35;
            hasil.push({ x: (j + 0.5 + geser * 0.5 + jit) * (W / muat), y: y + jit * b * s * 0.08, h: b * s, d });
          }
          y += b * s * 0.24;
          baris++;
        }
        if (hasil.length >= n || b < H * 0.045) break;
        b *= 0.9;
      }
      // Warga terbaru menempati barisan depan-tengah lebih dulu.
      hasil.forEach((p) => { p.prior = (1 - p.d) * 1.6 + Math.abs(p.x / W - 0.5); });
      hasil.sort((a, c) => a.prior - c.prior);
      slot = hasil;
      warga.forEach((w, i) => { w.pos = slot[i] || null; });
    }

    function gambarLatar() {
      const tinggiLatar = H * 0.5;
      if (siapLatar) {
        const r = Math.max(W / latar.width, tinggiLatar / latar.height);
        const lw = latar.width * r, lh = latar.height * r;
        ctx.drawImage(latar, (W - lw) / 2, tinggiLatar - lh, lw, lh);
      } else {
        const g = ctx.createLinearGradient(0, 0, 0, tinggiLatar);
        g.addColorStop(0, '#5BB8F0'); g.addColorStop(1, '#BFE6F7');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, tinggiLatar);
      }
      // Plaza batu hangat dengan garis perspektif.
      const g = ctx.createLinearGradient(0, H * 0.44, 0, H);
      g.addColorStop(0, 'rgba(214,196,160,0)'); g.addColorStop(0.08, '#D9C7A2'); g.addColorStop(1, '#C9B184');
      ctx.fillStyle = g; ctx.fillRect(0, H * 0.44, W, H * 0.56);
      ctx.strokeStyle = 'rgba(120,95,60,.12)'; ctx.lineWidth = 1;
      for (let i = -8; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * W * 0.02, H * 0.47); ctx.lineTo(W / 2 + i * W * 0.16, H); ctx.stroke(); }
      for (let k = 1; k < 9; k++) { const yy = H * 0.47 + (H * 0.53) * Math.pow(k / 9, 1.6); ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke(); }
    }

    function gambar(t) {
      if (!W) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      gambarLatar();
      const detik = t / 1000;
      const urut = warga.filter((w) => w.pos).sort((a, c) => a.pos.y - c.pos.y);
      for (const w of urut) {
        const p = w.pos, c = w.c;
        let naik = 0;
        if (!gerakMinim) {
          naik = c.lompat ? Math.abs(Math.sin(detik * 2.6 + c.fase)) * p.h * 0.06 : Math.sin(detik * 1.6 + c.fase) * p.h * 0.012;
        }
        const sp = sprite(c);
        const sh = p.h * (SPR_H + 8) / SPR_H, sw = sh * SPR_W / (SPR_H + 8);
        ctx.drawImage(sp, p.x - sw / 2, p.y - sh + p.h * 0.06 - naik, sw, sh);
        w.layar = { x: p.x, y: p.y - p.h - naik, h: p.h };
      }
      if (sorotan && sorotan.pos && t < sorotSampai) {
        const p = sorotan.pos, l = sorotan.layar || { x: p.x, y: p.y - p.h };
        const k = 1 + Math.sin(detik * 6) * 0.12;
        ctx.strokeStyle = '#FFC93C'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(p.x, p.y + p.h * 0.02, p.h * 0.32 * k, p.h * 0.09 * k, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#FFC93C';
        const ay = l.y - 10 - Math.abs(Math.sin(detik * 4)) * 6;
        ctx.beginPath(); ctx.moveTo(p.x, ay); ctx.lineTo(p.x - 9, ay - 13); ctx.lineTo(p.x + 9, ay - 13); ctx.closePath(); ctx.fill();
      }
      if (opsi.onFrame) opsi.onFrame();
    }

    function putar(t) {
      raf = 0;
      if (!terlihat || document.hidden) return;
      if (t - tAkhir > 33) { tAkhir = t; gambar(t); }
      if (!gerakMinim || (sorotan && t < sorotSampai)) raf = requestAnimationFrame(putar);
    }
    const mulai = () => { if (!raf) raf = requestAnimationFrame(putar); };

    new ResizeObserver(ukur).observe(canvas);
    if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { terlihat = e.isIntersecting; if (terlihat) mulai(); }).observe(canvas);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) mulai(); });

    const api = {
      // list: [{n: nama tampil, k: kata, p: provinsi}], terbaru lebih dulu.
      setWarga(list) {
        warga = list.map((e) => ({ ...e, c: ciri(e) }));
        tata();
        gambar(performance.now());
        mulai();
      },
      tambah(e) {
        const ada = warga.find((w) => w.n === e.n && w.k === e.k);
        if (ada) return ada;
        const w = { ...e, c: ciri(e) };
        warga.unshift(w);
        tata();
        mulai();
        return w;
      },
      get jumlah() { return warga.length; },
      get tampil() { return warga.filter((w) => w.pos); },
      cari(q) {
        const norm = (s) => (s || '').toLocaleLowerCase('id').normalize('NFD').replace(/[̀-ͯ]/g, '');
        const nq = norm(q.trim());
        return nq ? warga.filter((w) => w.pos && norm(w.n).includes(nq)) : [];
      },
      sorot(w, ms = 9000) { sorotan = w; sorotSampai = performance.now() + ms; mulai(); },
      // Posisi kepala warga dalam piksel CSS kanvas, untuk balon kata.
      posisi(w) { return w && w.layar ? { x: w.layar.x, y: w.layar.y, h: w.layar.h, W, H } : null; },
      ciri,
      gambarAvatar(el, e) {
        const c = document.createElement('canvas');
        c.width = c.height = 96;
        const x = c.getContext('2d');
        x.translate(48, 150);
        gambarOrang(x, 150, ciri(e));
        el.textContent = '';
        el.append(c);
      },
      kanvas: canvas,
    };
    ukur();
    return api;
  }
  window.YCSFestival = YCSFestival;
})();
