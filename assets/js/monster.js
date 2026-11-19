/* Lawan Monster — event kolaboratif di panggung Festival Satu Kata.
   Tanpa library: satu <canvas> overlay + elemen HUD. Animasi hanya berjalan saat event tampil di layar.
   Alur tap: ketuk warga → tenaga turun dari langit ke warga → mengalir ke bar bersama.
   Tap dikumpulkan lalu dikirim per batch (interval dari server). Bila offline, antrean disimpan di
   localStorage dan dikirim ulang dengan seq yang sama (server menolak duplikat → tidak terhitung dua kali). */
(() => {
  'use strict';
  const nf = new Intl.NumberFormat('id-ID');
  const UJI = /[?&]uji-monster=/.test(location.search);
  const KUNCI_TOKEN = UJI ? 'ycs_mon_tok_uji' : 'ycs_mon_tok', KUNCI_ANTRE = UJI ? 'ycs_mon_antre_uji' : 'ycs_mon_antre';
  const MAKS_ANTRE = 150;      // batas tap tersimpan di klien (server tetap membatasi 10 tap/detik)
  const MAKS_PARTIKEL = 70;    // batas partikel agar HP kelas bawah tetap lancar
  const simpan = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const baca = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const mudah = (t) => 1 - Math.pow(1 - t, 3);
  const jam = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); const m = Math.floor(s / 60); return (m >= 60 ? Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0') : m) + ':' + String(s % 60).padStart(2, '0'); };

  function pasang(opsi) {
    const stage = opsi.stage, fest = opsi.festApi, now = opsi.now || Date.now;
    const endpoint = opsi.endpoint || '/api/monster';
    // Mode uji monster (dibuka admin): ?uji-monster=KODE → event terpisah, hanya terlihat oleh pembawa link,
    // tidak wajib membuka festival dan tidak mengikat perangkat. Token & antrean disimpan terpisah.
    const uji = (new URLSearchParams(location.search).get('uji-monster') || '').replace(/[^\w-]/g, '').slice(0, 20) || null;
    const bolehTap = () => !!uji || opsi.bolehTap();
    const gerakMinim = matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- DOM ---------- */
    const el = document.createElement('div');
    el.className = 'mon';
    el.hidden = true;
    el.innerHTML = `
      <canvas class="mon__kanvas" aria-hidden="true"></canvas>
      <div class="mon__tangkap" role="button" tabindex="0" aria-label="Ketuk untuk mengirim tenaga ke monster"></div>
      <div class="mon__hud" aria-live="polite">
        <div class="mon__baris"><span class="badge badge--live">Live</span><strong class="mon__nama"></strong><span class="mon__lvl"></span><span class="mon__pemain"></span></div>
        <div class="mon__bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-label="Tenaga bersama"><i></i><b></b></div>
        <div class="mon__baris mon__baris--kecil"><span class="mon__angka"></span><span class="mon__saya"></span></div>
        <div class="mon__nyawa" hidden><span>Warga hidup</span><div class="mon__nbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-label="Warga hidup"><i></i></div><b class="mon__npersen"></b></div>
      </div>
      <p class="mon__awas" hidden></p>
      <button type="button" class="mon__hindar" hidden><svg aria-hidden="true" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="14" cy="4.5" r="2"/><path d="m8 21 3-6 3 2v5M6 11l3-3 4 1 3 4 3 1M11 15l1-5"/></g></svg>HINDAR</button>
      <div class="mon__tiket" hidden><small>Tiket kamu</small><strong></strong><span></span></div>
      <p class="mon__ajak"></p>
      <div class="mon__pesan" hidden><h3></h3><p></p><a class="btn btn--live btn--sm" target="_blank" rel="noopener" hidden><svg aria-hidden="true" viewBox="0 0 24 24"><path fill="currentColor" d="M8 5.5v13l11-6.5Z"/></svg>Tonton live</a><button type="button" class="btn btn--soft btn--sm mon__bagi">Ajak teman</button><button type="button" class="btn btn--soft btn--sm mon__tutup">Kembali ke festival</button></div>`;
    stage.append(el);
    const kanvas = el.querySelector('.mon__kanvas'), ctx = kanvas.getContext('2d');
    const tangkap = el.querySelector('.mon__tangkap'), hud = el.querySelector('.mon__hud');
    const $ = (s) => el.querySelector(s);
    const pesan = $('.mon__pesan');

    // Banner di luar panggung: mengajak pengunjung yang sedang di bagian lain halaman.
    const banner = document.createElement('a');
    banner.className = 'mon-banner';
    banner.href = '#satu-kata';
    banner.hidden = true;
    document.body.append(banner);
    let panggungTerlihat = false;
    if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { panggungTerlihat = e.isIntersecting; aturBanner(); if (panggungTerlihat) mulaiGambar(); }, { threshold: 0.25 }).observe(stage);

    /* ---------- Aset (dimuat hanya saat event ada) ---------- */
    const aset = {};
    function muatAset(wujud) {
      if (wujud !== 'raja_batu' || aset.lari) return;
      const img = (src) => { const i = new Image(); i.decoding = 'async'; i.src = src; return i; };
      aset.lari = img('/assets/img/monster/raja-lari.webp');     // 10 frame horizontal
      aset.runtuh = img('/assets/img/monster/raja-runtuh.webp'); // 9 frame horizontal
      aset.api = img('/assets/img/monster/raja-api.webp');       // 16 frame efek api dari GIF serangan panitia (tanpa latar)
      aset.lari.addEventListener('load', () => { aset.topeng = topeng(aset.lari, 10); });
    }
    // Topeng alfa sprite (per piksel) agar hanya TUBUH monster yang bisa dipukul, bukan kotak di sekitarnya.
    function topeng(gbr, n) {
      try {
        const c = document.createElement('canvas'); c.width = gbr.naturalWidth; c.height = gbr.naturalHeight;
        const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(gbr, 0, 0);
        const d = x.getImageData(0, 0, c.width, c.height).data, a = new Uint8Array(c.width * c.height);
        for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3];
        return { a, w: c.width, h: c.height, fw: c.width / n };
      } catch (e) { return null; }
    }
    let gambarTerakhir = null; // {i, x, y, w, h, balik} sprite Raja Batu yang terakhir digambar
    let poseApi = { dx: 0, dy: 0 }, tubuhUlang = null, jurusAktif = null;
    function kenaTubuh(px, py) {
      const g = gambarTerakhir, m = aset.topeng;
      if (!g || !m) return null; // belum siap → pakai kotak lama
      if (g.pose && (g.pose.rot || g.pose.dx)) { const q = g.pose, ax = px - g.pivX - q.dx, ay = py - g.pivY - q.dy, c = Math.cos(-q.rot), sn = Math.sin(-q.rot); px = g.pivX + (ax * c - ay * sn) / q.sx; py = g.pivY + (ax * sn + ay * c) / q.sy; }
      const r = Math.max(6, g.w * 0.035); // toleransi jari kecil di tepi tubuh
      for (const [dx, dy] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) {
        let u = (px + dx - g.x) / g.w; const v = (py + dy - g.y) / g.h;
        if (g.balik) u = 1 - u;
        if (u < 0 || u > 1 || v < 0 || v > 1) continue;
        const sx = Math.floor(g.i * m.fw + u * (m.fw - 1)), sy = Math.floor(v * (m.h - 1));
        if (m.a[sy * m.w + sx] > 90) return true;
      }
      return false;
    }
    // Bola cahaya dirender sekali lalu dipakai ulang (lebih murah daripada gradient per frame).
    const bola = document.createElement('canvas');
    bola.width = bola.height = 48;
    { const b = bola.getContext('2d'); const g = b.createRadialGradient(24, 24, 0, 24, 24, 24);
      g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(0.25, 'rgba(255,224,102,.95)'); g.addColorStop(0.6, 'rgba(255,170,40,.35)'); g.addColorStop(1, 'rgba(255,170,40,0)');
      b.fillStyle = g; b.fillRect(0, 0, 48, 48); }

    /* ---------- State ---------- */
    let st = null;            // status terakhir dari server
    let tampilTenaga = 0;     // nilai bar yang dianimasikan
    let W = 0, H = 0, dpr = 1, raf = 0, tLalu = 0;
    const partikel = [];      // {x0,y0,x1,y1,x2,y2,t0,d1,d2,poin,diri}
    const teks = [];          // angka "+2" melayang
    let pukul = 0;            // waktu terakhir monster terkena tenaga (untuk efek kedip)
    let tumbuh = { dari: 1, ke: 1, t0: 0 };
    let akhir = null;         // animasi kemenangan {t0}
    let levelLama = 0, idLama = '', ditutup = '';
    let token = baca(KUNCI_TOKEN);
    let tiketSaya = null, blokir = null, karakterMati = false, hindarKe = 0, hpSaya = null, aku_sasaran = false; // karakter milik pemain: tumbang = tidak bisa menyerang // blokir: {error, nama} bila aturan 1 perangkat = 1 peserta menolak

    // Identitas perangkat: acak sekali, disimpan di localStorage + cookie (dipakai bersama halaman lain).
    function idPerangkat() {
      let id = null;
      try { id = localStorage.getItem('ycs_perangkat'); } catch (e) {}
      if (!id) { const m = document.cookie.match(/(?:^|; )ycs_perangkat=([\w-]{16,64})/); id = m && m[1]; }
      if (!id) id = crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
      try { localStorage.setItem('ycs_perangkat', id); } catch (e) {}
      document.cookie = 'ycs_perangkat=' + id + '; max-age=34560000; path=/; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
      return id;
    }
    // Sidik jari ringan (bukan pelacak): hanya untuk menandai tiket dari perangkat yang tampak sama agar ditinjau panitia.
    async function sidik() {
      try {
        const c = document.createElement('canvas'); c.width = 120; c.height = 30;
        const x = c.getContext('2d'); x.font = '16px sans-serif'; x.fillStyle = '#f60'; x.fillText('YCS-2026 ✓', 2, 20);
        const bahan = [navigator.userAgent, navigator.language, Intl.DateTimeFormat().resolvedOptions().timeZone, screen.width + 'x' + screen.height + '@' + devicePixelRatio,
          navigator.hardwareConcurrency, navigator.deviceMemory, navigator.platform, c.toDataURL().slice(-64)].join('|');
        const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(bahan));
        return Array.from(new Uint8Array(h).slice(0, 12), (b) => b.toString(16).padStart(2, '0')).join('');
      } catch (e) { return ''; }
    }
    const PESAN_BLOKIR = {
      perangkat_dipakai: (d) => `Perangkat ini sudah terdaftar atas nama ${d.nama || 'peserta lain'}. 1 perangkat hanya untuk 1 peserta.`,
      email_perangkat_lain: () => 'Emailmu sudah dipakai ikut dari perangkat lain. 1 peserta hanya dari 1 perangkat. Hubungi panitia bila ganti HP.',
      uji_berakhir: () => 'Link uji ini sudah tidak berlaku. Minta link baru ke admin.',
      belum_festival: () => 'Datamu belum tercatat di festival. Kirim satu kata dulu, lalu ikut melawan.',
      tanpa_identitas: () => 'Isi ulang data festival (nama, sekolah, email) di bawah untuk ikut melawan.',
    };
    let antre = baca(KUNCI_ANTRE) || { e: '', n: 0, kirim: null, seq: 0 };
    let timerPoll = 0, timerKirim = 0, sedangKirim = false, gagalBeruntun = 0;

    function ukur() {
      const w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = w; H = h;
      kanvas.width = Math.round(w * dpr); kanvas.height = Math.round(h * dpr);
    }
    new ResizeObserver(ukur).observe(stage);

    const levelIdx = () => Math.max(0, Math.min((st.levelMaks || 1) - 1, (st.level || 1) - 1));
    const target = () => (st && st.target ? st.target[levelIdx()] : 1);
    const poin = () => (st && st.poin ? st.poin[levelIdx()] : 1);
    const pending = () => antre.n + (antre.kirim ? antre.kirim.n : 0);

    // Posisi monster: tengah plaza, kaki di sekitar 80% lantai. Tinggi mengikuti skala level.
    // Monster berkeliling plaza: posisi ternormalisasi (x 0..1 lebar, y 0..1 kedalaman lantai).
    const jalan = { x: 0.5, y: 0.72, tx: 0.5, ty: 0.72, arah: 1, jeda: 0.8, bergerak: false };
    const sinarJurus = [];   // pancaran jurus: {t0, x0, y0, x1, y1}
    const konfeti = [];
    let jurusDitembak = 0, jurusSinkron = 0, prediksi = null; // prediksi: {ke, nyawa} sampai server mengonfirmasi jurus
    const AWAL_JURUS = 1300; // telegraf (ms) sebelum jurus
    // Animasi jurus (digambar sendiri di kanvas, durasi dari admin: monster_jurus_anim).
    // p 0..LEPAS = mengumpulkan api, LEPAS = ledakan tepat di waktu jurus (pancaran keluar), sesudahnya gelombang api.
    const LEPAS = 0.55;
    const serangMs = () => (st && st.jurusAnimMs) || 1600;
    function progresSerang() {
      const D = serangMs();
      if (akhir && akhir.jenis === 'monster') { const u = (performance.now() - akhir.t0) / D; return u >= 0 && u < 1 ? u : null; }
      const s = sisaJurus();
      return s <= D * LEPAS && s > -D * (1 - LEPAS) ? (D * LEPAS - s) / D : null;
    }
    // Getaran layar sesaat setelah ledakan.
    function getarLayar() {
      const p = progresSerang();
      if (p == null || gerakMinim || p < LEPAS || p > LEPAS + 0.18) return 0;
      return (1 - (p - LEPAS) / 0.18) * 7;
    }
    const sisaJurus = () => (st && st.fase === 'tanding' && st.jurus && st.jurusBerikut ? st.jurusBerikut - now() : Infinity);
    function gerakMonster(dt) {
      jalan.bergerak = false;
      if (!st || gerakMinim || !dt) return;
      if (akhir && akhir.jenis === 'kabur') { jalan.arah = jalan.x < 0.5 ? -1 : 1; jalan.x += jalan.arah * dt * 0.5; jalan.bergerak = true; return; }
      if (akhir || st.fase !== 'tanding' || progresSerang() != null) return;
      // Kejar sasaran jurus berikutnya: berdiri di samping warga sasaran terdekat yang masih berdiri.
      const kejar = sasaranTerdekat();
      if (kejar) {
        jalan.tx = Math.min(0.85, Math.max(0.15, kejar.x + (kejar.x > jalan.x ? -0.07 : 0.07)));
        jalan.ty = Math.min(0.9, Math.max(0.45, kejar.y));
        jalan.jeda = 0;
      } else if (jalan.jeda > 0) { jalan.jeda -= dt; return; }
      const dx = jalan.tx - jalan.x, dy = jalan.ty - jalan.y, d = Math.hypot(dx, dy);
      if (d < 0.01) { if (kejar) return; jalan.tx = 0.24 + Math.random() * 0.52; jalan.ty = 0.6 + Math.random() * 0.24; jalan.jeda = 0.3 + Math.random() * 1.3; jalan.v = 0; return; }
      // kecepatan naik-turun halus (ease) menuju target, melambat saat hampir sampai
      const maks = (kejar ? 0.13 : 0.075) * (1 + 0.2 * levelIdx());
      jalan.v = (jalan.v || 0) + (Math.min(maks, d * 1.6) - (jalan.v || 0)) * Math.min(1, dt * 3);
      const v = jalan.v * dt;
      jalan.x += dx / d * Math.min(v, d); jalan.y += dy / d * Math.min(v, d) * 0.6;
      if (Math.abs(dx) > 0.004) jalan.arah = dx < 0 ? -1 : 1;
      jalan.bergerak = true;
    }
    // Warga sasaran (dari server) yang paling dekat dengan monster.
    let sasaranWarga = [];
    function sasaranTerdekat() {
      let pilih = null, jarak = Infinity;
      for (const w of sasaranWarga) {
        if (!w || w.mati) continue;
        const d = Math.abs(w.x - jalan.x) + Math.abs(w.y - jalan.y) * 0.6;
        if (d < jarak) { jarak = d; pilih = w; }
      }
      return pilih;
    }
    function terapkanSasaran() {
      if (!fest || !fest.cariNK) return;
      sasaranWarga = (st && st.fase === 'tanding' && st.jurusTarget || []).map(([n, k]) => fest.cariNK(n, k)).filter(Boolean);
      fest.setSasaran(sasaranWarga);
      aku_sasaran = !!(fest.saya && sasaranWarga.includes(fest.saya));
    }
    function geometri() {
      const l = fest && fest.lantai ? fest.lantai() : { y0: H * 0.35, y1: H * 0.97 };
      const skala = st && st.skala ? st.skala[levelIdx()] : 1;
      const tt = Math.min(1, (performance.now() - tumbuh.t0) / 900);
      const s = tumbuh.dari + (tumbuh.ke - tumbuh.dari) * mudah(tt);
      const dalam = 0.88 + 0.5 * (jalan.y - 0.6); // makin dekat penonton makin besar
      const besar = akhir && akhir.jenis === 'monster' ? 1 + 0.2 * Math.min(1, (performance.now() - akhir.t0) / 900) : 1;
      const tinggi = Math.min(H * 0.82, H * 0.3 * (tumbuh.t0 ? s : skala) * (W < 520 ? 1.15 : 1) * dalam * besar);
      const kaki = l.y0 + (l.y1 - l.y0) * jalan.y;
      return { x: W * jalan.x, kaki, tinggi, atas: kaki - tinggi, lebar: tinggi * (st && st.wujud === 'lucu' ? 1.05 : 0.8) };
    }
    // Titik tujuan aliran tenaga di bar (koordinat panggung).
    function titikBar() {
      const r = hud.getBoundingClientRect(), s = stage.getBoundingClientRect();
      const bar = $('.mon__bar').getBoundingClientRect();
      const frac = Math.min(1, tampilTenaga / Math.max(1, target()));
      return { x: bar.left - s.left + bar.width * Math.max(0.04, frac), y: bar.top - s.top + bar.height / 2 || r.bottom - s.top };
    }

    /* ---------- Gambar ---------- */
    function gambarMonsterLucu(g, t, kedip, mati) {
      // Monster kartun bulat bernuansa Bali: badan emas, kain poleng, mahkota kecil, mata besar, pipi merah.
      const { x, kaki, tinggi } = g;
      const r = tinggi * 0.42, cy = kaki - r * 1.05 - Math.sin(t / 380) * r * 0.04;
      ctx.save();
      ctx.translate(x, cy);
      if (mati) { ctx.globalAlpha = 1 - mati; ctx.scale(1 - mati * 0.9, 1 - mati * 0.9); ctx.rotate(mati * 2); }
      // bayangan
      ctx.fillStyle = 'rgba(80,50,20,.18)';
      ctx.beginPath(); ctx.ellipse(0, r * 1.05, r * 0.9, r * 0.18, 0, 0, Math.PI * 2); ctx.fill();
      // kaki
      ctx.fillStyle = '#E2A03B';
      [-0.45, 0.45].forEach((k) => { ctx.beginPath(); ctx.ellipse(r * k, r * 0.92, r * 0.24, r * 0.16, 0, 0, Math.PI * 2); ctx.fill(); });
      // badan
      const gb = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r * 1.1);
      gb.addColorStop(0, '#FFE58A'); gb.addColorStop(1, '#F2A93B');
      ctx.fillStyle = gb;
      ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.95, 0, 0, Math.PI * 2); ctx.fill();
      // kain poleng (kotak hitam-putih)
      ctx.save();
      ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.95, 0, 0, Math.PI * 2); ctx.clip();
      const kot = r * 0.18;
      for (let i = -6; i < 6; i++) for (let j = 0; j < 3; j++) { ctx.fillStyle = (i + j) % 2 ? '#2B2B2B' : '#FFFFFF'; ctx.fillRect(i * kot, r * 0.42 + j * kot, kot, kot); }
      ctx.fillStyle = '#D7263D'; ctx.fillRect(-r, r * 0.34, r * 2, r * 0.1);
      ctx.restore();
      // tangan melambai
      ctx.strokeStyle = '#E2A03B'; ctx.lineWidth = r * 0.16; ctx.lineCap = 'round';
      const lam = Math.sin(t / 220) * 0.4;
      ctx.beginPath(); ctx.moveTo(-r * 0.9, 0); ctx.lineTo(-r * 1.25, -r * (0.3 + lam)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * 0.9, 0); ctx.lineTo(r * 1.25, -r * (0.3 - lam)); ctx.stroke();
      // mahkota kecil
      ctx.fillStyle = '#FFC93C'; ctx.strokeStyle = '#B7791F'; ctx.lineWidth = r * 0.03;
      ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.82);
      [-0.25, -0.1, 0.1, 0.25, 0.4].forEach((k, i) => ctx.lineTo(r * k, -r * (i % 2 ? 0.82 : 1.15)));
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#D7263D'; ctx.beginPath(); ctx.arc(0, -r * 0.95, r * 0.06, 0, Math.PI * 2); ctx.fill();
      // mata besar
      const kedipMata = (Math.floor(t / 2600) % 3 === 0 && (t % 2600) < 140) ? 0.15 : 1;
      [-0.35, 0.35].forEach((k) => {
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(r * k, -r * 0.25, r * 0.22, r * 0.24 * kedipMata, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2B1A10'; ctx.beginPath(); ctx.ellipse(r * k + r * 0.03, -r * 0.22, r * 0.11, r * 0.13 * kedipMata, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(r * k + r * 0.07, -r * 0.28, r * 0.04, 0, Math.PI * 2); ctx.fill();
      });
      // pipi & mulut tersenyum (lidah kecil)
      ctx.fillStyle = 'rgba(255,107,107,.55)';
      [-0.6, 0.6].forEach((k) => { ctx.beginPath(); ctx.ellipse(r * k, r * 0.02, r * 0.12, r * 0.08, 0, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = '#7A2E1F'; ctx.beginPath(); ctx.arc(0, r * 0.05, r * 0.2, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#FF7B9C'; ctx.beginPath(); ctx.ellipse(0, r * 0.18, r * 0.09, r * 0.06, 0, 0, Math.PI * 2); ctx.fill();
      // kedip putih saat terkena tenaga
      if (kedip > 0) { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = `rgba(255,255,255,${kedip * 0.6})`; ctx.fillRect(-r * 1.4, -r * 1.3, r * 2.8, r * 2.6); }
      ctx.restore();
    }
    function gambarRajaBatu(g, t, kedip, mati) {
      const lari = aset.lari, runtuh = aset.runtuh;
      const ps = mati == null ? progresSerang() : null;
      const sumber = mati != null && runtuh && runtuh.complete ? runtuh : lari;
      if (!sumber || !sumber.complete || !sumber.naturalWidth) return gambarMonsterLucu(g, t, kedip, mati);
      const n = sumber === runtuh ? 9 : 10;
      const fw = sumber.naturalWidth / n, fh = sumber.naturalHeight;
      const i = sumber === runtuh ? Math.min(n - 1, Math.floor((mati || 0) * n)) : ps != null ? (ps < LEPAS ? 0 : ps < LEPAS + 0.25 ? 4 : 5) : Math.floor(t / (jalan.bergerak ? 170 : 520)) % n;
      // saat jurus: monster terangkat & membesar sedikit (mengumpulkan tenaga), lalu menghentak saat ledakan
      const angkat = ps == null ? 0 : ps < LEPAS ? ps / LEPAS : Math.max(0, 1 - (ps - LEPAS) / 0.2);
      const h = g.tinggi * (1 + 0.07 * angkat), w = h * fw / fh;
      const siaga = sisaJurus() < AWAL_JURUS || (akhir && akhir.jenis === 'monster');
      const goyang = kedip > 0 || siaga ? Math.sin(t / 18) * h * (siaga ? 0.02 : 0.012) : 0;
      ctx.save();
      ctx.fillStyle = 'rgba(60,40,20,.2)';
      ctx.beginPath(); ctx.ellipse(g.x, g.kaki, w * 0.42, h * 0.06, 0, 0, Math.PI * 2); ctx.fill();
      if (siaga) gambarAura(g, t);
      // Gerak tubuh selaras efek api: ancang-ancang (tegak, condong ke belakang, jongkok, gemetar) → terjang ke depan → pulih.
      const pz = { rot: 0, sx: 1, sy: 1, dx: 0, dy: 0 };
      if (ps != null && !gerakMinim) {
        const keluar = (u) => 1 - Math.pow(1 - u, 3), arahP = jalan.arah < 0 ? -1 : 1;
        if (ps < LEPAS) { const u = ps / LEPAS, e = keluar(u); pz.rot = -0.24 * e; pz.sy = 1 - 0.12 * e; pz.sx = 1 + 0.07 * e; pz.dx = -w * 0.12 * e + Math.sin(t / 22) * w * (0.006 + 0.022 * u); pz.dy = Math.cos(t / 27) * h * 0.01 * u; }
        else { const u = (ps - LEPAS) / (1 - LEPAS), m = u < 0.16 ? keluar(u / 0.16) : u < 0.3 ? 1 : Math.max(0, 1 - (u - 0.3) / 0.7) ** 2; pz.rot = 0.3 * m; pz.sx = 1 + 0.1 * m; pz.sy = 1 + 0.14 * m; pz.dx = w * 0.34 * m; pz.dy = h * 0.04 * m; }
        pz.rot *= arahP; pz.dx *= arahP;
        ctx.translate(g.x + pz.dx, g.kaki + pz.dy); ctx.rotate(pz.rot); ctx.scale(pz.sx, pz.sy); ctx.translate(-g.x, -g.kaki);
      }
      const RIG = window.YCSRajaRig;
      if (ps == null) jurusAktif = null;
      if (ps != null && !gerakMinim && RIG && lari.complete) {
        // Jurus memakai rig (badan melengkung + lengan berputar). Jenis jurus berganti tiap jurus (sama untuk semua pemain).
        if (!aset.rig) aset.rig = RIG.bangun(lari);
        if (!jurusAktif) jurusAktif = RIG.DAFTAR[((st && st.jurusKe) || 0) % RIG.DAFTAR.length];
        if (aset.rig) {
          ctx.restore(); ctx.save();
          const awal = ps < LEPAS, P = RIG.pose(jurusAktif, awal ? 'awal' : 'serang', awal ? ps / LEPAS : (ps - LEPAS) / (1 - LEPAS), t);
          const o = { x: g.x - w / 2, y: g.kaki - h, w, h, balik: jalan.arah < 0 };
          RIG.gambar(ctx, aset.rig, o, P, t);
          tubuhUlang = { rig: true, o, P, t };
          gambarTerakhir = { i: 0, x: o.x, y: o.y, w, h, balik: o.balik, pivX: g.x, pivY: g.kaki, pose: { rot: 0, sx: P.skala, sy: P.skala, dx: 0, dy: -P.angkat * h } };
          poseApi = { dx: 0, dy: 0 };
          ctx.restore();
          return;
        }
      }
      ctx.translate(g.x, 0); ctx.scale(jalan.arah < 0 && mati == null ? -1 : 1, 1); ctx.translate(-g.x, 0);
      if (mati != null && mati > 0.85) ctx.globalAlpha = Math.max(0, 1 - (mati - 0.85) / 0.15);
      ctx.drawImage(sumber, i * fw, 0, fw, fh, g.x - w / 2 + goyang, g.kaki - h - g.tinggi * 0.04 * angkat, w, h);
      tubuhUlang = ps != null && sumber === lari ? { m: ctx.getTransform(), i, fw, fh, x: g.x - w / 2 + goyang, y: g.kaki - h - g.tinggi * 0.04 * angkat, w, h } : null;
      gambarTerakhir = sumber === lari ? { i, x: g.x - w / 2 + goyang, y: g.kaki - h - g.tinggi * 0.04 * angkat, w, h, balik: jalan.arah < 0, pivX: g.x, pivY: g.kaki, pose: pz } : null;
      poseApi = pz;
      if (kedip > 0) { // kedip terang tipis di atas sprite
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = kedip * 0.35;
        ctx.drawImage(sumber, i * fw, 0, fw, fh, g.x - w / 2 + goyang, g.kaki - h, w, h);
      }
      ctx.restore();
    }

    // Jurus api buatan sendiri (tanpa sprite, tanpa kotak): bola api berputar masuk ke dada monster → ledakan
    // → gelombang kejut di tanah + dua sabetan api melengkung ke kiri & kanan + percikan bara.
    function acakJurus(ke) { let x = (ke * 9301 + 49297) % 233280; return () => (x = (x * 9301 + 49297) % 233280) / 233280; }
    function gambarJurusEfek(g, p) {
      // Efek api hasil adaptasi GIF serangan panitia: tubuh monster tetap utuh, api mengelilinginya (tanpa kotak).
      const A = aset.api;
      if (st && st.wujud !== 'lucu' && A && A.complete && A.naturalWidth) {
        const n = 16, fw = A.naturalWidth / n, fh = A.naturalHeight;
        const k = p < LEPAS ? Math.floor(p / LEPAS * 8) : 8 + Math.floor((p - LEPAS) / (1 - LEPAS) * 8);
        const lebar = g.tinggi * 2.1, tinggi = lebar * fh / fw;
        const cx = g.x, cy = g.kaki - g.tinggi * 0.5;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = p > 0.92 ? Math.max(0, (1 - p) / 0.08) : 1;
        ctx.translate(poseApi.dx * 1.4, poseApi.dy); // api ikut terlempar ke arah terjangan
        if (jalan.arah < 0) { ctx.translate(cx, 0); ctx.scale(-1, 1); ctx.translate(-cx, 0); }
        if (k >= 8 && k <= 11) ctx.globalAlpha *= tubuhUlang && tubuhUlang.rig ? 0.5 : 0.7;
        ctx.drawImage(A, Math.min(n - 1, k) * fw, 0, fw, fh, cx - lebar / 2, cy - tinggi * 0.56, lebar, tinggi);
        ctx.restore();
        // tubuh digambar ulang di atas api agar gerakan menyerang tetap terbaca
        if (tubuhUlang && tubuhUlang.rig) { /* rig: api cukup diredupkan, tidak digambar ulang (hemat CPU di HP) */ } else if (tubuhUlang && aset.lari && aset.lari.complete) { const q = tubuhUlang; ctx.save(); ctx.setTransform(q.m); ctx.globalAlpha = k >= 8 ? 0.85 : 0.6; ctx.drawImage(aset.lari, q.i * q.fw, 0, q.fw, q.fh, q.x, q.y, q.w, q.h); ctx.restore(); }
        return;
      }
      const dada = { x: g.x, y: g.kaki - g.tinggi * 0.55 };
      const r = acakJurus((st && st.jurusKe) || 1);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      if (p < LEPAS) {
        const k = p / LEPAS;
        // inti api di dada membesar
        const ri = g.tinggi * (0.06 + 0.16 * k);
        const gi = ctx.createRadialGradient(dada.x, dada.y, 0, dada.x, dada.y, ri * 2.2);
        gi.addColorStop(0, 'rgba(255,255,220,.95)'); gi.addColorStop(0.35, 'rgba(255,170,40,.75)'); gi.addColorStop(1, 'rgba(255,60,20,0)');
        ctx.fillStyle = gi; ctx.beginPath(); ctx.arc(dada.x, dada.y, ri * 2.2, 0, Math.PI * 2); ctx.fill();
        // 14 bola api berputar spiral menuju inti
        for (let i = 0; i < 14; i++) {
          const fase = (k * 1.25 + i / 14) % 1, rad = g.tinggi * (1.05 - 0.95 * fase);
          const sud = i * 2.4 + k * 9 + fase * 4;
          const x = dada.x + Math.cos(sud) * rad, y = dada.y + Math.sin(sud) * rad * 0.55;
          const uk = 6 + 16 * fase;
          ctx.globalAlpha = 0.35 + 0.65 * fase;
          ctx.drawImage(bola, x - uk / 2, y - uk / 2, uk, uk);
        }
      } else {
        const k = (p - LEPAS) / (1 - LEPAS), e = 1 - Math.pow(1 - k, 3);
        // kilatan ledakan
        if (k < 0.45) {
          const rf = g.tinggi * (0.3 + 1.4 * (k / 0.45));
          const gf = ctx.createRadialGradient(dada.x, dada.y, 0, dada.x, dada.y, rf);
          gf.addColorStop(0, `rgba(255,255,235,${0.95 * (1 - k / 0.45)})`); gf.addColorStop(0.5, `rgba(255,150,40,${0.6 * (1 - k / 0.45)})`); gf.addColorStop(1, 'rgba(255,60,20,0)');
          ctx.globalAlpha = 1; ctx.fillStyle = gf; ctx.beginPath(); ctx.arc(dada.x, dada.y, rf, 0, Math.PI * 2); ctx.fill();
        }
        // dua gelombang kejut elips di tanah
        [0, 0.18].forEach((tunda) => {
          const kk = Math.max(0, (k - tunda) / (1 - tunda));
          if (kk <= 0) return;
          const rx = g.tinggi * (0.25 + 2.4 * (1 - Math.pow(1 - kk, 2)));
          ctx.globalAlpha = 0.85 * (1 - kk);
          ctx.strokeStyle = 'rgba(255,170,60,1)'; ctx.lineWidth = 10 * (1 - kk) + 2;
          ctx.beginPath(); ctx.ellipse(g.x, g.kaki, rx, rx * 0.2, 0, 0, Math.PI * 2); ctx.stroke();
        });
        // sabetan api melengkung ke kiri & kanan (bulan sabit tebal → tipis)
        [-1, 1].forEach((arah) => {
          const pjg = Math.PI * 0.75 * e, R = g.tinggi * (0.45 + 1.1 * e);
          const awal = arah < 0 ? Math.PI * 1.05 : -Math.PI * 0.05;
          for (let lap = 0; lap < 3; lap++) {
            ctx.globalAlpha = (1 - k * 0.85) * (0.9 - lap * 0.22);
            ctx.strokeStyle = lap === 0 ? '#FFF2B0' : lap === 1 ? '#FFB43C' : '#FF5A1E';
            ctx.lineWidth = (30 - lap * 8) * (1 - k * 0.6);
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.ellipse(dada.x, dada.y + g.tinggi * 0.15, R * (1 + lap * 0.06), R * 0.42, 0, arah < 0 ? awal : awal - pjg, arah < 0 ? awal + pjg : awal, false);
            ctx.stroke();
          }
        });
        // percikan bara beterbangan dengan gravitasi
        for (let i = 0; i < 26; i++) {
          const sud = r() * Math.PI * 2, v = g.tinggi * (0.6 + r() * 1.6);
          const x = dada.x + Math.cos(sud) * v * e, y = dada.y + Math.sin(sud) * v * e * 0.6 + g.tinggi * 0.9 * k * k;
          const uk = (4 + r() * 8) * (1 - k);
          ctx.globalAlpha = 1 - k;
          ctx.drawImage(bola, x - uk / 2, y - uk / 2, uk, uk);
        }
      }
      ctx.restore();
    }
    // Aura jurus: lingkaran api berdenyut di belakang monster saat bersiap menyerang / menang.
    function gambarAura(g, t) {
      const r = g.tinggi * (0.55 + 0.08 * Math.sin(t / 70));
      const cy = g.kaki - g.tinggi * 0.5;
      const gr = ctx.createRadialGradient(g.x, cy, r * 0.2, g.x, cy, r);
      gr.addColorStop(0, 'rgba(255,90,40,.55)'); gr.addColorStop(0.6, 'rgba(255,40,40,.25)'); gr.addColorStop(1, 'rgba(255,40,40,0)');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(g.x, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    // Pancaran jurus: garis cahaya cepat dari monster ke samping melewati korban.
    function gambarPancaran(t) {
      for (let i = sinarJurus.length - 1; i >= 0; i--) {
        const b = sinarJurus[i], p = (t - b.t0) / 420;
        if (p >= 1) { sinarJurus.splice(i, 1); continue; }
        if (p < 0) continue;
        const k = Math.min(1, p * 2.4), x = b.x0 + (b.x1 - b.x0) * k, y = b.y0 + (b.y1 - b.y0) * k;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - Math.max(0, p - 0.45) / 0.55; ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(255,120,40,.55)'; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(b.x0, b.y0); ctx.lineTo(x, y); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,245,200,.95)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(b.x0, b.y0); ctx.lineTo(x, y); ctx.stroke();
        if (b.kena && k > 0.6) { ctx.fillStyle = 'rgba(255,200,120,.8)'; ctx.beginPath(); ctx.arc(b.kena.x, b.kena.y, 10 + p * 18, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
    }
    // Jumlah warga tumbang mengikuti nyawa dari server: kurang → tumbangkan (dengan pancaran), lebih → bangkitkan.
    function sinkronTumbang(nyawa, animasi) {
      if (!fest || !fest.tampil || !fest.tumbang) return;
      const semua = fest.tampil;
      if (!semua.length) return;
      const perlu = Math.round(semua.length * (1 - Math.max(0, Math.min(100, nyawa)) / 100));
      const milikku = fest.saya;
      const mati = semua.filter((w) => w.mati && w !== milikku);
      if (mati.length > perlu) { mati.slice(0, mati.length - perlu).forEach((w) => { w.mati = 0; if (w.layar) teks.push({ s: 'Selamat!', x: w.layar.x, y: w.layar.y, t0: performance.now(), warna: '#7CFFB2' }); }); return; }
      const g = geometri(), ox = g.x, oy = g.kaki - g.tinggi * 0.55;
      const hidup = semua.filter((w) => !w.mati && w.layar && w !== milikku).sort((a, b) => Math.abs(a.layar.kaki - g.kaki) - Math.abs(b.layar.kaki - g.kaki) + (Math.random() - 0.5) * 60);
      const korban = hidup.slice(0, perlu - mati.length);
      const t0 = performance.now();
      korban.forEach((w, i) => {
        if (animasi && !gerakMinim && i < 10) {
          const tx = w.layar.x, ty = w.layar.y + w.layar.h * 0.5, ke = tx < ox ? -1 : 1;
          const ujungX = ke < 0 ? -40 : W + 40, ujungY = oy + (ty - oy) * ((ujungX - ox) / ((tx - ox) || 1));
          sinarJurus.push({ t0: t0 + i * 60, x0: ox, y0: oy, x1: ujungX, y1: ujungY, kena: { x: tx, y: ty } });
          setTimeout(() => fest.tumbang(w, ke), 120 + i * 60);
        } else if (animasi) fest.tumbang(w, w.layar.x < ox ? -1 : 1);
        else { fest.tumbang(w, w.layar.x < ox ? -1 : 1); w.mati = performance.now() - 5000; }
      });
      mulaiGambar();
    }
    // Saat waktu jurus tiba (jam server): tembakkan jurus sesuai perkiraan damage; server mengoreksi saat status masuk.
    function cekJurus() {
      if (!st || st.fase !== 'tanding' || !st.jurus || !st.jurusBerikut) return;
      const awas = $('.mon__awas'), sisa = sisaJurus();
      awas.hidden = !(sisa < AWAL_JURUS && sisa > -300);
      const tombol = $('.mon__hindar'), ke = (st.jurusKe || 0) + 1;
      const bisaHindar = !karakterMati && !!token && sisa < Math.min(st.hindarMs || 2500, 2500) && sisa > -200;
      tombol.hidden = !bisaHindar;
      if (bisaHindar) { tombol.disabled = hindarKe === ke; tombol.textContent = hindarKe === ke ? 'AMAN ✓' : 'HINDAR!'; }
      if (!awas.hidden) awas.textContent = aku_sasaran && !karakterMati ? 'KAMU jadi sasaran! Tekan HINDAR!' : (window.YCSRajaRig ? window.YCSRajaRig.JURUS[window.YCSRajaRig.DAFTAR[((st.jurusKe || 0)) % 3]].awas : 'Awas! ' + st.nama + ' bersiap mengeluarkan jurus!');
      if (sisa <= 0 && jurusDitembak < ke) {
        jurusDitembak = ke;
        tembakSasaran(); // pancaran ke warga sasaran; kena/meleset & sisa nyawa dikonfirmasi server
        if (navigator.vibrate && !gerakMinim) try { navigator.vibrate([30, 40, 30]); } catch (e) {}
        poll(600); setTimeout(() => poll(0), 1600);
      }
    }
    // Pancaran jurus ke warga sasaran yang masih berdiri (maks 10 terlihat).
    function tembakSasaran() {
      const g = geometri(), ox = g.x, oy = g.kaki - g.tinggi * 0.55, t0 = performance.now();
      sasaranWarga.filter((w) => w && !w.mati && w.layar).slice(0, 10).forEach((w, i) => {
        const tx = w.layar.x, ty = w.layar.y + w.layar.h * 0.5;
        sinarJurus.push({ t0: t0 + i * 50, x0: ox, y0: oy, x1: tx + (tx - ox) * 0.15, y1: ty + (ty - oy) * 0.15, kena: { x: tx, y: ty } });
      });
      mulaiGambar();
    }
    // Hasil jurus dari server: tiap warga yang kena → −1 nyawa (hati), tumbang di 0.
    function terapkanKena(info) {
      if (!info || !info.kena || !fest || !fest.cariNK) return;
      const g = geometri(), hpMaks = st.hpMaks || 5;
      info.kena.forEach(([n, k, hp, mati]) => {
        const w = fest.cariNK(n, k);
        if (!w) return;
        fest.kena(w, hp, hpMaks);
        if (w === fest.saya) { hpSaya = hp; if (mati) setMati(true); else tampilAjak(`Karaktermu kena! Nyawa tinggal ${hp} dari ${hpMaks}. Tekan HINDAR saat jadi sasaran.`, 2600); }
        else if (mati && !w.mati) fest.tumbang(w, w.layar && w.layar.x < g.x ? -1 : 1);
      });
    }
    function tulisNyawa() {
      const box = $('.mon__nyawa');
      box.hidden = !st || !st.jurus || st.fase === 'tunggu';
      if (box.hidden) return;
      const n = Math.max(0, Math.min(100, st.nyawa ?? 100));
      $('.mon__nbar i').style.transform = `scaleX(${n / 100})`;
      $('.mon__nbar').setAttribute('aria-valuenow', String(Math.round(n)));
      box.classList.toggle('is-kritis', n < 30);
      $('.mon__npersen').textContent = st.totalWarga ? `${nf.format(Math.round((st.totalWarga || 0) * n / 100))}/${nf.format(st.totalWarga)}` : Math.round(n) + '%';
    }

    function gambarSinar(g, p) {
      // Urutan kemenangan (p = 0..1 selama 4,4 dtk): layar meredup → tiang cahaya turun dari langit & menyempit
      // di monster → cahaya memudar → monster runtuh/mengecil terlihat jelas → pesan "Monster Terkalahkan!".
      const redup = Math.min(1, p / 0.08) * (p > 0.9 ? Math.max(0, (1 - p) / 0.1) : 1);
      ctx.fillStyle = `rgba(10,15,45,${0.45 * redup})`;
      ctx.fillRect(0, 0, W, H);
      if (p < 0.08 || p > 0.55) return;
      const q = (p - 0.08) / 0.47;
      const kuat = q > 0.75 ? Math.max(0, (1 - q) / 0.25) : 1;
      const turun = Math.min(1, q / 0.3);
      const lebar = g.tinggi * (0.85 - 0.45 * Math.min(1, q / 0.7)) * (1 + Math.sin(q * 40) * 0.05);
      const bawah = g.kaki * turun;
      const gr = ctx.createLinearGradient(g.x - lebar, 0, g.x + lebar, 0);
      gr.addColorStop(0, 'rgba(255,240,170,0)'); gr.addColorStop(0.35, 'rgba(255,236,150,.5)'); gr.addColorStop(0.5, 'rgba(255,255,245,.95)');
      gr.addColorStop(0.65, 'rgba(255,236,150,.5)'); gr.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.save();
      ctx.globalAlpha = kuat;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = gr;
      ctx.fillRect(g.x - lebar, 0, lebar * 2, bawah);
      if (turun >= 1) { // pancaran di titik tumbukan + percikan cahaya
        const pusat = g.kaki - g.tinggi * 0.45;
        const rr = g.tinggi * (0.35 + 0.45 * Math.min(1, (q - 0.3) / 0.4));
        const rg = ctx.createRadialGradient(g.x, pusat, 0, g.x, pusat, rr);
        rg.addColorStop(0, 'rgba(255,255,230,.85)'); rg.addColorStop(1, 'rgba(255,220,120,0)');
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(g.x, pusat, rr, 0, Math.PI * 2); ctx.fill();
        for (let k = 0; k < 12; k++) {
          const a = k / 12 * Math.PI * 2 + q * 2, d = rr * (0.6 + 0.6 * ((q * 3 + k * 0.37) % 1));
          ctx.drawImage(bola, g.x + Math.cos(a) * d - 8, pusat + Math.sin(a) * d - 8, 16, 16);
        }
      }
      ctx.restore();
    }

    function gambar(t) {
      raf = 0;
      if (!st || el.hidden || !W) return;
      const dt = tLalu ? Math.min(0.1, (t - tLalu) / 1000) : 0;
      tLalu = t;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const getar = getarLayar();
      if (getar) ctx.translate((Math.random() - 0.5) * getar, (Math.random() - 0.5) * getar);
      gerakMonster(dt);
      cekJurus();
      const g = geometri();
      const kedip = Math.max(0, 1 - (t - pukul) / 160);
      let mati = null;
      if (akhir && akhir.jenis === 'menang') mati = Math.max(0, Math.min(1, (t - akhir.t0 - 2000) / 2000));
      const tampil = st.fase === 'tanding' || akhir;
      if (tampil && !(akhir && akhir.jenis === 'kabur' && (jalan.x < -0.3 || jalan.x > 1.3))) {
        if (akhir && akhir.jenis === 'monster') { ctx.fillStyle = `rgba(120,0,10,${0.35 * Math.min(1, (t - akhir.t0) / 800)})`; ctx.fillRect(0, 0, W, H); }
        const ps = mati == null ? progresSerang() : null;
        if (ps != null && ps < LEPAS && st.wujud === 'lucu') gambarAura(g, t);
        (st.wujud === 'lucu' ? gambarMonsterLucu : gambarRajaBatu)(g, t, kedip, mati);
        if (ps != null && !gerakMinim) gambarJurusEfek(g, ps);
        aturZona(akhir && akhir.selesai && akhir.jenis !== 'monster' ? null : g);
      } else aturZona(null);
      gambarPancaran(t);
      // partikel tenaga: langit → warga → bar
      const bar = partikel.length ? titikBar() : null;
      for (let i = partikel.length - 1; i >= 0; i--) {
        const p = partikel[i], u = t - p.t0;
        let x, y, s;
        if (u < p.d1) { const k = mudah(u / p.d1); x = p.x0 + (p.x1 - p.x0) * k; y = p.y0 + (p.y1 - p.y0) * k; s = 14 + 10 * k; }
        else if (u < p.d1 + p.d2) {
          const k = (u - p.d1) / p.d2, kk = k * k;
          const tx = p.keMonster ? g.x : bar.x, ty = p.keMonster ? g.kaki - g.tinggi * 0.5 : bar.y;
          const cx = (p.x1 + tx) / 2, cy = Math.min(p.y1, ty) - H * 0.18; // lengkung ke atas
          x = (1 - k) * (1 - k) * p.x1 + 2 * (1 - k) * k * cx + kk * tx;
          y = (1 - k) * (1 - k) * p.y1 + 2 * (1 - k) * k * cy + kk * ty;
          s = 22 - 10 * k;
        } else { partikel.splice(i, 1); pukul = t; continue; }
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(bola, x - s / 2, y - s / 2, s, s);
        ctx.globalCompositeOperation = 'source-over';
      }
      // angka +N
      ctx.font = '800 15px Poppins, system-ui, sans-serif';
      ctx.textAlign = 'center';
      for (let i = teks.length - 1; i >= 0; i--) {
        const a = teks[i], u = (t - a.t0) / 800;
        if (u >= 1) { teks.splice(i, 1); continue; }
        ctx.globalAlpha = 1 - u;
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(91,10,22,.75)'; ctx.fillStyle = a.warna || '#FFE066';
        ctx.strokeText(a.s, a.x, a.y - u * 30); ctx.fillText(a.s, a.x, a.y - u * 30);
        ctx.globalAlpha = 1;
      }
      if (akhir) {
        const lama = akhir.jenis === 'menang' ? 4400 : akhir.jenis === 'monster' ? 2800 : 2400;
        const p = Math.min(1, (t - akhir.t0) / lama);
        if (akhir.jenis === 'menang') { gambarSinar(g, p); if (p > 0.62 && !akhir.konfeti) { akhir.konfeti = true; tebarKonfeti(); } }
        if (p >= 1 && !akhir.selesai) { akhir.selesai = true; tampilPesan(); }
      }
      gambarKonfeti(t, dt);
      // bar dianimasikan halus menuju nilai server + tap sendiri yang belum terkirim
      const tujuan = st.fase === 'menang' ? target() : Math.min(target(), (st.tenaga || 0) + pending() * poin());
      tampilTenaga = gerakMinim ? tujuan : tampilTenaga + (tujuan - tampilTenaga) * Math.min(1, dt * 6);
      tulisBar();
      tulisNyawa();
      const hidup = partikel.length || teks.length || sinarJurus.length || konfeti.length || (akhir && !akhir.selesai) || (st.fase === 'tanding' && !gerakMinim) || (tumbuh.t0 && t - tumbuh.t0 < 900);
      if (hidup && panggungTerlihat && !document.hidden) raf = requestAnimationFrame(gambar);
      else tLalu = 0;
    }
    function tebarKonfeti() {
      if (gerakMinim) return;
      const warna = ['#FFC93C', '#FF8A3D', '#2BA84A', '#00A6ED', '#D7263D', '#FFFFFF'];
      for (let i = 0; i < 90; i++) konfeti.push({ x: Math.random() * W, y: -20 - Math.random() * H * 0.4, vx: (Math.random() - 0.5) * 60, vy: 90 + Math.random() * 120, r: Math.random() * 6, vr: (Math.random() - 0.5) * 8, w: 5 + Math.random() * 6, c: warna[i % warna.length] });
    }
    function gambarKonfeti(t, dt) {
      for (let i = konfeti.length - 1; i >= 0; i--) {
        const k = konfeti[i];
        k.x += k.vx * dt; k.y += k.vy * dt; k.r += k.vr * dt;
        if (k.y > H + 20) { konfeti.splice(i, 1); continue; }
        ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(k.r); ctx.fillStyle = k.c; ctx.fillRect(-k.w / 2, -k.w / 4, k.w, k.w / 2); ctx.restore();
      }
    }
    const mulaiGambar = () => { if (!raf && st && !el.hidden) raf = requestAnimationFrame(gambar); };
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { mulaiGambar(); poll(0); } });

    // Zona monster dikirim ke festival agar warga menyingkir dan tidak menimpa monster.
    let zonaLama = '';
    function aturZona(g) {
      if (!fest || !fest.setZona) return;
      const z = g ? { x: Math.round(g.x), atas: Math.round(g.kaki - g.tinggi), kaki: Math.round(g.kaki), lebar: Math.round(g.tinggi * (st.wujud === 'lucu' ? 1.05 : 0.8)) } : null;
      const k = JSON.stringify(z);
      if (k !== zonaLama) { zonaLama = k; fest.setZona(z); }
    }
    function tulisBar() {
      const tg = target();
      const persen = Math.max(0, Math.min(100, tampilTenaga / Math.max(1, tg) * 100));
      $('.mon__bar i').style.transform = `scaleX(${persen / 100})`;
      $('.mon__bar').setAttribute('aria-valuenow', String(Math.round(persen)));
      $('.mon__angka').textContent = `${nf.format(Math.round(tampilTenaga))} / ${nf.format(tg)} tenaga`;
    }

    /* ---------- Tampilan per fase ---------- */
    function aturBanner() {
      if (infoUjiSalah && Date.now() < infoUjiSalah) return; // pesan "link uji tidak berlaku" sedang tampil
      if (!st) { banner.hidden = true; return; }
      const nama = st.nama || 'Monster';
      let isi = '';
      if (st.fase === 'tanding') isi = `<span class="mon-banner__dot"></span><strong>${esc(nama)} muncul di plaza!</strong> Ayo lawan bersama`;
      else if (st.fase === 'tunggu' && Date.parse(st.mulai) - now() < 15 * 60000) isi = `<strong>${esc(nama)}</strong> muncul dalam <span class="mon-banner__jam">${jam(Date.parse(st.mulai) - now())}</span>`;
      banner.innerHTML = isi;
      banner.hidden = !isi || panggungTerlihat;
    }
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    let infoUjiSalah = 0;
    function terapkan(baru) {
      if (!baru || !baru.ok) return;
      // Status yang belum memuat jurus terakhir jangan menaikkan bar nyawa lagi (cegah kedip).
      if (prediksi && baru.fase === 'tanding' && (baru.jurusKe || 0) < prediksi.ke) baru.nyawa = Math.min(baru.nyawa ?? 100, prediksi.nyawa);
      else prediksi = null;
      if (uji && (baru.ujiSalah || (baru.uji && baru.fase === 'tidak_ada')) && !infoUjiSalah) {
        infoUjiSalah = Date.now() + 8000;
        banner.textContent = 'Link uji monster sudah tidak berlaku. Minta link baru ke admin.';
        banner.hidden = false;
        setTimeout(() => { banner.hidden = true; }, 8000);
      }
      const lama = st;
      st = baru;
      const adaEvent = ['tanding', 'menang', 'monster_menang', 'habis', 'tunggu'].includes(st.fase);
      if (st.id && st.id !== idLama) {
        // event baru: reset tampilan & buang antrean milik event lain
        idLama = st.id; levelLama = st.level || 1; akhir = null; tampilTenaga = st.tenaga || 0; tumbuh = { dari: 1, ke: 1, t0: 0 };
        selesaiTampil(); jurusDitembak = 0; jurusSinkron = 0; karakterMati = false; hindarKe = 0; hpSaya = null; Object.assign(jalan, { x: 0.5, y: 0.72, tx: 0.5, ty: 0.72, jeda: 0.8 }); pesan.hidden = true;
        if (antre.e !== st.id) { antre = { e: st.id, n: 0, kirim: null, seq: 0 }; simpan(KUNCI_ANTRE, antre); }
        muatAset(st.wujud);
      }
      if (['tanding', 'menang', 'monster_menang', 'habis'].includes(st.fase)) muatAset(st.wujud);
      // naik level: monster membesar + kilatan kecil
      if (st.level && levelLama && st.level > levelLama) {
        const sk = st.skala || [];
        tumbuh = { dari: sk[levelLama - 1] || 1, ke: sk[st.level - 1] || 1, t0: performance.now() };
        tampilTenaga = 0;
        tampilAjak(`Level ${st.level}! ${st.nama} membesar, tiap tap kini bernilai ${poin()} poin.`, 3500);
      }
      if (st.level) levelLama = st.level;
      // menang: putar animasi sekali (bila halaman dibuka setelah menang, langsung tampil pesan)
      // Tiga akhir: menang (monster tumbang), monster menang (nyawa warga habis), kabur (waktu habis).
      const jenisAkhir = { menang: 'menang', monster_menang: 'monster', habis: 'kabur' }[st.fase];
      if (jenisAkhir && !akhir && ditutup !== st.id) {
        const baruSaja = lama && lama.fase === 'tanding' && lama.id === st.id;
        akhir = { jenis: jenisAkhir, t0: performance.now(), selesai: false };
        if (!baruSaja || gerakMinim) { akhir.t0 -= 5000; if (jenisAkhir === 'kabur') jalan.x = 2; }
        if (jenisAkhir === 'monster') {
          sinkronTumbang(0, baruSaja);
          const w = fest && fest.saya; // semua karakter tumbang, termasuk milikmu
          if (w && !w.mati && fest.tumbang) { fest.tumbang(w, 1); if (!baruSaja) w.mati = performance.now() - 5000; }
          karakterMati = !!token;
        }
        opsi.saatMenang && opsi.saatMenang(st);
      }
      // Nyawa warga dari server (setelah jurus) → samakan jumlah warga tumbang.
      if (st.jurus && st.fase === 'tanding' && st.jurusKe !== jurusSinkron) {
        const pertama = !jurusSinkron && !lama;
        jurusSinkron = st.jurusKe; jurusDitembak = Math.max(jurusDitembak, st.jurusKe);
        if (!pertama) terapkanKena(st.jurusInfo);
        sinkronTumbang(st.nyawa ?? 100, false);
        cekKarakter();
        const ji = st.jurusInfo;
        if (!pertama && ji && !karakterMati && !(ji.kena || []).some(([n, k]) => fest && fest.saya && fest.saya.n === n && fest.saya.k === k))
          tampilAjak(`${nf.format(ji.pukulan || 0)} pukulan, ${nf.format(ji.tumbang || 0)} warga tumbang${ji.menghindar ? ', ' + nf.format(ji.menghindar) + ' menghindar' : ''}${ji.tahan ? ' · perisai ' + ji.tahan + '%' : ''}.`, 2400);
      }
      terapkanSasaran();
      tampilkan(adaEvent);
      // tenaga dari pemain lain → partikel ambient ke monster (maksimal 6 per pembaruan)
      if (lama && lama.id === st.id && st.fase === 'tanding' && st.total > lama.total && panggungTerlihat && !gerakMinim) {
        const lain = Math.min(6, Math.ceil((st.total - lama.total) / Math.max(1, poin()) / 8));
        for (let i = 0; i < lain; i++) setTimeout(() => tembak(W * (0.15 + Math.random() * 0.7), H * (0.55 + Math.random() * 0.35), false, true), i * 120);
      }
      aturBanner();
      mulaiGambar();
    }

    function tampilkan(adaEvent) {
      const tanding = st.fase === 'tanding';
      const tampil = adaEvent && ditutup !== st.id && (st.fase !== 'tunggu' || Date.parse(st.mulai) - now() < 60 * 60000);
      el.hidden = !tampil;
      stage.classList.toggle('is-monster', tampil && st.fase !== 'tunggu');
      if (!tampil || st.fase === 'tunggu' || st.fase === 'habis') aturZona(null);
      if (!tampil) { pesan.hidden = true; selesaiTampil(); return; }
      if (!W) ukur();
      el.dataset.fase = st.fase;
      hud.hidden = st.fase === 'tunggu';
      tangkap.hidden = !tanding;
      if (fest && fest.setBalon) fest.setBalon(!tanding && !!bolehTap());
      if (fest && fest.setPanik) fest.setPanik(tanding || (akhir && akhir.jenis === 'monster' && !akhir.selesai));
      if (fest && fest.tandaiSaya && tanding && opsi.saya && !fest.saya) fest.tandaiSaya(opsi.saya());
      $('.mon__nama').textContent = (st.uji ? 'MODE UJI · ' : '') + st.nama;
      $('.mon__lvl').textContent = st.levelMaks ? `Level ${st.level || 1}/${st.levelMaks}` : '';
      $('.mon__pemain').textContent = st.pemain ? `${nf.format(st.pemain)} pejuang` : '';
      const hati = st.jurus && hpSaya != null && token ? '♥'.repeat(Math.max(0, hpSaya)) + '♡'.repeat(Math.max(0, (st.hpMaks || 5) - hpSaya)) + ' · ' : '';
      $('.mon__saya').textContent = hati + (tiketSaya ? `Tiket ${tiketSaya} · ${nf.format(sayaPoin)} tenaga` : sayaPoin ? `Kontribusimu ${nf.format(sayaPoin)}` : `+${poin()} per tap`);
      const kt = $('.mon__tiket');
      kt.hidden = !tiketSaya || !tanding;
      if (tiketSaya) { kt.querySelector('strong').textContent = String(tiketSaya).startsWith('#') ? tiketSaya : '#' + tiketSaya; kt.querySelector('span').textContent = `${nf.format(sayaPoin)} tenaga`; }
      if (tanding && bolehTap() && !token && !blokir && navigator.onLine) pastikanToken().catch(() => {});
      if (st.fase === 'tunggu') tampilAjak(`${st.nama} muncul dalam ${jam(Date.parse(st.mulai) - now())}. Siapkan jarimu!`);
      else if (tanding && !bolehTap()) tampilAjak('Buka festival dulu: gabung Festival Satu Kata di beranda untuk ikut melawan.');
      else if (tanding && karakterMati) tampilAjak('Karaktermu tumbang. Kamu tidak bisa menyerang lagi di event ini, tapi tetap bisa menonton & ajak teman!');
      else if (tanding && blokir) tampilAjak((PESAN_BLOKIR[blokir.error] || (() => 'Tidak bisa ikut dari perangkat ini.'))(blokir));
      else if (tanding && !navigator.onLine) tampilAjak(`Koneksi terputus. ${nf.format(pending())} tap disimpan dan dikirim saat tersambung.`);
      else if (tanding) tampilAjak(ajakTetap ? '' : 'Ketuk monster atau warga untuk mengirim tenaga!');
      else tampilAjak('');
    }
    let ajakTimer = 0, ajakTetap = false;
    function tampilAjak(s, ms) {
      const a = $('.mon__ajak');
      a.textContent = s;
      a.hidden = !s;
      clearTimeout(ajakTimer);
      ajakTetap = !!ms;
      if (ms) ajakTimer = setTimeout(() => { ajakTetap = false; tampilkan(true); }, ms);
    }
    function tampilPesan() {
      const jenis = akhir ? akhir.jenis : st.fase === 'menang' ? 'menang' : st.fase === 'monster_menang' ? 'monster' : 'kabur';
      pesan.hidden = false;
      pesan.dataset.jenis = jenis;
      const tiketku = tiketSaya ? (jenis === 'menang' ? ` Kode undianmu ${tiketSaya} SAH, diundi saat live!` : ` Kode ${tiketSaya} hangus karena bos tidak tumbang.`) : '';
      const sumbang = sayaPoin ? ` Kamu menyumbang ${nf.format(sayaPoin)} tenaga.` : '';
      pesan.querySelector('h3').textContent = { menang: 'Monster Terkalahkan!', monster: st.nama + ' Menang!', kabur: st.nama + ' Kabur!' }[jenis];
      pesan.querySelector('p').textContent = {
        menang: `Kompak banget! Plaza aman lagi.${sumbang}${tiketku || ' Sekarang saatnya live.'}`,
        monster: `Semua warga tumbang... ${st.nama} menguasai plaza. Ajak lebih banyak teman biar perisai makin kuat di live berikutnya!${tiketku}`,
        kabur: `Waktunya habis, ${st.nama} lari sebelum tumbang. Dikit lagi! Balas di live berikutnya.${sumbang}${tiketku}`,
      }[jenis];
      const a = pesan.querySelector('a');
      const link = st.live && st.live.link;
      a.hidden = !link;
      if (link) { a.href = link; a.textContent = Date.parse(st.live.mulai) > now() ? `Live mulai ${new Date(st.live.mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB · Buka` : 'Tonton Live sekarang'; }
      tampilAjak('');
    }
    // HINDAR: minta server mengamankan karaktermu dari jurus berikutnya (hanya saat peringatan).
    async function hindar() {
      const ke = (st && st.jurusKe || 0) + 1;
      if (!token || karakterMati || hindarKe === ke) return;
      hindarKe = ke;
      if (fest && fest.menghindar) fest.menghindar(fest.saya);
      if (navigator.vibrate && !gerakMinim) try { navigator.vibrate(15); } catch (e) {}
      try {
        const d = await minta({ aksi: 'hindar', token, e: st.id, uji });
        if (!d.ok) { hindarKe = 0; if (d.error === 'bukan_waktunya') tampilAjak('Terlambat! Tekan HINDAR saat peringatan muncul.', 1600); }
        else if (d.mati) setMati(true);
      } catch (e) { hindarKe = 0; }
    }
    $('.mon__hindar').addEventListener('click', hindar);
    // Setelah tiap jurus: apakah karaktermu ikut tumbang?
    async function cekKarakter() {
      if (!token || karakterMati) return;
      try {
        const d = await minta({ aksi: 'saya', token, uji });
        if (d.ok) { hpSaya = d.hp; if (fest && fest.saya) fest.setNyawa(fest.saya, d.hp, d.hpMaks); if (d.mati) setMati(true); else tampilkan(true); }
      } catch (e) { /* coba lagi di jurus berikutnya */ }
    }
    function setMati(animasi) {
      karakterMati = true;
      antre.n = 0; antre.kirim = null; simpan(KUNCI_ANTRE, antre);
      const w = fest && fest.saya;
      if (w && fest.tumbang && !w.mati) { const g = geometri(); fest.tumbang(w, w.layar && w.layar.x < g.x ? -1 : 1); if (!animasi) w.mati = performance.now() - 5000; }
      tampilAjak('Karaktermu tumbang kena jurus! Kamu tidak bisa menyerang lagi di event ini. Ajak teman melanjutkan!', 4500);
      if (st) tampilkan(true);
    }
    function selesaiTampil() {
      if (!fest) return;
      if (fest.bangkitSemua) fest.bangkitSemua();
      if (fest.setPanik) fest.setPanik(false);
      if (fest.tandaiSaya) fest.tandaiSaya(null);
      if (fest.bersihTempur) fest.bersihTempur();
      sasaranWarga = [];
      aturZona(null);
    }
    $('.mon__tutup').addEventListener('click', () => { ditutup = st ? st.id : ''; pesan.hidden = true; el.hidden = true; stage.classList.remove('is-monster'); selesaiTampil(); if (fest && fest.setBalon) fest.setBalon(!!bolehTap()); });
    // Ajak teman: makin banyak pejuang, makin kuat perisai warga.
    $('.mon__bagi').addEventListener('click', async () => {
      const url = location.origin + '/#satu-kata';
      const text = st && st.fase === 'tanding' ? `${st.nama} menyerang Festival YCS! Bantu aku lawan dan dapatkan tiket undian:` : `Ikut Festival Satu Kata YCS 2026, lawan monster bareng & menangkan hadiah di live:`;
      try { if (navigator.share) await navigator.share({ title: 'Lawan Monster YCS 2026', text, url }); else { await navigator.clipboard.writeText(text + ' ' + url); tampilAjak('Link disalin, kirim ke temanmu!', 2500); } } catch (e) {}
    });

    /* ---------- Tap ---------- */
    let sayaPoin = 0;
    function tembak(x, y, diri, keMonster) {
      if (partikel.length >= MAKS_PARTIKEL) partikel.shift();
      const t = performance.now();
      partikel.push({ x0: x + (Math.random() - 0.5) * W * 0.25, y0: -20, x1: x, y1: y, t0: t, d1: gerakMinim ? 1 : 420, d2: gerakMinim ? 1 : 520, diri, keMonster });
      mulaiGambar();
    }
    function ketuk(ev) {
      if (!st || st.fase !== 'tanding') return;
      if (ev.type === 'keydown') ev.preventDefault();
      if (!bolehTap()) { opsi.saatTerkunci && opsi.saatTerkunci(); return; }
      if (blokir) { tampilkan(true); return; }
      if (karakterMati) { tampilAjak('Karaktermu tumbang, kamu tidak bisa menyerang lagi di event ini. Ajak teman melanjutkan!', 2600); return; }
      const r = stage.getBoundingClientRect();
      const x = (ev.clientX ?? r.left + r.width / 2) - r.left, y = (ev.clientY ?? r.top + r.height * 0.7) - r.top;
      // Tap harus tepat mengenai monster atau warga (yang masih berdiri). Di luar itu = meleset, tidak dihitung.
      const g = geometri();
      const kotak = Math.abs(x - g.x) < g.lebar * 0.45 && y > g.atas + g.tinggi * 0.04 && y < g.kaki;
      const tubuh = st && st.wujud !== 'lucu' ? kenaTubuh(x, y) : null;
      const kenaMonster = tubuh == null ? kotak : tubuh;
      const w = !kenaMonster && fest && fest.wargaDi ? fest.wargaDi(x, y, 9) : null; // toleransi jari di HP
      if (w && w === fest.saya && !$('.mon__hindar').hidden) { hindar(); return; } // ketuk karaktermu saat peringatan = menghindar
      if (!kenaMonster && !w) { teks.push({ s: 'Meleset!', x, y, t0: performance.now(), warna: '#E9E3DA' }); mulaiGambar(); return; }
      const pos = w && fest.posisi(w);
      const tx = pos ? pos.x : x, ty = pos ? pos.y + pos.h * 0.3 : y;
      if (kenaMonster) pukul = performance.now();
      if (antre.n + (antre.kirim ? antre.kirim.n : 0) >= MAKS_ANTRE) { tampilAjak('Pelan-pelan, tenagamu sedang dikirim…', 1500); return; }
      antre.n++;
      simpanAntre();
      if (!navigator.onLine) tampilAjak(`Koneksi terputus. ${nf.format(pending())} tap disimpan dan dikirim saat tersambung.`);
      tembak(tx, ty, true, false);
      teks.push({ s: '+' + poin(), x: tx, y: ty - 10, t0: performance.now() });
      if (navigator.vibrate && !gerakMinim) try { navigator.vibrate(8); } catch (e) {}
    }
    // Tap dihitung saat jari diangkat tanpa bergeser, jadi menggulir halaman di atas panggung tetap bisa.
    const sentuh = new Map();
    tangkap.addEventListener('pointerdown', (e) => { sentuh.set(e.pointerId, { x: e.clientX, y: e.clientY, t: e.timeStamp }); });
    tangkap.addEventListener('pointerup', (e) => {
      const a = sentuh.get(e.pointerId);
      sentuh.delete(e.pointerId);
      if (a && Math.hypot(e.clientX - a.x, e.clientY - a.y) < 12 && e.timeStamp - a.t < 600) ketuk(e);
    });
    tangkap.addEventListener('pointercancel', (e) => sentuh.delete(e.pointerId));
    tangkap.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') ketuk(e); });
    let simpanTimer = 0;
    const simpanAntre = () => { if (!simpanTimer) simpanTimer = setTimeout(() => { simpanTimer = 0; simpan(KUNCI_ANTRE, antre); }, 400); };

    /* ---------- Jaringan ---------- */
    async function minta(body) {
      const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined });
      return r.json();
    }
    let masukJalan = null;
    function pastikanToken() {
      if (token) return Promise.resolve(token);
      if (blokir) return Promise.reject(new Error(blokir.error));
      if (!masukJalan) masukJalan = (async () => {
        const idt = (opsi.identitas && opsi.identitas()) || {};
        if (!idt.email && !idt.wa && !uji) { blokir = { error: 'tanpa_identitas' }; throw new Error('tanpa_identitas'); }
        const d = await minta({ aksi: 'masuk', perangkat: idPerangkat(), fp: await sidik(), email: idt.email || '', wa: idt.wa || '', uji });
        if (!d.ok) {
          if (PESAN_BLOKIR[d.error]) { blokir = d; antre.n = 0; antre.kirim = null; simpan(KUNCI_ANTRE, antre); if (st) tampilkan(true); }
          throw new Error(d.error || 'masuk');
        }
        token = d.token; simpan(KUNCI_TOKEN, token);
        if (d.tiket) { tiketSaya = d.tiket; opsi.saatTiket && opsi.saatTiket(d.tiket, st); }
        if (d.saya) sayaPoin = d.saya;
        if (d.mati) setMati(false);
        if (st) tampilkan(true);
        cekKarakter();
        return token;
      })().finally(() => { masukJalan = null; });
      return masukJalan;
    }
    // Satu batch dalam perjalanan; gagal → dikirim ulang dengan seq yang sama.
    async function kirim() {
      if (sedangKirim || !st || st.fase !== 'tanding' || !navigator.onLine || blokir || karakterMati) return;
      if (!antre.kirim && antre.n <= 0) return;
      sedangKirim = true;
      try {
        if (!antre.kirim) {
          const n = Math.min(antre.n, 60);
          antre.seq = Math.max((antre.seq || 0) + 1, Date.now());
          antre.kirim = { n, seq: antre.seq };
          antre.n -= n;
          simpan(KUNCI_ANTRE, antre);
        }
        await pastikanToken();
        const d = await minta({ aksi: 'tap', token, n: antre.kirim.n, seq: antre.kirim.seq, e: antre.e, uji });
        if (!d.ok) {
          if (d.error === 'sesi_habis') { token = null; simpan(KUNCI_TOKEN, null); }
          throw new Error(d.error);
        }
        const sisa = d.dup || d.buang ? 0 : antre.kirim.n - d.terima; // kelebihan karena batas kecepatan diantrekan lagi
        antre.kirim = null;
        if (d.buang) antre.n = 0; else antre.n = Math.min(MAKS_ANTRE, antre.n + Math.max(0, sisa));
        simpan(KUNCI_ANTRE, antre);
        if (d.saya) sayaPoin = d.saya;
        if (d.mati && !karakterMati) setMati(true);
        if (d.tiket && d.tiket !== tiketSaya) { tiketSaya = d.tiket; opsi.saatTiket && opsi.saatTiket(d.tiket, st); tampilAjak(`Kode undian ${tiketSaya} dicadangkan! Sah kalau Raja Batu tumbang. Pantau spin saat live YCS!`, 5000); }
        gagalBeruntun = 0;
        terapkan(d.status);
      } catch (e) {
        if (blokir) return;
        gagalBeruntun++;
        if (gagalBeruntun === 3 && navigator.onLine) tampilAjak('Server sedang ramai. Tapmu disimpan dan dikirim ulang otomatis.', 4000);
      } finally {
        sedangKirim = false;
      }
    }
    function jadwalKirim() {
      clearTimeout(timerKirim);
      const iv = (st && st.interval) || 1000;
      timerKirim = setTimeout(async () => { await kirim(); jadwalKirim(); }, gagalBeruntun ? Math.min(15000, iv * (1 + gagalBeruntun)) : iv);
    }
    window.addEventListener('online', () => { gagalBeruntun = 0; kirim(); if (st) tampilkan(true); });
    window.addEventListener('offline', () => { if (st) tampilkan(true); });

    // Pemantauan status: jarang saat tidak ada event (respons di-cache CDN), lebih rapat saat bertanding.
    async function poll(tunda) {
      clearTimeout(timerPoll);
      timerPoll = setTimeout(async () => {
        try {
          const r = await fetch(uji ? endpoint + '?uji=' + encodeURIComponent(uji) : endpoint, { headers: { Accept: 'application/json' } });
          terapkan(await r.json());
        } catch (e) { /* coba lagi nanti */ }
        poll(jedaPoll());
      }, tunda);
    }
    function jedaPoll() {
      if (!st || st.fase === 'mati' || st.fase === 'tidak_ada') return 120000;
      if (st.fase === 'tunggu') { const sisa = Date.parse(st.mulai) - now(); return Math.max(1000, Math.min(60000, sisa + 300 + Math.random() * 1500)); }
      if (st.fase === 'tanding') {
        if (document.hidden) return 15000;
        // Saat sedang mengetuk, respons batch tap sudah membawa status terbaru → pemantauan dijarangkan.
        const iv = st.interval || 1000;
        return antre.kirim || antre.n ? Math.max(4000, iv * 4) : Math.max(2500, iv * 2.5);
      }
      return 30000;
    }
    // Hitung mundur di banner/ajakan tiap detik selama fase tunggu.
    setInterval(() => { if (st && st.fase === 'tunggu') { aturBanner(); if (!el.hidden) tampilkan(true); } }, 1000);

    poll(0);
    jadwalKirim();
    return { get status() { return st; }, segarkan: () => poll(0) };
  }

  window.YCSMonster = { pasang };
})();
