/* Mode latihan Lawan Raja Batu — game lokal 45 detik (tanpa server, tanpa kode undian).
   Tap bos untuk menyerang (combo & kritis), tekan HINDAR saat jurus datang, PERISAI saat Hujan Meteor (jurus area,
   muncul tepat setelah tiap 2 jurus). Layar penuh otomatis saat mulai. Hasil: skor + tantang teman. */
(() => {
  'use strict';
  // Dibuat mudah dimenangkan (kampanye: orang harus merasa bisa). Penanda: ±4 tap/detik santai sudah cukup menang.
  const DURASI = 45, HP = 160, HATI = 5, JEDA_COMBO = 600, JEDA_MIN = 80, AWAS = 2400, SERANG = 1100, SERANG_METEOR = 2600; // JEDA_MIN: maks ±12 tap/detik dihitung (anti auto-klik)
  const gerakMinim = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const S = () => window.YCSSuara || { pukul() {}, kritis() {}, awas() {}, aman() {}, kena() {}, menang() {}, kalah() {}, klik() {} };
  const muat = (src) => { const i = new Image(); i.src = src; return i; };
  const aset = { latar: muat('/assets/img/festival/latar-900.webp'), lari: muat('/assets/img/monster/raja-lari.webp'), runtuh: muat('/assets/img/monster/raja-runtuh.webp'), api: muat('/assets/img/monster/raja-api.webp') };
  // Topeng alfa sprite: hanya tubuh Raja Batu yang bisa dipukul (bukan kotak di sekitarnya).
  let topeng = null, rigCache = null;
  aset.lari.addEventListener('load', () => { try { const c = document.createElement('canvas'); c.width = aset.lari.naturalWidth; c.height = aset.lari.naturalHeight; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(aset.lari, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data; const a = new Uint8Array(c.width * c.height); for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3]; topeng = { a, w: c.width, h: c.height, fw: c.width / 10 }; } catch (e) { topeng = null; } });
  const warna = () => { const c = getComputedStyle(document.documentElement); const t = (n) => c.getPropertyValue('--' + n).trim(); return { sun: t('sun-400'), coral: t('coral-500'), white: t('white'), navy: t('navy-900'), blue: t('blue-500'), green: t('green-600'), violet: t('violet-600'), langit: t('ilus-langit-festival'), plaza: t('ilus-plaza') }; };

  function buat(dlg, opsi = {}) {
    const $ = (s) => dlg.querySelector(s);
    const kanvas = $('#lt-kanvas'), x = kanvas.getContext('2d');
    let W = 0, H = 0, dpr = 1, raf = 0, st = null, W8 = null;
    function ukur() { dpr = Math.min(2, window.devicePixelRatio || 1); const r = kanvas.getBoundingClientRect(); W = r.width; H = r.height; kanvas.width = W * dpr; kanvas.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); }
    new ResizeObserver(ukur).observe(kanvas);

    function baru() {
      return { nJurus: 0, meteor: null, perisai: 0, tKena: 0, tLalu: 0, hp: HP, hati: HATI, sisa: DURASI, combo: 0, comboMaks: 0, tTap: 0, dmg: 0, aman: 0, kritis: 0, partikel: [], konfeti: [], bara: [], debu: [], benturan: false, jejak: [], jurus: 'tusuk', urutJurus: 0, retak: null, getar: 0, kilat: 0, merah: 0,
        mulai: 0, jalan: false, akhir: null, tJurus: 0, awasSampai: 0, hindarOk: false, fase: 'hitung', hitung: 3, posX: 0.5, arah: 1, frame: 0, tRuntuh: 0, tAkhir: 0 };
    }
    const lamaSerang = () => (st.jurus === 'meteor' ? SERANG_METEOR : SERANG);
    const sedangSerang = (t) => !!(st.tSerang && t - st.tSerang < lamaSerang());
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
        const u = Math.min(1, 1 - (st.awasSampai - t) / AWAS), e = mudahKeluar(u);
        p.frame = 0;
        p.rot = -0.24 * e; p.sy = 1 - 0.12 * e; p.sx = 1 + 0.07 * e; p.dx = -b.w * 0.12 * e;
        const g = 0.006 + 0.022 * u; p.dx += Math.sin(t / 22) * b.w * g; p.dy = Math.cos(t / 27) * b.h * g * 0.5;
      } else if (sedangSerang(t)) {  // hentakan: menerjang ke depan & membesar, lalu pulih
        const u = (t - st.tSerang) / lamaSerang();
        // terjang 0–0,16 · tahan saat benturan 0,16–0,30 (hit-stop) · pulih ke kuda-kuda 0,30–1
        const maju = u < 0.16 ? mudahKeluar(u / 0.16) : u < 0.3 ? 1 : Math.max(0, 1 - (u - 0.3) / 0.7) ** 2;
        p.frame = u < 0.6 ? 4 : null;
        p.rot = 0.3 * maju; p.sx = 1 + 0.1 * maju; p.sy = 1 + 0.14 * maju;
        p.dx = b.w * 0.34 * maju; p.dy = b.h * 0.04 * maju; p.maju = maju;
      }
      return p;
    }
    // Efek benturan: jejak api oranye mengikuti sabetan senjata, ledakan bara & percikan, gelombang kejut + debu di kaki, getar.
    function mulaiBenturan(t, b) {
      st.benturan = true; st.getar = t; st.getarAmp = st.jurus === 'hentak' ? 2.4 : 1.6;
      const [px, py] = st.ujung || [b.cx, b.y + b.h * 0.45], n = st.jurus === 'hentak' ? 30 : 46;
      for (let i = 0; i < n; i++) { const a = st.jurus === 'hentak' ? -Math.PI * Math.random() : Math.random() * Math.PI * 2, v = 2 + Math.random() * 7; st.bara.push({ x: px, y: py, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, r: 1.5 + Math.random() * 2.5, t0: t, umur: 500 + Math.random() * 500 }); }
      const nd = st.jurus === 'hentak' ? 30 : 12;
      for (let i = 0; i < nd; i++) { const a = Math.random() * Math.PI, v = 1 + Math.random() * (st.jurus === 'hentak' ? 4 : 2.5); st.debu.push({ x: b.cx + (Math.random() - 0.5) * b.w * 0.4, y: b.kaki, vx: Math.cos(a) * v * (Math.random() < 0.5 ? -1 : 1) * 2, vy: -Math.sin(a) * v * 0.6, r: 8 + Math.random() * 16, t0: t, umur: 1000 }); }
      if (st.jurus === 'hentak') st.retak = Array.from({ length: 7 }, (_, i) => { const a = Math.PI * (0.05 + 0.9 * i / 6) + (Math.random() - 0.5) * 0.2; const tt = []; let r = 0; while (r < 1) { r += 0.15 + Math.random() * 0.15; tt.push([Math.cos(a + (Math.random() - 0.5) * 0.4) * r, Math.sin(a) * r * 0.25]); } return tt; });
    }
    // Efek per jurus: tusuk = garis kecepatan + kilatan di tinju; tebas = jejak api mengikuti ujung trisula; hentak = retakan + gelombang besar.
    function gambarBenturan(t, b, u) {
      const [px, py] = st.ujung || [b.cx, b.y + b.h * 0.45];
      x.save(); x.globalCompositeOperation = 'lighter';
      if (st.jurus === 'tebas' && st.jejak.length > 2 && u < 0.4) { // pita api mengikuti ujung trisula
        for (let i = 1; i < st.jejak.length; i++) {
          const [x0, y0] = st.jejak[i - 1], [x1, y1] = st.jejak[i], f = i / st.jejak.length, pud = u < 0.3 ? 1 : 1 - (u - 0.3) / 0.1;
          x.strokeStyle = `rgba(255,${120 + 110 * f},40,${0.9 * f * pud})`; x.lineWidth = 3 + 22 * f; x.lineCap = 'round';
          x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
        }
      }
      if (st.jurus === 'tusuk' && u < 0.35) { // garis kecepatan memancar dari tinju
        const k = 1 - u / 0.35;
        for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + 0.3, r0 = b.h * 0.08, r1 = b.h * (0.25 + 0.35 * (1 - k)); x.strokeStyle = `rgba(255,220,150,${0.55 * k})`; x.lineWidth = 2; x.beginPath(); x.moveTo(px + Math.cos(a) * r0, py + Math.sin(a) * r0); x.lineTo(px + Math.cos(a) * r1, py + Math.sin(a) * r1); x.stroke(); }
      }
      if (st.benturan) {
        const e = Math.max(0, Math.min(1, (u - 0.14) / 0.22)), k = 1 - e;
        if (k > 0) { const rr = b.h * (0.12 + 0.4 * e); const g = x.createRadialGradient(px, py, 0, px, py, rr); g.addColorStop(0, `rgba(255,250,220,${k})`); g.addColorStop(0.4, `rgba(255,170,40,${0.7 * k})`); g.addColorStop(1, 'rgba(255,80,20,0)'); x.fillStyle = g; x.beginPath(); x.arc(px, py, rr, 0, 6.28); x.fill(); }
        const w2 = (u - 0.14) / 0.6;
        if (w2 > 0 && w2 < 1) { const besar = st.jurus === 'hentak' ? 1.9 : 1.1; x.strokeStyle = `rgba(255,200,120,${0.65 * (1 - w2)})`; x.lineWidth = 4 * (1 - w2) + 1; x.beginPath(); x.ellipse(b.cx, b.kaki, b.w * (0.3 + besar * w2), b.w * (0.07 + 0.25 * besar * w2), 0, 0, 6.28); x.stroke(); }
      }
      x.restore();
      if (st.jurus === 'hentak' && st.retak && u < 0.95) { // retakan tanah
        x.save(); x.strokeStyle = `rgba(60,30,10,${0.8 * (1 - Math.max(0, u - 0.6) / 0.35)})`; x.lineWidth = 3;
        for (const r of st.retak) { x.beginPath(); x.moveTo(b.cx, b.kaki); for (const [a, c] of r) x.lineTo(b.cx + a * b.w * 1.1, b.kaki + c * b.w * 1.1); x.stroke(); }
        x.globalCompositeOperation = 'lighter'; x.strokeStyle = `rgba(255,120,30,${0.6 * (1 - u)})`; x.lineWidth = 1.5;
        for (const r of st.retak) { x.beginPath(); x.moveTo(b.cx, b.kaki); for (const [a, c] of r) x.lineTo(b.cx + a * b.w * 1.1, b.kaki + c * b.w * 1.1); x.stroke(); }
        x.restore();
      }
    }
    function gambarPartikelBenturan(t, f) { // f = dt × 60: gerak partikel sama cepat di layar 60/90/120 Hz
      x.save();
      st.debu = st.debu.filter((d) => t - d.t0 < d.umur);
      for (const d of st.debu) { const k = (t - d.t0) / d.umur; d.x += d.vx * f; d.y += d.vy * f; d.vy *= Math.pow(0.96, f); x.globalAlpha = 0.35 * (1 - k); x.fillStyle = 'rgb(205,180,140)'; x.beginPath(); x.arc(d.x, d.y, d.r * (1 + k * 1.5), 0, 6.28); x.fill(); }
      x.globalCompositeOperation = 'lighter';
      st.bara = st.bara.filter((p) => t - p.t0 < p.umur);
      for (const p of st.bara) { const k = (t - p.t0) / p.umur; p.x += p.vx * f; p.y += p.vy * f; p.vy += 0.25 * f; p.vx *= Math.pow(0.98, f); x.globalAlpha = 1 - k; x.fillStyle = k < 0.4 ? 'rgb(255,240,180)' : 'rgb(255,140,40)'; x.beginPath(); x.arc(p.x, p.y, p.r * (1 - k * 0.5), 0, 6.28); x.fill(); }
      x.restore();
    }
    // Lingkaran rune api di titik trisula tertancap: berdenyut selama hujan meteor.
    function gambarRune(t, [px, py], b, u) {
      const k = u < 0.07 ? u / 0.07 : u < 0.86 ? 1 : 1 - (u - 0.86) / 0.14, r = b.w * (0.35 + 0.25 * Math.min(1, u / 0.2));
      x.save(); x.globalCompositeOperation = 'lighter'; x.translate(px, py); x.scale(1, 0.28);
      x.globalAlpha = 0.85 * k; x.strokeStyle = 'rgb(255,120,40)'; x.lineWidth = 4;
      x.beginPath(); x.arc(0, 0, r, 0, 6.283); x.stroke();
      x.lineWidth = 2; x.beginPath(); x.arc(0, 0, r * 0.72, 0, 6.283); x.stroke();
      for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + t / 900; x.beginPath(); x.moveTo(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72); x.lineTo(Math.cos(a + 2.1) * r * 0.72, Math.sin(a + 2.1) * r * 0.72); x.stroke(); }
      const g = x.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, `rgba(255,190,80,${0.5 * k})`); g.addColorStop(1, 'rgba(255,60,20,0)'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, r, 0, 6.283); x.fill();
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

    // Pola: 2 jurus sasaran → Hujan Meteor menyusul tepat setelah jurus kedua selesai (bos diam menancapkan trisula).
    function jadwalJurus(t, awal) {
      if (!awal && st.jurus !== 'meteor' && st.nJurus % 2 === 0) { st.tJurus = t + SERANG + 350; st.berikutMeteor = true; return; }
      st.berikutMeteor = false; st.tJurus = t + (awal ? 5000 : st.jurus === 'meteor' ? 5200 : 6500) + Math.random() * 2500;
    }
    function tombolJurus(meteor) {
      $('#lt-hindar').innerHTML = meteor ? '<svg aria-hidden="true"><use href="#i-shield"/></svg>PERISAI' : '<svg aria-hidden="true"><use href="#i-run"/></svg>HINDAR';
      $('#lt-hindar').classList.toggle('is-perisai', meteor);
    }
    function hindar() {
      if (!st || st.fase !== 'main' || performance.now() > st.awasSampai) return;
      st.hindarOk = true; st.aman++; S().aman();
      if (st.jurus === 'meteor') { st.perisai = performance.now(); teks('PERISAI AKTIF!', W / 2, H * 0.62, W8.sun, 26); } else teks('AMAN!', W / 2, H * 0.62, W8.green, 26);
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
      const f = st.tLalu ? Math.min(3, (t - st.tLalu) / 16.67) : 1; st.tLalu = t;
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
        const halus = (u) => u * u * (3 - 2 * u);
        if (st.awasSampai) dorong = (st.jurus === 'meteor' ? -0.03 : 0.04) * halus(Math.min(1, 1 - (st.awasSampai - t) / AWAS));
        else if (sedangSerang(t) && st.jurus === 'meteor') { const u = (t - st.tSerang) / SERANG_METEOR; dorong = -0.03 * (u < 0.86 ? 1 : 1 - halus((u - 0.86) / 0.14)); }
        else if (sedangSerang(t)) { const u = (t - st.tSerang) / SERANG; dorong = u < 0.3 ? 0.04 + 0.04 * halus(Math.min(1, u / 0.16)) : 0.08 * (1 - halus(Math.min(1, (u - 0.3) / 0.7))); }
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
        if (!st.awasSampai && !sedangSerang(t)) { st.posX += st.arah * 0.12 * f / 60 * 1; if (st.posX > 0.72 || st.posX < 0.28) st.arah = st.posX > 0.72 ? -1 : 1; }
        if (!st.awasSampai && t > st.tJurus) {
          st.awasSampai = t + AWAS; st.hindarOk = false; st.perisai = 0;
          const R = window.YCSRajaRig;
          if (R) {
            if (st.berikutMeteor) st.jurus = 'meteor';
            else { const d = R.DAFTAR; if (!st.kantong || !st.kantong.length) { st.kantong = d.slice().sort(() => Math.random() - 0.5); if (st.kantong[0] === st.jurus) st.kantong.push(st.kantong.shift()); } st.jurus = st.kantong.shift(); st.nJurus++; }
            $('#lt-awas').textContent = st.jurus === 'meteor' ? R.JURUS.meteor.awas : R.JURUS[st.jurus].awas + ' Tekan HINDAR!';
          }
          tombolJurus(st.jurus === 'meteor');
          if (st.jurus === 'meteor') { const kb = bos(); st.meteor = R ? R.hujan(t, gerakMinim ? 8 : 30, { x0: W * 0.03, x1: W * 0.97, y0: kb.kaki - H * 0.12, y1: H * 0.98 }, [[W * 0.5, H * 0.93], [W * 0.3, H * 0.9], [W * 0.72, H * 0.95]]) : []; }
          $('#lt-awas').hidden = false; $('#lt-hindar').hidden = false; S().awas();
        }
        if (st.awasSampai && t > st.awasSampai) {
          // jurus sasaran: kena saat benturan; meteor: kena saat meteor pertama menghantam (≈25% hujan)
          if (!st.hindarOk) st.tKena = t + (st.jurus === 'meteor' ? SERANG_METEOR * 0.24 : 0);
          st.awasSampai = 0; st.tSerang = t; st.benturan = false; $('#lt-awas').hidden = true; $('#lt-hindar').hidden = true; jadwalJurus(t);
        }
        if (st.tKena && t >= st.tKena) {
          st.tKena = 0; st.hati--; st.merah = t; S().kena(); hati(); teks(st.jurus === 'meteor' ? '-1 nyawa · kena meteor' : '-1 nyawa', W / 2, H * 0.6, W8.coral, 24);
          if (navigator.vibrate && !gerakMinim) try { navigator.vibrate([40, 30, 40]); } catch (e) {}
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
        const A = aset.lari, RIG = window.YCSRajaRig;
        if (!st.rig && RIG && A.complete && A.naturalWidth) st.rig = rigCache || (rigCache = RIG.bangun(A));
        const menyerang = !gerakMinim && st.rig && (st.awasSampai || sedangSerang(t));
        const faseBaru = menyerang ? (st.awasSampai ? 'awal' : 'serang') : ''; if (dlg.dataset.fase !== faseBaru) dlg.dataset.fase = faseBaru;
        if (menyerang) {
          // ===== Jurus (rig: badan melengkung + lengan berputar di bahu) =====
          const awal = !!st.awasSampai, pp = awal ? Math.min(1, 1 - (st.awasSampai - t) / AWAS) : (t - st.tSerang) / lamaSerang(), met = st.jurus === 'meteor';
          const P = RIG.pose(st.jurus, awal ? 'awal' : 'serang', pp, t);
          const o = { x: b.x, y: b.y, w: b.w, h: b.h, balik: st.arah < 0 };
          // api di BELAKANG tubuh (mengumpul → meledak), posisinya mengikuti jenis jurus
          // frame api mengambang + crossfade dua frame berurutan → api mengalir halus (bukan patah 16 frame)
          const F = aset.api, pa = met && !awal ? Math.min(1, pp / 0.35) : pp, kf = awal ? Math.min(7.99, pa * 8) : 8 + Math.min(7.99, pa * 8), k = Math.floor(kf), kfr = kf - k;
          const gelap = met ? (awal ? 0.12 + 0.25 * pp : pp < 0.86 ? 0.37 : 0.37 * (1 - (pp - 0.86) / 0.14)) : kf < 8 ? 0.1 + kf * 0.03 : 0.34 - (kf - 8) * 0.04;
          x.fillStyle = met ? `rgba(40,6,10,${gelap})` : `rgba(6,24,64,${gelap})`; x.fillRect(0, 0, W, H);
          const apiDi = (alpha, skala) => {
            if (!F.complete || !F.naturalWidth) return;
            const fw = F.naturalWidth / 16, fh = F.naturalHeight, lw = b.h * 2.1 * skala, lh = lw * fh / fw;
            const cy = st.jurus === 'hentak' || met ? b.kaki - lh * 0.3 : b.y + b.h * 0.5 - lh * 0.06;
            x.save(); x.globalCompositeOperation = 'lighter';
            if (st.arah < 0) { x.translate(b.cx, 0); x.scale(-1, 1); x.translate(-b.cx, 0); }
            x.globalAlpha = alpha * (1 - kfr); x.drawImage(F, k * fw, 0, fw, fh, b.cx - lw / 2, cy - lh * 0.5, lw, lh);
            if (k < 15) { x.globalAlpha = alpha * kfr; x.drawImage(F, (k + 1) * fw, 0, fw, fh, b.cx - lw / 2, cy - lh * 0.5, lw, lh); }
            x.restore();
          };
          apiDi(met ? (awal ? 0.4 : 0.7) : 1, st.jurus === 'hentak' ? 1.3 : met ? 0.9 : 1);
          // bayangan gerak saat hentakan
          if (!awal && !met && pp < 0.4) for (const [mund, al] of [[0.1, 0.18], [0.05, 0.3]]) {
            const Pg = RIG.pose(st.jurus, 'serang', Math.max(0, pp - mund), t);
            x.save(); x.globalAlpha = al; x.filter = 'sepia(1) saturate(5) hue-rotate(-25deg) brightness(1.15)'; RIG.gambar(x, st.rig, o, Pg, t); x.restore();
          }
          if (st.kilat && t - st.kilat < 90) x.filter = 'brightness(2.2)';
          st.ujung = RIG.gambar(x, st.rig, o, P, t);
          x.filter = 'none';
          apiDi(0.3, 1); // lapisan api tipis di depan agar menyatu
          if (st.ujung) { st.jejak.push([st.ujung[0], st.ujung[1], t]); if (st.jejak.length > 14) st.jejak.shift(); }
          if (!awal && P.benturan && !st.benturan) mulaiBenturan(t, b);
          st.gambar = { i: 0, x: b.x, y: b.y, w: b.w, h: b.h, balik: st.arah < 0, pivX: b.cx, pivY: b.kaki, pose: { rot: 0, sx: P.skala, sy: P.skala, dx: 0, dy: -P.angkat * b.h } };
          if (!awal && !met) gambarBenturan(t, b, pp);
          if (met && !awal && st.ujung) gambarRune(t, st.ujung, b, pp);
        } else if (A.complete && A.naturalWidth) {
          st.frame = Math.floor(t / 90) % 10; st.jejak.length = 0;
          x.save();
          if (st.arah < 0) { x.translate(b.cx, 0); x.scale(-1, 1); x.translate(-b.cx, 0); }
          if (st.kilat && t - st.kilat < 90) x.filter = 'brightness(2.2)';
          x.drawImage(A, st.frame * 166, 0, 166, 200, b.x, b.y, b.w, b.h);
          x.restore();
          st.gambar = { i: st.frame, x: b.x, y: b.y, w: b.w, h: b.h, balik: st.arah < 0, pivX: b.cx, pivY: b.kaki, pose: null };
        }
      }
      gambarPartikelBenturan(t, f);
      if (st.jurus === 'meteor' && st.meteor && st.tSerang && sedangSerang(t) && window.YCSRajaRig) {
        const u = (t - st.tSerang) / SERANG_METEOR;
        const g = window.YCSRajaRig.gambarHujan(x, st.meteor, u, Math.min(W, H) * 0.05, H, { hemat: gerakMinim });
        if (g > 0.3 && !gerakMinim) { st.getar = t; st.getarAmp = 1.1 * g; }
        if (st.perisai) window.YCSRajaRig.gambarPerisai(x, W / 2, H * 1.02, Math.min(W * 0.46, H * 0.3), t, Math.min(1, (t - st.perisai) / 200) * (u > 0.92 ? (1 - u) / 0.08 : 1), g);
      } else if (st.perisai && st.awasSampai && window.YCSRajaRig) window.YCSRajaRig.gambarPerisai(x, W / 2, H * 1.02, Math.min(W * 0.46, H * 0.3), t, Math.min(1, (t - st.perisai) / 200), 0);
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
      tombolJurus(false); $('#lt-hasil').hidden = true; $('#lt-waktu').textContent = DURASI; $('#lt-combo').textContent = ''; hati();
      cancelAnimationFrame(raf); ukur(); raf = requestAnimationFrame(gambar);
    }
    // Layar penuh saat mulai (gestur klik pemain). iPhone tanpa Fullscreen API: dialog sudah 100dvh.
    let kitaPenuh = false;
    function layarPenuh() {
      const d = document.documentElement, minta = d.requestFullscreen || d.webkitRequestFullscreen;
      if (!minta || document.fullscreenElement || document.webkitFullscreenElement) return null;
      try {
        const p = minta.call(d, { navigationUI: 'hide' }); kitaPenuh = true;
        if (!p || !p.then) return null;
        return p.then(() => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('portrait').catch(() => {}); } catch (e) {} }, () => { kitaPenuh = false; });
      } catch (e) { kitaPenuh = false; return null; }
    }
    function keluarPenuh() {
      if (!kitaPenuh) return; kitaPenuh = false;
      const k = document.exitFullscreen || document.webkitExitFullscreen;
      if (k && (document.fullscreenElement || document.webkitFullscreenElement)) try { const p = k.call(document); if (p && p.catch) p.catch(() => {}); } catch (e) {}
    }
    // Dialog dibuka SETELAH layar penuh aktif: elemen layar penuh masuk top layer belakangan dan akan menutupi
    // dialog yang dibuka lebih dulu.
    function buka() {
      let sudah = false;
      const jalan = () => { if (sudah) return; sudah = true; if (!dlg.open) dlg.showModal(); mulai(); };
      const p = layarPenuh();
      if (p) { p.then(jalan, jalan); setTimeout(jalan, 700); } else jalan();
    }
    function tutup() { cancelAnimationFrame(raf); st = null; if (dlg.open) dlg.close(); keluarPenuh(); }
    $('#lt-tutup').addEventListener('click', tutup);
    $('#lt-keluar').addEventListener('click', tutup);
    $('#lt-lagi').addEventListener('click', () => { S().klik(); mulai(); });
    dlg.addEventListener('close', () => { cancelAnimationFrame(raf); st = null; keluarPenuh(); });
    return { buka, tutup };
  }
  window.YCSLatihan = { buat };
})();
