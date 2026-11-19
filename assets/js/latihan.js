/* Mode latihan Lawan Raja Batu — game lokal 40 detik (tanpa server, tanpa kode undian).
   Tap bos untuk menyerang (combo & kritis), tekan HINDAR saat jurus datang, 3 nyawa. Hasil: skor + tantang teman. */
(() => {
  'use strict';
  // Dibuat mudah dimenangkan (kampanye: orang harus merasa bisa). Penanda: ±4 tap/detik santai sudah cukup menang.
  const DURASI = 45, HP = 160, HATI = 5, JEDA_COMBO = 600, JEDA_MIN = 80; // JEDA_MIN: maks ±12 tap/detik dihitung (anti auto-klik)
  const gerakMinim = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const S = () => window.YCSSuara || { pukul() {}, kritis() {}, awas() {}, aman() {}, kena() {}, menang() {}, kalah() {}, klik() {} };
  const muat = (src) => { const i = new Image(); i.src = src; return i; };
  const aset = { latar: muat('/assets/img/festival/latar-900.webp'), lari: muat('/assets/img/monster/raja-lari.webp'), runtuh: muat('/assets/img/monster/raja-runtuh.webp'), api: muat('/assets/img/monster/raja-api.webp') };
  // Topeng alfa sprite: hanya tubuh Raja Batu yang bisa dipukul (bukan kotak di sekitarnya).
  let topeng = null;
  aset.lari.addEventListener('load', () => { try { const c = document.createElement('canvas'); c.width = aset.lari.naturalWidth; c.height = aset.lari.naturalHeight; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(aset.lari, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data; const a = new Uint8Array(c.width * c.height); for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3]; topeng = { a, w: c.width, h: c.height, fw: c.width / 10 }; } catch (e) { topeng = null; } });
  const warna = () => { const c = getComputedStyle(document.documentElement); const t = (n) => c.getPropertyValue('--' + n).trim(); return { sun: t('sun-400'), coral: t('coral-500'), white: t('white'), navy: t('navy-900'), blue: t('blue-500'), green: t('green-600'), violet: t('violet-600'), langit: t('ilus-langit-festival'), plaza: t('ilus-plaza') }; };

  function buat(dlg, opsi = {}) {
    const $ = (s) => dlg.querySelector(s);
    const kanvas = $('#lt-kanvas'), x = kanvas.getContext('2d');
    let W = 0, H = 0, dpr = 1, raf = 0, st = null, W8 = null;
    function ukur() { dpr = Math.min(2, window.devicePixelRatio || 1); const r = kanvas.getBoundingClientRect(); W = r.width; H = r.height; kanvas.width = W * dpr; kanvas.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); }
    new ResizeObserver(ukur).observe(kanvas);

    function baru() {
      return { hp: HP, hati: HATI, sisa: DURASI, combo: 0, comboMaks: 0, tTap: 0, dmg: 0, aman: 0, kritis: 0, partikel: [], konfeti: [], bara: [], debu: [], benturan: false, getar: 0, kilat: 0, merah: 0,
        mulai: 0, jalan: false, akhir: null, tJurus: 0, awasSampai: 0, hindarOk: false, fase: 'hitung', hitung: 3, posX: 0.5, arah: 1, frame: 0, tRuntuh: 0, tAkhir: 0 };
    }
    function bos() { // kotak bos di layar
      const h = Math.min(H * 0.46, W * 0.8 * 1.2), w = h * (166 / 200);
      const cx = W * (0.5 + (st.posX - 0.5) * 0.5), kaki = H * 0.78;
      return { x: cx - w / 2, y: kaki - h, w, h, cx, kaki };
    }
    // Kena bila jari mengenai piksel tubuh (toleransi jari ±7% lebar bos agar tetap mudah).
    function kenaTubuh(px, py, b) {
      if (!topeng || !st.gambar) return px > b.x && px < b.x + b.w && py > b.y && py < b.kaki;
      const g = st.gambar, r = Math.max(10, g.w * 0.07);
      if (g.pose) { // balikkan transformasi pose (pivot kaki) agar topeng tetap pas saat monster menerjang
        const q = g.pose, ax = px - g.pivX - q.dx, ay = py - g.pivY - q.dy, c = Math.cos(-q.rot), sn = Math.sin(-q.rot);
        px = g.pivX + (ax * c - ay * sn) / q.sx; py = g.pivY + (ax * sn + ay * c) / q.sy;
      }
      for (const [dx, dy] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r], [r * 0.7, r * 0.7], [-r * 0.7, r * 0.7], [r * 0.7, -r * 0.7], [-r * 0.7, -r * 0.7]]) {
        let u = (px + dx - g.x) / g.w; const v = (py + dy - g.y) / g.h;
        if (g.balik) u = 1 - u;
        if (u < 0 || u > 1 || v < 0 || v > 1) continue;
        if (topeng.a[Math.floor(v * (topeng.h - 1)) * topeng.w + Math.floor(g.i * topeng.fw + u * (topeng.fw - 1))] > 90) return true;
      }
      return false;
    }
    // Gerak tubuh saat jurus (selaras dengan efek api): ancang-ancang → hentakan menerjang → kembali.
    // Pivot di kaki. rot (rad, positif = condong ke depan/arah hadap), sx/sy skala, dx/dy geser px.
    const mudahKeluar = (u) => 1 - Math.pow(1 - u, 3), pegas = (u) => Math.sin(u * Math.PI);
    function pose(t, b) {
      const p = { rot: 0, sx: 1, sy: 1, dx: 0, dy: 0, frame: null };
      if (gerakMinim || !st) return p;
      if (st.awasSampai) {                         // ancang-ancang 2,4 dtk: tegak, condong ke belakang, jongkok, gemetar makin kuat
        const u = Math.min(1, 1 - (st.awasSampai - t) / 2400), e = mudahKeluar(u);
        p.frame = 0;
        p.rot = -0.24 * e; p.sy = 1 - 0.12 * e; p.sx = 1 + 0.07 * e; p.dx = -b.w * 0.12 * e;
        const g = 0.006 + 0.022 * u; p.dx += Math.sin(t / 22) * b.w * g; p.dy = Math.cos(t / 27) * b.h * g * 0.5;
      } else if (st.tSerang && t - st.tSerang < 1100) {  // hentakan: menerjang ke depan & membesar, lalu pulih
        const u = (t - st.tSerang) / 1100;
        // terjang 0–0,16 · tahan saat benturan 0,16–0,30 (hit-stop) · pulih ke kuda-kuda 0,30–1
        const maju = u < 0.16 ? mudahKeluar(u / 0.16) : u < 0.3 ? 1 : Math.max(0, 1 - (u - 0.3) / 0.7) ** 2;
        p.frame = u < 0.6 ? 4 : null;
        p.rot = 0.3 * maju; p.sx = 1 + 0.1 * maju; p.sy = 1 + 0.14 * maju;
        p.dx = b.w * 0.34 * maju; p.dy = b.h * 0.04 * maju; p.maju = maju;
      }
      return p;
    }
    // Efek benturan: jejak api oranye mengikuti sabetan senjata, ledakan bara & percikan, gelombang kejut + debu di kaki, getar.
    function gambarBenturan(t, b) {
      const u = (t - st.tSerang) / 1100, arahP = st.arah < 0 ? -1 : 1, q = st.poseTerakhir || { dx: 0 };
      const depanX = b.cx + q.dx + arahP * b.w * 0.42, depanY = b.y + b.h * 0.42;
      if (!st.benturan && u >= 0.16) { // detik benturan
        st.benturan = true; st.getar = t; st.getarAmp = 1.6;
        for (let i = 0; i < 46; i++) { const a = (Math.random() - 0.5) * Math.PI * 1.4 + (arahP > 0 ? 0 : Math.PI), v = 2 + Math.random() * 7; st.bara.push({ x: depanX, y: depanY, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, r: 1.5 + Math.random() * 2.5, t0: t, umur: 500 + Math.random() * 500 }); }
        for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI, v = 1 + Math.random() * 2.5; st.debu.push({ x: b.cx + q.dx, y: b.kaki, vx: Math.cos(a) * v * (Math.random() < 0.5 ? -1 : 1) * 2, vy: -Math.sin(a) * v * 0.6, r: 8 + Math.random() * 14, t0: t, umur: 900 }); }
      }
      x.save(); x.globalCompositeOperation = 'lighter';
      // jejak sabetan diagonal (0–0,3)
      if (u < 0.32) {
        const p = Math.min(1, u / 0.16), pud = u < 0.16 ? 1 : 1 - (u - 0.16) / 0.16;
        const cx = b.cx + q.dx, cy = b.y + b.h * 0.45, R = b.h * 0.62, a0 = -2.3, a1 = a0 + 2.6 * p;
        for (const [lebar, al] of [[18, 0.25], [9, 0.55], [3, 0.95]]) {
          x.strokeStyle = `rgba(255,${150 + (3 - lebar / 6) * 30},40,${al * pud})`; x.lineWidth = lebar; x.lineCap = 'round';
          x.beginPath(); x.ellipse(cx, cy, R, R * 0.55, arahP * -0.5, arahP > 0 ? a0 : Math.PI - a1, arahP > 0 ? a1 : Math.PI - a0); x.stroke();
        }
      }
      // kilatan di titik benturan
      if (u >= 0.16 && u < 0.36) { const k = 1 - (u - 0.16) / 0.2, rr = b.h * (0.12 + 0.35 * (1 - k)); const g = x.createRadialGradient(depanX, depanY, 0, depanX, depanY, rr); g.addColorStop(0, `rgba(255,250,220,${k})`); g.addColorStop(0.4, `rgba(255,170,40,${0.7 * k})`); g.addColorStop(1, 'rgba(255,80,20,0)'); x.fillStyle = g; x.beginPath(); x.arc(depanX, depanY, rr, 0, 6.28); x.fill(); }
      // gelombang kejut di tanah
      if (u >= 0.16 && u < 0.7) { const k = (u - 0.16) / 0.54; x.strokeStyle = `rgba(255,200,120,${0.6 * (1 - k)})`; x.lineWidth = 3 * (1 - k) + 1; x.beginPath(); x.ellipse(b.cx + q.dx, b.kaki, b.w * (0.3 + 1.1 * k), b.w * (0.07 + 0.22 * k), 0, 0, 6.28); x.stroke(); }
      x.restore();
    }
    function gambarPartikelBenturan(t) {
      x.save();
      st.debu = st.debu.filter((d) => t - d.t0 < d.umur);
      for (const d of st.debu) { const k = (t - d.t0) / d.umur; d.x += d.vx; d.y += d.vy; d.vy *= 0.96; x.globalAlpha = 0.35 * (1 - k); x.fillStyle = 'rgb(205,180,140)'; x.beginPath(); x.arc(d.x, d.y, d.r * (1 + k * 1.5), 0, 6.28); x.fill(); }
      x.globalCompositeOperation = 'lighter';
      st.bara = st.bara.filter((p) => t - p.t0 < p.umur);
      for (const p of st.bara) { const k = (t - p.t0) / p.umur; p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.vx *= 0.98; x.globalAlpha = 1 - k; x.fillStyle = k < 0.4 ? 'rgb(255,240,180)' : 'rgb(255,140,40)'; x.beginPath(); x.arc(p.x, p.y, p.r * (1 - k * 0.5), 0, 6.28); x.fill(); }
      x.restore();
    }
    function teks(isi, px, py, warnaTeks, besar) { st.partikel.push({ t: performance.now(), isi, x: px, y: py, warna: warnaTeks, besar, vy: -1.2 - Math.random() }); if (st.partikel.length > 40) st.partikel.shift(); }

    function tap(ev) {
      if (!st || st.fase !== 'main') return;
      const r = kanvas.getBoundingClientRect(), px = ev.clientX - r.left, py = ev.clientY - r.top, b = bos();
      if (!kenaTubuh(px, py, b)) { teks('Meleset!', px, py, W8.white, 16); return; }
      const t = performance.now();
      if (t - st.tTap < JEDA_MIN) return;
      st.combo = t - st.tTap < JEDA_COMBO ? st.combo + 1 : 1; st.tTap = t; st.comboMaks = Math.max(st.comboMaks, st.combo);
      // Combo naik tiap 8 tap; 15 detik terakhir "Semangat!" serangan ×2 agar pemain yang mepet tetap bisa menang.
      const semangat = st.sisa <= 15;
      const kali = Math.min(3, 1 + Math.floor(st.combo / 8) * 0.5) * (semangat ? 2 : 1), krit = Math.random() < 0.12;
      const d = Math.round((krit ? 3 : 1) * kali);
      st.hp = Math.max(0, st.hp - d); st.dmg += d; st.kilat = t; if (!gerakMinim) { st.getar = t; st.getarAmp = 0.7; }
      if (krit) { st.kritis++; S().kritis(); teks('KRITIS -' + d, px, py, W8.sun, 26); } else { S().pukul(st.combo); teks('-' + d, px, py, W8.white, 20); }
      $('#lt-combo').textContent = semangat ? `SEMANGAT! Serangan x${String(kali).replace('.', ',')}` : st.combo >= 5 ? `${st.combo} combo · x${String(kali).replace('.', ',')}` : '';
      if (st.hp <= 0) selesai(true);
    }
    kanvas.addEventListener('pointerdown', tap);

    function jadwalJurus(t, awal) { st.tJurus = t + (awal ? 5000 : 6500) + Math.random() * 2500; }
    function hindar() {
      if (!st || st.fase !== 'main' || performance.now() > st.awasSampai) return;
      st.hindarOk = true; st.aman++; S().aman(); teks('AMAN!', W / 2, H * 0.62, W8.green, 26);
      $('#lt-hindar').hidden = true; $('#lt-awas').hidden = true;
    }
    $('#lt-hindar').addEventListener('click', hindar);

    function hati() { $('#lt-hati').innerHTML = Array.from({ length: HATI }, (_, i) => `<svg class="${i < st.hati ? '' : 'is-habis'}" aria-hidden="true"><use href="#i-heart"/></svg>`).join(''); $('#lt-hati').setAttribute('aria-label', `Nyawa kamu ${st.hati} dari ${HATI}`); }

    function selesai(menang) {
      if (st.fase === 'akhir') return;
      st.fase = 'akhir'; st.akhir = menang ? 'menang' : 'kalah'; st.tAkhir = performance.now(); st.tRuntuh = st.tAkhir;
      $('#lt-hindar').hidden = true; $('#lt-awas').hidden = true; $('#lt-combo').textContent = '';
      const skor = menang ? st.dmg * 10 + Math.ceil(st.sisa) * 20 + st.hati * 100 + st.aman * 50 + st.comboMaks * 5 : st.dmg * 10 + st.aman * 50;
      let terbaik = 0; try { terbaik = Number(localStorage.getItem('ycs_latihan_best') || 0); if (skor > terbaik) localStorage.setItem('ycs_latihan_best', String(skor)); localStorage.setItem('ycs_latihan_main', String(Number(localStorage.getItem('ycs_latihan_main') || 0) + 1)); } catch (e) {}
      if (menang) { S().menang(); for (let i = 0; i < 90; i++) st.konfeti.push({ x: W / 2, y: H * 0.45, vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 9 - 3, r: Math.random() * 6.28, w: [W8.sun, W8.coral, W8.blue, W8.green, W8.violet][i % 5] }); } else S().kalah();
      setTimeout(() => {
        $('#lt-hasil-badge').textContent = menang ? 'Menang!' : st.hati <= 0 ? 'Kena jurus' : 'Waktu habis';
        $('#lt-hasil-judul').textContent = menang ? 'Raja Batu tumbang!' : 'Hampir! Coba lagi';
        $('#lt-skor').textContent = new Intl.NumberFormat('id-ID').format(skor);
        $('#lt-hasil-sub').textContent = `${st.dmg} serangan · combo terbaik ${st.comboMaks} · ${st.aman}× menghindar${skor > terbaik ? ' · rekor baru!' : ` · rekor ${new Intl.NumberFormat('id-ID').format(Math.max(terbaik, skor))}`}`;
        $('#lt-hasil').hidden = false; $('#lt-lagi').focus();
        opsi.saatSelesai && opsi.saatSelesai({ menang, skor, rekor: skor > terbaik });
      }, menang ? 1400 : 700);
    }

    function gambar(t) {
      raf = requestAnimationFrame(gambar);
      if (!W) return;
      x.clearRect(0, 0, W, H);
      // latar plaza
      const L = aset.latar;
      // langit + gerbang (lebar penuh, tidak terpotong) lalu plaza diperpanjang ke bawah — sama seperti panggung festival
      x.fillStyle = W8.langit; x.fillRect(0, 0, W, H); x.fillStyle = W8.plaza; x.fillRect(0, H * 0.5, W, H * 0.5);
      if (L.complete && L.naturalWidth) { const s = Math.max(W / L.naturalWidth, (H * 0.5) / L.naturalHeight * 0.9); const lw = L.naturalWidth * s, lh = L.naturalHeight * s; x.drawImage(L, (W - lw) / 2, H * 0.52 - lh, lw, lh); }
      x.fillStyle = 'rgba(6,24,64,.35)'; x.fillRect(0, 0, W, H);
      let ox = 0, oy = 0;
      if (st.getar && t - st.getar < 180) { const k = 1 - (t - st.getar) / 180; const a = st.getarAmp || 1; ox = (Math.random() - 0.5) * 9 * a * k; oy = (Math.random() - 0.5) * 7 * a * k; }
      x.save(); x.translate(ox, oy);
      // Dorongan kamera (hanya lapisan karakter & efek; latar tetap diam): mendekat saat ancang-ancang, puncak saat benturan.
      if (!gerakMinim && st.fase === 'main') {
        const bb = bos(); let dorong = 0;
        if (st.awasSampai) dorong = 0.04 * Math.min(1, 1 - (st.awasSampai - t) / 2400);
        else if (st.tSerang && t - st.tSerang < 1100) { const u = (t - st.tSerang) / 1100; dorong = u < 0.3 ? 0.04 + 0.04 * Math.min(1, u / 0.16) : 0.08 * Math.max(0, 1 - (u - 0.3) / 0.7); }
        if (dorong) { x.translate(bb.cx, bb.y + bb.h * 0.55); x.scale(1 + dorong, 1 + dorong); x.translate(-bb.cx, -(bb.y + bb.h * 0.55)); }
      }
      // logika waktu
      if (st.fase === 'hitung') {
        const s = 3 - Math.floor((t - st.mulai) / 800);
        $('#lt-mulai').textContent = s > 0 ? String(s) : 'SERANG!';
        if (t - st.mulai > 3000) { st.fase = 'main'; st.t0 = t; jadwalJurus(t, true); $('#lt-mulai').textContent = ''; }
      } else if (st.fase === 'main') {
        st.sisa = Math.max(0, DURASI - (t - st.t0) / 1000);
        $('#lt-waktu').textContent = Math.ceil(st.sisa);
        if (!st.awasSampai && !(st.tSerang && t - st.tSerang < 1100)) st.posX += st.arah * 0.002; if (st.posX > 0.72 || st.posX < 0.28) st.arah *= -1;
        if (!st.awasSampai && t > st.tJurus) { st.awasSampai = t + 2400; st.hindarOk = false; $('#lt-awas').hidden = false; $('#lt-hindar').hidden = false; S().awas(); }
        if (st.awasSampai && t > st.awasSampai) {
          if (!st.hindarOk) { st.hati--; st.merah = t; S().kena(); hati(); teks('-1 nyawa', W / 2, H * 0.6, W8.coral, 24); }
          st.awasSampai = 0; st.tSerang = t; st.benturan = false; $('#lt-awas').hidden = true; $('#lt-hindar').hidden = true; jadwalJurus(t);
          if (st.hati <= 0) selesai(false);
        }
        if (st.sisa <= 0) selesai(false);
      }
      // bos
      const b = bos();
      x.fillStyle = 'rgba(6,24,64,.35)'; x.beginPath(); x.ellipse(b.cx, b.kaki, b.w * 0.45, b.w * 0.1, 0, 0, 6.28); x.fill();
      if (st.fase === 'akhir' && st.akhir === 'menang') {
        const R = aset.runtuh, f = Math.min(8, Math.floor((t - st.tRuntuh) / 110)), fw = 259, fh = 240, h2 = b.h * 1.05, w2 = h2 * fw / fh;
        if (R.complete && R.naturalWidth) x.drawImage(R, f * fw, 0, fw, fh, b.cx - w2 / 2, b.kaki - h2, w2, h2);
      } else {
        const A = aset.lari, ps = pose(t, b); st.frame = ps.frame != null ? ps.frame : Math.floor(t / 90) % 10;
        if (A.complete && A.naturalWidth) {
          x.save();
          const arahP = st.arah < 0 ? -1 : 1, q = { ...ps, rot: ps.rot * arahP, dx: ps.dx * arahP };
          x.translate(b.cx + q.dx, b.kaki + q.dy); x.rotate(q.rot); x.scale(q.sx, q.sy); x.translate(-b.cx, -b.kaki);
          if (st.arah < 0) { x.translate(b.cx, 0); x.scale(-1, 1); x.translate(-b.cx, 0); }
          if (ps.maju > 0.15) { // bayangan gerak (afterimage) di belakang tubuh saat menerjang
            for (const [mund, al] of [[0.24, 0.22], [0.12, 0.38]]) { x.save(); x.globalAlpha = al * ps.maju; x.filter = 'sepia(1) saturate(4) hue-rotate(-20deg) brightness(1.1)'; x.drawImage(A, st.frame * 166, 0, 166, 200, b.x - b.w * mund, b.y, b.w, b.h); x.restore(); }
          }
          if (st.kilat && t - st.kilat < 90) x.filter = 'brightness(2.2)';
          x.drawImage(A, st.frame * 166, 0, 166, 200, b.x, b.y, b.w, b.h);
          st.matriks = x.getTransform(); // dipakai untuk menggambar ulang tubuh di atas api
          x.restore();
          st.gambar = { i: st.frame, x: b.x, y: b.y, w: b.w, h: b.h, balik: st.arah < 0, pivX: b.cx, pivY: b.kaki, pose: { ...ps, rot: ps.rot * (st.arah < 0 ? -1 : 1), dx: ps.dx * (st.arah < 0 ? -1 : 1) } };
          st.poseTerakhir = st.gambar.pose;
        }
        // Serangan api (adaptasi GIF panitia): frame 0–7 mengumpulkan api selama peringatan, 8–15 ledakan setelahnya.
        const F = aset.api; let k = -1;
        if (st.awasSampai) k = Math.min(7, Math.floor((1 - (st.awasSampai - t) / 2400) * 8));
        else if (st.tSerang && t - st.tSerang < 1100) k = 8 + Math.min(7, Math.floor((t - st.tSerang) / 1100 * 8));
        if (k >= 0 && F.complete && F.naturalWidth && !gerakMinim) {
          const fw = F.naturalWidth / 16, fh = F.naturalHeight, lw = b.h * 2.1, lh = lw * fh / fw;
          x.fillStyle = `rgba(6,24,64,${k < 8 ? 0.12 + k * 0.03 : 0.36 - (k - 8) * 0.04})`; x.fillRect(0, 0, W, H); // langit meredup agar api menyala
          x.save(); x.globalCompositeOperation = 'lighter';
          const q2 = st.poseTerakhir || { dx: 0, dy: 0 };
          x.translate(q2.dx * 1.4, q2.dy);   // api ikut terlempar ke arah terjangan
          if (st.arah < 0) { x.translate(b.cx, 0); x.scale(-1, 1); x.translate(-b.cx, 0); }
          x.globalAlpha = k >= 8 && k <= 11 ? 0.7 : 1;
          x.drawImage(F, k * fw, 0, fw, fh, b.cx - lw / 2, b.y + b.h * 0.5 - lh * 0.56, lw, lh);
          x.restore();
          // tubuh digambar ulang di atas api agar gerakan menyerang tetap terbaca (api tetap menyelimuti tepinya)
          if (st.matriks && A.complete) { x.save(); x.setTransform(st.matriks); x.globalAlpha = k >= 8 ? 0.85 : 0.6; x.drawImage(A, st.frame * 166, 0, 166, 200, b.x, b.y, b.w, b.h); x.restore(); }
        }
        if (!gerakMinim && st.tSerang && t - st.tSerang < 1100) gambarBenturan(t, b);
      }
      gambarPartikelBenturan(t);
      x.restore();
      // angka & partikel
      st.partikel = st.partikel.filter((p) => t - p.t < 800);
      st.partikel.forEach((p) => { const k = (t - p.t) / 800; x.globalAlpha = 1 - k; x.fillStyle = p.warna; x.font = `800 ${p.besar}px "Plus Jakarta Sans", sans-serif`; x.textAlign = 'center'; x.lineWidth = 4; x.strokeStyle = 'rgba(6,24,64,.6)'; x.strokeText(p.isi, p.x, p.y + p.vy * k * 40); x.fillText(p.isi, p.x, p.y + p.vy * k * 40); });
      x.globalAlpha = 1;
      st.konfeti.forEach((c) => { c.x += c.vx; c.y += c.vy; c.vy += 0.25; c.r += 0.2; x.save(); x.translate(c.x, c.y); x.rotate(c.r); x.fillStyle = c.w; x.fillRect(-4, -2, 8, 4); x.restore(); });
      st.konfeti = st.konfeti.filter((c) => c.y < H + 20);
      if (st.merah && t - st.merah < 300) { x.fillStyle = `rgba(217,45,32,${0.35 * (1 - (t - st.merah) / 300)})`; x.fillRect(0, 0, W, H); }
      // bar nyawa bos
      $('#lt-bar-isi').style.transform = `scaleX(${st.hp / HP})`;
      $('#lt-bar').setAttribute('aria-valuenow', String(Math.round(st.hp / HP * 100)));
    }

    function mulai() {
      W8 = warna(); st = baru(); st.mulai = performance.now();
      $('#lt-hasil').hidden = true; $('#lt-waktu').textContent = DURASI; $('#lt-combo').textContent = ''; hati();
      cancelAnimationFrame(raf); ukur(); raf = requestAnimationFrame(gambar);
    }
    function buka() { if (!dlg.open) dlg.showModal(); mulai(); }
    function tutup() { cancelAnimationFrame(raf); st = null; if (dlg.open) dlg.close(); }
    $('#lt-tutup').addEventListener('click', tutup);
    $('#lt-keluar').addEventListener('click', tutup);
    $('#lt-lagi').addEventListener('click', () => { S().klik(); mulai(); });
    dlg.addEventListener('close', () => { cancelAnimationFrame(raf); st = null; });
    return { buka, tutup };
  }
  window.YCSLatihan = { buat };
})();
