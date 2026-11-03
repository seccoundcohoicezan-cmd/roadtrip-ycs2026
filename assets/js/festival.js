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
  function gambarOrang(x, H, c, langkah = 0) {
    const ayun = langkah === 1 ? H * 0.045 : langkah === 2 ? -H * 0.045 : 0;
    const kepalaR = H * 0.13, kepalaY = -H * 0.83;
    x.fillStyle = 'rgba(0,0,0,.18)';
    x.beginPath(); x.ellipse(0, 0, H * 0.2, H * 0.045, 0, 0, Math.PI * 2); x.fill();
    // kaki / sarung
    x.fillStyle = c.bawah;
    if (c.sarung) { x.beginPath(); x.moveTo(-H * 0.17, -H * 0.36); x.lineTo(H * 0.17, -H * 0.36); x.lineTo(H * 0.14, -H * 0.03); x.lineTo(-H * 0.14, -H * 0.03); x.closePath(); x.fill(); }
    else { x.fillRect(-H * 0.15 - ayun, -H * 0.37, H * 0.12, H * 0.35 - Math.abs(ayun) * 0.4); x.fillRect(H * 0.03 + ayun, -H * 0.37, H * 0.12, H * 0.35 - Math.abs(ayun) * 0.4); }
    x.fillStyle = '#2B2B2B';
    x.fillRect(-H * 0.16 - ayun, -H * 0.04 - Math.abs(ayun) * 0.4, H * 0.14, H * 0.04); x.fillRect(H * 0.02 + ayun, -H * 0.04 - Math.abs(ayun) * 0.4, H * 0.14, H * 0.04);
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

  // Sprite per kombinasi ciri + fase langkah, digambar sekali lalu diskalakan (ringan untuk ribuan warga).
  const SPR_H = 96, SPR_W = 72;
  const cacheSprite = new Map();
  function sprite(c, langkah) {
    const k = kunciCiri(c) + '|' + langkah;
    let s = cacheSprite.get(k);
    if (s) return s;
    s = document.createElement('canvas');
    s.width = SPR_W; s.height = SPR_H + 8;
    const x = s.getContext('2d');
    x.translate(SPR_W / 2, SPR_H + 2);
    gambarOrang(x, SPR_H * 0.98, c, langkah);
    cacheSprite.set(k, s);
    return s;
  }
  const acak = (seed) => { let t = seed >>> 0; return () => { t = (t + 0x6D2B79F5) >>> 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; };
  const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function YCSFestival(canvas, opsi = {}) {
    const ctx = canvas.getContext('2d');
    const gerakMinim = opsi.gerakMinim ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wadah = opsi.wadahBalon || canvas.parentElement;
    const latar = new Image();
    let siapLatar = false, W = 0, H = 0, dpr = 1, warga = [], raf = 0, terlihat = true, tAkhir = 0, tLalu = 0;
    let balonAktif = opsi.balonAktif ?? true;
    let area = { y0: 0, y1: 0, imgH: 0 };
    const balon = []; // {w, el, sampai, pin}
    latar.onload = () => { siapLatar = true; ukur(); };
    latar.src = (canvas.clientWidth > 700 ? LATAR.besar : LATAR.kecil);

    function ukur() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = w; H = h;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      // Gambar latar selalu utuh selebar panggung (tidak dipotong); sisa tinggi diisi lanjutan plaza.
      area.imgH = siapLatar ? W * latar.height / latar.width : W * 596 / 1654;
      area.y0 = Math.min(H * 0.8, area.imgH * 0.86);
      area.y1 = H * 0.975;
      gambar(performance.now());
    }

    // Ukuran warga mengikuti jumlah: sedikit = besar, ramai = mengecil.
    const tinggiDasar = () => {
      const n = Math.max(1, warga.length);
      const luas = (area.y1 - area.y0) * W;
      return Math.max(H * 0.03, Math.min(H * 0.17, Math.sqrt(luas / n) * 0.9));
    };
    const skalaY = (y) => 0.5 + 0.62 * Math.max(0, Math.min(1, (y - area.y0) / Math.max(1, area.y1 - area.y0)));

    function tujuanBaru(w, r) {
      w.tx = 0.03 + r() * 0.94;
      w.ty = r();
      w.jeda = r() < 0.35 ? 0.8 + r() * 2.5 : 0;
    }
    function siapkanWarga(e, i, dariGerbang) {
      const w = { ...e, c: ciri(e) };
      w.r = acak(hash((e.n || '') + (e.k || '') + i));
      w.x = dariGerbang ? 0.5 : 0.03 + w.r() * 0.94;
      w.y = dariGerbang ? 0 : w.r();
      w.v = 0.045 + w.r() * 0.05;
      tujuanBaru(w, w.r);
      if (dariGerbang) { w.tx = 0.42 + w.r() * 0.16; w.ty = 0.72 + w.r() * 0.2; w.jeda = 0; }
      w.langkahT = w.r() * 10;
      return w;
    }

    function gambarLatar() {
      const ih = area.imgH;
      // lanjutan plaza di bawah gambar (warna diambil dari tepi bawah gambar)
      const g = ctx.createLinearGradient(0, ih - 2, 0, H);
      g.addColorStop(0, '#ECCEA4'); g.addColorStop(1, '#DCBE93');
      ctx.fillStyle = g; ctx.fillRect(0, ih - 2, W, H - ih + 2);
      ctx.strokeStyle = 'rgba(150,115,70,.16)'; ctx.lineWidth = 1;
      const vx = W / 2, vy = ih * 0.72;
      for (let i = -14; i <= 14; i++) { const xb = vx + i * W * 0.085; const t = (ih - vy) / (H - vy); ctx.beginPath(); ctx.moveTo(vx + (xb - vx) * t, ih); ctx.lineTo(xb, H); ctx.stroke(); }
      for (let k = 1; k < 10; k++) { const yy = ih + (H - ih) * Math.pow(k / 10, 1.5); ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke(); }
      if (siapLatar) ctx.drawImage(latar, 0, 0, W, ih);
      else { const s = ctx.createLinearGradient(0, 0, 0, ih); s.addColorStop(0, '#5BB8F0'); s.addColorStop(1, '#ECCEA4'); ctx.fillStyle = s; ctx.fillRect(0, 0, W, ih); }
      // sambungan halus antara gambar dan lanjutan plaza
      const f = ctx.createLinearGradient(0, ih - 24, 0, ih + 6);
      f.addColorStop(0, 'rgba(236,206,164,0)'); f.addColorStop(1, 'rgba(236,206,164,.9)');
      ctx.fillStyle = f; ctx.fillRect(0, ih - 24, W, 30);
    }

    function gerak(dt) {
      if (gerakMinim) return;
      for (const w of warga) {
        if (w.diam) continue;
        if (w.jeda > 0) { w.jeda -= dt; w.jalan = false; continue; }
        const dx = w.tx - w.x, dy = (w.ty - w.y) * 0.6;
        const jarak = Math.hypot(dx, dy);
        if (jarak < 0.004) { tujuanBaru(w, w.r); continue; }
        const s = (0.6 + 0.6 * w.y) * w.v * dt;
        w.x += (dx / jarak) * Math.min(s, jarak);
        w.y += (dy / jarak) * Math.min(s, jarak) / 0.6;
        w.jalan = true;
        w.langkahT += dt * 7;
      }
    }

    function gambar(t) {
      if (!W) return;
      const dt = Math.min(0.1, tLalu ? (t - tLalu) / 1000 : 0);
      tLalu = t;
      gerak(dt);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      gambarLatar();
      const b = tinggiDasar();
      const urut = warga.slice().sort((p, q) => p.y - q.y);
      for (const w of urut) {
        const py = area.y0 + w.y * (area.y1 - area.y0);
        const h = b * skalaY(py);
        const px = w.x * W;
        const langkah = w.jalan ? (Math.floor(w.langkahT) % 2) + 1 : 0;
        const naik = w.jalan ? Math.abs(Math.sin(w.langkahT * Math.PI)) * h * 0.03 : 0;
        const sp = sprite(w.c, langkah);
        const sh = h * (SPR_H + 8) / SPR_H, sw = sh * SPR_W / (SPR_H + 8);
        ctx.drawImage(sp, px - sw / 2, py - sh + h * 0.06 - naik, sw, sh);
        w.layar = { x: px, y: py - h - naik, kaki: py, h };
      }
      for (const bl of balon) {
        if (!bl.pin) continue;
        const l = bl.w.layar;
        if (!l) continue;
        const k = 1 + Math.sin(t / 160) * 0.12;
        ctx.strokeStyle = '#FFC93C'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(l.x, l.kaki + l.h * 0.02, l.h * 0.32 * k, l.h * 0.09 * k, 0, 0, Math.PI * 2); ctx.stroke();
      }
      aturBalon(t);
      if (opsi.onFrame) opsi.onFrame();
    }

    /* ---------- Balon kata: banyak sekaligus, tidak pernah saling menutupi ---------- */
    const maksBalon = () => (W >= 1000 ? 6 : W >= 700 ? 4 : 2);
    function buatBalon(w, pin, label) {
      const el = document.createElement('div');
      el.className = 'fest-b' + (pin ? ' is-pin' : '');
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = `<span class="fest-b__ava"></span><span class="fest-b__isi"><strong>${esc(w.n)}</strong><em>${esc(w.k)}</em>${w.p ? `<small>${esc(w.p)}</small>` : ''}</span>${label ? `<span class="fest-b__tag">${esc(label)}</span>` : ''}`;
      api.gambarAvatar(el.querySelector('.fest-b__ava'), w);
      wadah.append(el);
      const bl = { w, el, pin, sampai: performance.now() + (pin ? 9000 : 4200 + Math.random() * 1500), lebar: el.offsetWidth, tinggi: el.offsetHeight };
      requestAnimationFrame(() => el.classList.add('is-on'));
      return bl;
    }
    function hapusBalon(bl) {
      bl.el.classList.remove('is-on');
      setTimeout(() => bl.el.remove(), 300);
      if (bl.w.diam && bl.pin) bl.w.diam = false;
    }
    function kotak(bl) {
      const l = bl.w.layar;
      if (!l) return null;
      const x = Math.max(bl.lebar / 2 + 6, Math.min(W - bl.lebar / 2 - 6, l.x));
      const yb = Math.max(bl.tinggi + 8, l.y - 10);
      return { x, yb, kiri: x - bl.lebar / 2 - 4, kanan: x + bl.lebar / 2 + 4, atas: yb - bl.tinggi - 14, bawah: yb + 2, ekor: l.x - x };
    }
    const tabrak = (a, c) => a && c && a.kiri < c.kanan && a.kanan > c.kiri && a.atas < c.bawah && a.bawah > c.atas;
    let tCoba = 0;
    function aturBalon(t) {
      // posisikan; bila dua balon bertabrakan, yang bukan "pin" & paling lama tampil disembunyikan
      for (let i = balon.length - 1; i >= 0; i--) {
        const bl = balon[i];
        if (t > bl.sampai) { hapusBalon(bl); balon.splice(i, 1); continue; }
        bl.k = kotak(bl);
      }
      for (let i = 0; i < balon.length; i++) for (let j = i + 1; j < balon.length; j++) {
        if (!tabrak(balon[i].k, balon[j].k)) continue;
        const korban = balon[i].pin ? balon[j] : balon[j].pin ? balon[i] : (balon[i].sampai < balon[j].sampai ? balon[i] : balon[j]);
        if (korban.pin) continue;
        korban.sampai = 0;
      }
      for (const bl of balon) {
        if (!bl.k || bl.sampai === 0) { if (bl.sampai === 0) bl.el.classList.remove('is-on'); continue; }
        bl.el.style.transform = `translate(${bl.k.x - bl.lebar / 2}px, ${bl.k.yb - bl.tinggi}px)`;
        bl.el.style.setProperty('--ekor', `${bl.lebar / 2 + bl.k.ekor}px`);
      }
      if (!balonAktif || t - tCoba < 700 || balon.length >= maksBalon() || !warga.length) return;
      tCoba = t;
      // pilih warga baru yang balonnya muat tanpa menutupi balon lain
      for (let coba = 0; coba < 6; coba++) {
        const w = warga[Math.floor(Math.random() * warga.length)];
        if (!w.layar || balon.some((b) => b.w === w)) continue;
        const bl = buatBalon(w, false);
        const k = kotak(bl);
        if (!k || balon.some((b) => tabrak(k, b.k))) { bl.el.remove(); continue; }
        bl.k = k;
        balon.push(bl);
        break;
      }
    }

    function putar(t) {
      raf = 0;
      if (!terlihat || document.hidden) { tLalu = 0; return; }
      if (t - tAkhir > 30) { tAkhir = t; gambar(t); }
      raf = requestAnimationFrame(putar);
    }
    const mulai = () => { if (!raf) raf = requestAnimationFrame(putar); };

    new ResizeObserver(ukur).observe(canvas);
    if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { terlihat = e.isIntersecting; if (terlihat) mulai(); }).observe(canvas);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) mulai(); });

    const api = {
      // list: [{n: nama tampil, k: kata, p: provinsi}], terbaru lebih dulu. Maksimal 2.000 warga.
      setWarga(list) {
        const lama = new Map(warga.map((w) => [w.n + '|' + w.k, w]));
        warga = list.slice(0, 2000).map((e, i) => lama.get(e.n + '|' + e.k) || siapkanWarga(e, i, false));
        mulai();
      },
      // Warga baru masuk dari gerbang lalu berjalan ke tengah plaza.
      tambah(e) {
        const ada = warga.find((w) => w.n === e.n && w.k === e.k);
        if (ada) return ada;
        const w = siapkanWarga(e, warga.length, true);
        warga.unshift(w);
        mulai();
        return w;
      },
      get jumlah() { return warga.length; },
      get tampil() { return warga; },
      cari(q) {
        const norm = (s) => (s || '').toLocaleLowerCase('id').normalize('NFD').replace(/[̀-ͯ]/g, '');
        const nq = norm(q.trim());
        return nq ? warga.filter((w) => norm(w.n).includes(nq)) : [];
      },
      // Sorot: warga berhenti sejenak, ditandai lingkaran, balonnya disematkan (menang atas balon lain).
      sorot(w, ms = 9000, label = '') {
        balon.filter((b) => b.pin).forEach((b) => { b.sampai = 0; });
        const bl = buatBalon(w, true, label);
        bl.sampai = performance.now() + ms;
        w.diam = true;
        balon.push(bl);
        mulai();
      },
      setBalon(on) { balonAktif = on; if (!on) balon.forEach((b) => { b.sampai = 0; }); },
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
    mulai();
    return api;
  }
  window.YCSFestival = YCSFestival;
})();
