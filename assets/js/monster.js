/* Lawan Monster — event kolaboratif di panggung Festival Satu Kata.
   Tanpa library: satu <canvas> overlay + elemen HUD. Animasi hanya berjalan saat event tampil di layar.
   Alur tap: ketuk warga → tenaga turun dari langit ke warga → mengalir ke bar bersama.
   Tap dikumpulkan lalu dikirim per batch (interval dari server). Bila offline, antrean disimpan di
   localStorage dan dikirim ulang dengan seq yang sama (server menolak duplikat → tidak terhitung dua kali). */
(() => {
  'use strict';
  const nf = new Intl.NumberFormat('id-ID');
  const KUNCI_TOKEN = 'ycs_mon_tok', KUNCI_ANTRE = 'ycs_mon_antre';
  const MAKS_ANTRE = 150;      // batas tap tersimpan di klien (server tetap membatasi 10 tap/detik)
  const MAKS_PARTIKEL = 70;    // batas partikel agar HP kelas bawah tetap lancar
  const simpan = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const baca = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const mudah = (t) => 1 - Math.pow(1 - t, 3);
  const jam = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); const m = Math.floor(s / 60); return (m >= 60 ? Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0') : m) + ':' + String(s % 60).padStart(2, '0'); };

  function pasang(opsi) {
    const stage = opsi.stage, fest = opsi.festApi, now = opsi.now || Date.now;
    const endpoint = opsi.endpoint || '/api/monster';
    const gerakMinim = matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- DOM ---------- */
    const el = document.createElement('div');
    el.className = 'mon';
    el.hidden = true;
    el.innerHTML = `
      <canvas class="mon__kanvas" aria-hidden="true"></canvas>
      <div class="mon__tangkap" role="button" tabindex="0" aria-label="Ketuk untuk mengirim tenaga ke monster"></div>
      <div class="mon__hud" aria-live="polite">
        <div class="mon__baris"><strong class="mon__nama"></strong><span class="mon__lvl"></span><span class="mon__pemain"></span></div>
        <div class="mon__bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-label="Tenaga bersama"><i></i><b></b></div>
        <div class="mon__baris mon__baris--kecil"><span class="mon__angka"></span><span class="mon__saya"></span></div>
      </div>
      <p class="mon__ajak"></p>
      <div class="mon__pesan" hidden><h3></h3><p></p><a class="btn btn--cta btn--sm" target="_blank" rel="noopener" hidden>Tonton Live</a><button type="button" class="btn btn--soft btn--sm mon__tutup">Kembali ke festival</button></div>`;
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
    function geometri() {
      const l = fest && fest.lantai ? fest.lantai() : { y0: H * 0.35, y1: H * 0.97 };
      const skala = st && st.skala ? st.skala[levelIdx()] : 1;
      const tt = Math.min(1, (performance.now() - tumbuh.t0) / 900);
      const s = tumbuh.dari + (tumbuh.ke - tumbuh.dari) * mudah(tt);
      const tinggi = Math.min(H * 0.8, H * 0.3 * (tumbuh.t0 ? s : skala) * (W < 520 ? 1.15 : 1));
      const kaki = l.y0 + (l.y1 - l.y0) * 0.72;
      return { x: W / 2, kaki, tinggi, atas: kaki - tinggi };
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
      const sumber = mati != null && runtuh && runtuh.complete ? runtuh : lari;
      if (!sumber || !sumber.complete || !sumber.naturalWidth) return gambarMonsterLucu(g, t, kedip, mati);
      const n = sumber === runtuh ? 9 : 10;
      const fw = sumber.naturalWidth / n, fh = sumber.naturalHeight;
      const i = sumber === runtuh ? Math.min(n - 1, Math.floor((mati || 0) * n)) : Math.floor(t / 200) % n;
      const h = g.tinggi, w = h * fw / fh;
      const goyang = kedip > 0 ? Math.sin(t / 18) * h * 0.012 : 0;
      ctx.save();
      ctx.fillStyle = 'rgba(60,40,20,.2)';
      ctx.beginPath(); ctx.ellipse(g.x, g.kaki, w * 0.42, h * 0.06, 0, 0, Math.PI * 2); ctx.fill();
      if (mati != null && mati > 0.85) ctx.globalAlpha = Math.max(0, 1 - (mati - 0.85) / 0.15);
      ctx.drawImage(sumber, i * fw, 0, fw, fh, g.x - w / 2 + goyang, g.kaki - h, w, h);
      if (kedip > 0) { // kedip terang tipis di atas sprite
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = kedip * 0.35;
        ctx.drawImage(sumber, i * fw, 0, fw, fh, g.x - w / 2 + goyang, g.kaki - h, w, h);
      }
      ctx.restore();
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
      const g = geometri();
      const kedip = Math.max(0, 1 - (t - pukul) / 160);
      let mati = null;
      if (akhir) mati = Math.max(0, Math.min(1, (t - akhir.t0 - 2000) / 2000));
      const tampil = st.fase === 'tanding' || akhir || st.fase === 'menang';
      if (tampil && !(st.fase === 'menang' && !akhir)) {
        (st.wujud === 'lucu' ? gambarMonsterLucu : gambarRajaBatu)(g, t, kedip, mati);
      }
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
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(91,10,22,.75)'; ctx.fillStyle = '#FFE066';
        ctx.strokeText(a.s, a.x, a.y - u * 30); ctx.fillText(a.s, a.x, a.y - u * 30);
        ctx.globalAlpha = 1;
      }
      if (akhir) {
        const p = Math.min(1, (t - akhir.t0) / 4400);
        gambarSinar(g, p);
        if (p >= 1 && !akhir.selesai) { akhir.selesai = true; tampilPesan(); }
      }
      // bar dianimasikan halus menuju nilai server + tap sendiri yang belum terkirim
      const tujuan = st.fase === 'menang' ? target() : Math.min(target(), (st.tenaga || 0) + pending() * poin());
      tampilTenaga = gerakMinim ? tujuan : tampilTenaga + (tujuan - tampilTenaga) * Math.min(1, dt * 6);
      tulisBar();
      const hidup = partikel.length || teks.length || (akhir && !akhir.selesai) || (st.fase === 'tanding' && !gerakMinim) || (tumbuh.t0 && t - tumbuh.t0 < 900);
      if (hidup && panggungTerlihat && !document.hidden) raf = requestAnimationFrame(gambar);
      else tLalu = 0;
    }
    const mulaiGambar = () => { if (!raf && st && !el.hidden) raf = requestAnimationFrame(gambar); };
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { mulaiGambar(); poll(0); } });

    function tulisBar() {
      const tg = target();
      const persen = Math.max(0, Math.min(100, tampilTenaga / Math.max(1, tg) * 100));
      $('.mon__bar i').style.transform = `scaleX(${persen / 100})`;
      $('.mon__bar').setAttribute('aria-valuenow', String(Math.round(persen)));
      $('.mon__angka').textContent = `${nf.format(Math.round(tampilTenaga))} / ${nf.format(tg)} tenaga`;
    }

    /* ---------- Tampilan per fase ---------- */
    function aturBanner() {
      if (!st) { banner.hidden = true; return; }
      const nama = st.nama || 'Monster';
      let isi = '';
      if (st.fase === 'tanding') isi = `<span class="mon-banner__dot"></span><strong>${esc(nama)} muncul di plaza!</strong> Ayo lawan bersama`;
      else if (st.fase === 'tunggu' && Date.parse(st.mulai) - now() < 15 * 60000) isi = `<strong>${esc(nama)}</strong> muncul dalam <span class="mon-banner__jam">${jam(Date.parse(st.mulai) - now())}</span>`;
      banner.innerHTML = isi;
      banner.hidden = !isi || panggungTerlihat;
    }
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    function terapkan(baru) {
      if (!baru || !baru.ok) return;
      const lama = st;
      st = baru;
      const adaEvent = ['tanding', 'menang', 'habis', 'tunggu'].includes(st.fase);
      if (st.id && st.id !== idLama) {
        // event baru: reset tampilan & buang antrean milik event lain
        idLama = st.id; levelLama = st.level || 1; akhir = null; tampilTenaga = st.tenaga || 0; tumbuh = { dari: 1, ke: 1, t0: 0 };
        if (antre.e !== st.id) { antre = { e: st.id, n: 0, kirim: null, seq: 0 }; simpan(KUNCI_ANTRE, antre); }
        muatAset(st.wujud);
      }
      if (st.fase === 'tanding' || st.fase === 'menang' || st.fase === 'habis') muatAset(st.wujud);
      // naik level: monster membesar + kilatan kecil
      if (st.level && levelLama && st.level > levelLama) {
        const sk = st.skala || [];
        tumbuh = { dari: sk[levelLama - 1] || 1, ke: sk[st.level - 1] || 1, t0: performance.now() };
        tampilTenaga = 0;
        tampilAjak(`Level ${st.level}! ${st.nama} membesar, tiap tap kini bernilai ${poin()} poin.`, 3500);
      }
      if (st.level) levelLama = st.level;
      // menang: putar animasi sekali (bila halaman dibuka setelah menang, langsung tampil pesan)
      if (st.fase === 'menang' && !akhir && ditutup !== st.id) {
        const baruSaja = lama && lama.fase === 'tanding' && lama.id === st.id;
        akhir = { t0: performance.now(), selesai: false };
        if (!baruSaja || gerakMinim) { akhir.t0 -= 4500; }
        opsi.saatMenang && opsi.saatMenang(st);
      }
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
      if (!tampil) { pesan.hidden = true; return; }
      if (!W) ukur();
      el.dataset.fase = st.fase;
      hud.hidden = st.fase === 'tunggu';
      tangkap.hidden = !tanding;
      if (fest && fest.setBalon) fest.setBalon(!tanding && !!opsi.bolehTap());
      $('.mon__nama').textContent = st.nama;
      $('.mon__lvl').textContent = st.levelMaks ? `Level ${st.level || 1}/${st.levelMaks}` : '';
      $('.mon__pemain').textContent = st.pemain ? `${nf.format(st.pemain)} pejuang` : '';
      $('.mon__saya').textContent = sayaPoin ? `Kontribusimu ${nf.format(sayaPoin)}` : `+${poin()} per tap`;
      if (st.fase === 'tunggu') tampilAjak(`${st.nama} muncul dalam ${jam(Date.parse(st.mulai) - now())}. Siapkan jarimu!`);
      else if (tanding && !opsi.bolehTap()) tampilAjak('Buka festival dulu (isi data & satu kata di bawah) untuk ikut melawan.');
      else if (tanding && !navigator.onLine) tampilAjak(`Koneksi terputus. ${nf.format(pending())} tap disimpan dan dikirim saat tersambung.`);
      else if (tanding) tampilAjak(ajakTetap ? '' : 'Ketuk warga festival untuk mengirim tenaga!');
      else if (st.fase === 'habis') tampilPesan();
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
      const menang = st.fase === 'menang';
      pesan.hidden = false;
      pesan.querySelector('h3').textContent = menang ? 'Monster Terkalahkan!' : 'Waktu habis!';
      pesan.querySelector('p').textContent = menang
        ? `Terima kasih, pejuang festival! ${sayaPoin ? 'Kamu menyumbang ' + nf.format(sayaPoin) + ' tenaga. ' : ''}Sekarang saatnya live.`
        : `${st.nama} kabur sebelum dikalahkan. Tetap semangat, sampai jumpa di live!`;
      const a = pesan.querySelector('a');
      const link = st.live && st.live.link;
      a.hidden = !link;
      if (link) { a.href = link; a.textContent = Date.parse(st.live.mulai) > now() ? `Live mulai ${new Date(st.live.mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB · Buka` : 'Tonton Live sekarang'; }
      tampilAjak('');
    }
    $('.mon__tutup').addEventListener('click', () => { ditutup = st ? st.id : ''; pesan.hidden = true; el.hidden = true; stage.classList.remove('is-monster'); if (fest && fest.setBalon) fest.setBalon(!!opsi.bolehTap()); });

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
      if (!opsi.bolehTap()) { opsi.saatTerkunci && opsi.saatTerkunci(); return; }
      const r = stage.getBoundingClientRect();
      const x = (ev.clientX ?? r.left + r.width / 2) - r.left, y = (ev.clientY ?? r.top + r.height * 0.7) - r.top;
      // Cari warga terdekat agar tenaga "turun" ke orang yang diketuk; bila tidak ada, ke titik ketukan.
      const w = fest && fest.wargaDi ? fest.wargaDi(x, y, 18) : null;
      const pos = w && fest.posisi(w);
      const tx = pos ? pos.x : x, ty = pos ? pos.y + pos.h * 0.3 : y;
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
    async function pastikanToken() {
      if (token) return token;
      const d = await minta({ aksi: 'masuk' });
      if (!d.ok) throw new Error(d.error || 'masuk');
      token = d.token; simpan(KUNCI_TOKEN, token);
      return token;
    }
    // Satu batch dalam perjalanan; gagal → dikirim ulang dengan seq yang sama.
    async function kirim() {
      if (sedangKirim || !st || st.fase !== 'tanding' || !navigator.onLine) return;
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
        const d = await minta({ aksi: 'tap', token, n: antre.kirim.n, seq: antre.kirim.seq, e: antre.e });
        if (!d.ok) {
          if (d.error === 'sesi_habis') { token = null; simpan(KUNCI_TOKEN, null); }
          throw new Error(d.error);
        }
        const sisa = d.dup || d.buang ? 0 : antre.kirim.n - d.terima; // kelebihan karena batas kecepatan diantrekan lagi
        antre.kirim = null;
        if (d.buang) antre.n = 0; else antre.n = Math.min(MAKS_ANTRE, antre.n + Math.max(0, sisa));
        simpan(KUNCI_ANTRE, antre);
        if (d.saya) sayaPoin = d.saya;
        gagalBeruntun = 0;
        terapkan(d.status);
      } catch (e) {
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
          const r = await fetch(endpoint, { headers: { Accept: 'application/json' } });
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
