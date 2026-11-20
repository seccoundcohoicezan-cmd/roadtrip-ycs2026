/* Rig Raja Batu: frame berdiri (frame 0 raja-lari) dipotong jadi badan + lengan trisula + lengan tinju.
   Lengan berputar di bahu, badan melengkung per irisan (condong/memutar/jongkok, rambut ikut bergoyang),
   sehingga serangan tidak kaku. Tiga jurus: tusuk (tinju menusuk ke depan), tebas (trisula menebas
   diagonal), hentak (melompat lalu menghantam tanah). Dipakai latihan.js dan monster.js. */
(() => {
  'use strict';
  const FW = 166, FH = 200;
  // Wilayah (pecahan frame). Lengan diberi tepi lembut keluar dari wilayah badan yang dihapus → tanpa sambungan.
  const SENJATA = [[0, 0], [0.27, 0], [0.27, 0.45], [0.2, 0.45], [0.2, 0.8], [0, 0.8]], PIV_S = [0.27, 0.27];
  const TINJU = [[0.6, 0.32], [1, 0.32], [1, 0.6], [0.6, 0.6]], PIV_T = [0.62, 0.34];
  const JURUS = {
    tusuk: { nama: 'Tusukan Api', awas: 'Raja Batu menarik tinjunya — Tusukan Api!' },
    tebas: { nama: 'Tebasan Trisula', awas: 'Raja Batu mengangkat trisula — Tebasan Trisula!' },
    hentak: { nama: 'Hentakan Bumi', awas: 'Raja Batu melompat — Hentakan Bumi!' },
    meteor: { nama: 'Hujan Meteor Api', awas: 'Raja Batu menancapkan trisula — HUJAN METEOR! Pasang PERISAI!' },
  };
  const DAFTAR = ['tusuk', 'tebas', 'hentak']; // jurus sasaran; 'meteor' = jurus area (lihat hujan/gambarHujan)

  function kanvas() { const c = document.createElement('canvas'); c.width = FW; c.height = FH; return c; }
  function jalur(x, poli) { x.beginPath(); poli.forEach(([a, b], i) => (i ? x.lineTo(a * FW, b * FH) : x.moveTo(a * FW, b * FH))); x.closePath(); }
  function bangun(img) {
    if (!img || !img.complete || !img.naturalWidth) return null;
    const asli = kanvas(), ax = asli.getContext('2d'); ax.drawImage(img, 0, 0, FW, FH, 0, 0, FW, FH);
    const badan = kanvas(), bx = badan.getContext('2d'); bx.drawImage(asli, 0, 0);
    bx.globalCompositeOperation = 'destination-out'; bx.fillStyle = '#000';
    jalur(bx, SENJATA); bx.fill(); jalur(bx, TINJU); bx.fill();
    const potong = (poli) => { // lengan: wilayah + tepi lembut 4 px ke luar (menimpa badan yang masih utuh di sekitarnya)
      const c = kanvas(), x = c.getContext('2d');
      x.save(); x.filter = 'blur(2px)'; x.lineWidth = 8; x.strokeStyle = '#000'; x.fillStyle = '#000'; jalur(x, poli); x.fill(); x.stroke(); x.restore();
      x.globalCompositeOperation = 'source-in'; x.drawImage(asli, 0, 0); return c;
    };
    return { badan, senjata: potong(SENJATA), tinju: potong(TINJU) };
  }

  const halus = (u) => u * u * (3 - 2 * u), keluar = (u) => 1 - Math.pow(1 - u, 3), batas = (u) => Math.max(0, Math.min(1, u));
  // Pose per jurus. fase 'awal' (ancang-ancang, p 0..1) atau 'serang' (p 0..1: 0–0,16 hentakan, 0,16–0,3 tahan, sisanya pulih).
  // Satuan: condong/rot dalam radian, geser dalam pecahan frame.
  const lerpPose = (A, B, u) => { const R = { ...B }; for (const k in B) if (typeof B[k] === 'number' && typeof A[k] === 'number') R[k] = A[k] + (B[k] - A[k]) * u; return R; };
  // Serang dimulai TEPAT dari pose akhir ancang-ancang (tanpa loncatan ke pose netral) lalu meledak ke pose benturan.
  function pose(jenis, fase, p, t) {
    if (fase !== 'serang' || jenis === 'meteor' || p >= 0.12) return poseMentah(jenis, fase, p, t);
    const A = poseMentah(jenis, 'awal', 1, t), B = poseMentah(jenis, 'serang', 0.12, t), R = lerpPose(A, B, keluar(p / 0.12));
    R.benturan = poseMentah(jenis, 'serang', p, t).benturan; return R;
  }
  function poseMentah(jenis, fase, p, t) {
    const P = { condong: 0, putar: 0, jongkok: 0, angkat: 0, rS: 0, sS: 1, rT: 0, sT: 1, tTx: 0, tTy: 0, sTx: 0, sTy: 0, skala: 1, geserX: 0, goyang: 0.004, benturan: false, ujung: null };
    const g = Math.sin(t / 23) * 0.012 * (fase === 'awal' ? p : 0);
    if (fase === 'awal') {
      const e = halus(p);
      P.goyang = 0.006 + 0.02 * p;
      if (jenis === 'tusuk') { P.condong = -0.24 * e; P.putar = -0.35 * e; P.jongkok = 0.08 * e; P.rT = -1.15 * e; P.tTx = 0.06 * e; P.sT = 1 - 0.18 * e; P.rS = 0.45 * e; }
      if (jenis === 'tebas') { P.condong = -0.2 * e; P.putar = 0.3 * e; P.rS = -1.3 * e + g * 4; P.sS = 1 + 0.1 * e; P.rT = 0.6 * e; P.jongkok = 0.06 * e; }
      if (jenis === 'hentak') { P.jongkok = p < 0.6 ? 0.14 * halus(p / 0.6) : 0.14 * (1 - halus((p - 0.6) / 0.4)); P.angkat = p < 0.6 ? 0 : 0.42 * keluar((p - 0.6) / 0.4); P.rS = -1.4 * e; P.rT = -1.6 * e; P.condong = -0.08 * e; }
      if (jenis === 'meteor') { // mengangkat trisula tinggi-tinggi dengan dua tangan, tinju menengadah memanggil langit
        const naik = keluar(Math.min(1, p / 0.7));
        P.sTy = -0.26 * naik; P.rS = -0.12 * naik; P.sS = 1 + 0.06 * naik; P.rT = -2.2 * e; P.tTy = -0.04 * e; P.condong = -0.1 * e; P.jongkok = 0.03 * e; P.goyang = 0.01 + 0.03 * p;
      }
      P.condong += g;
    } else if (jenis === 'meteor') {
      // 0–0,07 trisula DITANCAPKAN ke tanah · 0,07–0,86 diam menahan (meteor berjatuhan) · 0,86–1 pulih
      const tancap = p < 0.07 ? keluar(p / 0.07) : 1, pulih = p < 0.86 ? 0 : halus((p - 0.86) / 0.14), m = tancap * (1 - pulih);
      const naik = (1 - tancap) * (1 - pulih);
      P.sTy = -0.26 * naik + 0.2 * m; P.rS = -0.12 * naik + 0.05 * m; P.sS = 1 + 0.06 * naik;
      P.jongkok = 0.03 * naik + 0.1 * m - 0.02 * m * Math.sin(p * 30) * (p > 0.07 && p < 0.3 ? (0.3 - p) / 0.23 : 0);
      P.rT = -2.2 * (1 - pulih) + Math.sin(t / 60) * 0.06 * m; P.tTy = -0.04 * (1 - pulih); P.condong = -0.1 * naik + 0.06 * m;
      P.goyang = 0.006 + 0.03 * m; P.benturan = p >= 0.07 && p < 0.3; P.ujung = 'tongkat';
    } else {
      // 0–0,12 meledak maju · 0,12–0,45 tahan (benturan + lanjutan gerak) · 0,45–1 pulih ke kuda-kuda
      const m = p < 0.12 ? keluar(p / 0.12) : p < 0.45 ? 1 : Math.pow(Math.max(0, 1 - (p - 0.45) / 0.55), 2);
      const lanjut = p < 0.12 ? 0 : Math.min(1, (p - 0.12) / 0.33); // sedikit terus bergerak saat tahan (tidak beku mati)
      P.benturan = p >= 0.12 && p < 0.45;
      P.goyang = 0.004 + 0.035 * m;
      if (jenis === 'tusuk') { P.condong = (0.34 + 0.04 * lanjut) * m; P.putar = 0.42 * m; P.jongkok = 0.07 * m; P.rT = -0.15 * m; P.sT = 1 + (1.25 + 0.1 * lanjut) * m; P.tTx = -0.2 * m; P.tTy = 0.09 * m; P.rS = 0.65 * m; P.sS = 1 - 0.1 * m; P.skala = 1 + 0.14 * m; P.ujung = 'tinju'; }
      if (jenis === 'tebas') { const sw = p < 0.12 ? keluar(p / 0.12) : 1; const kembali = p < 0.45 ? 1 : Math.pow(Math.max(0, 1 - (p - 0.45) / 0.55), 2); P.rS = (-1.3 + (2.7 + 0.15 * lanjut) * sw) * kembali; P.sS = 1 + 0.2 * m; P.condong = 0.28 * m; P.putar = -0.4 * m; P.rT = 0.45 * m; P.skala = 1 + 0.1 * m; P.ujung = 'senjata'; }
      if (jenis === 'hentak') { const jatuh = p < 0.1 ? 1 - keluar(p / 0.1) : 0; const kembali = p < 0.45 ? 1 : Math.pow(Math.max(0, 1 - (p - 0.45) / 0.55), 2); P.angkat = 0.42 * jatuh; P.jongkok = p < 0.1 ? 0 : 0.2 * m; P.rS = -1.45 + 1.45 * (1 - kembali) + 2.0 * (p < 0.1 ? keluar(p / 0.1) : 1) * kembali; P.rT = -1.6 + 1.6 * (1 - kembali) + 2.2 * (p < 0.1 ? keluar(p / 0.1) : 1) * kembali; P.condong = 0.18 * m; P.skala = 1 + 0.08 * m; P.ujung = 'tanah'; P.benturan = p >= 0.1 && p < 0.45; }
    }
    return P;
  }

  // Gambar rig ke ctx di kotak o {x, y, w, h, balik}. Mengembalikan titik ujung serangan (koordinat ctx) untuk efek.
  function gambar(ctx, rig, o, P, t) {
    const sx = o.w / FW, sy = o.h / FH, N = 16, dasar = ctx.getTransform().inverse();
    const kaki = o.y + o.h, cx = o.x + o.w / 2;
    ctx.save();
    // skala & lompat dengan pivot di kaki
    ctx.translate(cx, kaki - P.angkat * o.h); ctx.scale(P.skala * (1 + P.jongkok * 0.4), P.skala * (1 - P.jongkok)); ctx.translate(-cx, -kaki);
    if (o.balik) { ctx.translate(cx, 0); ctx.scale(-1, 1); ctx.translate(-cx, 0); }
    // geser irisan badan: condong (makin tinggi makin jauh), putar (badan atas melebar/menyempit), rambut/ornamen bergoyang
    const geser = (fy) => { const k = 1 - fy; return (Math.sin(P.condong) * k * k * 0.9 + Math.sin(t / 95 + fy * 7) * P.goyang * k * k * k * 2) * FH; };
    for (let i = 0; i < N; i++) {
      const y0 = i / N * FH, hh = FH / N + 0.8, fy = (i + 0.5) / N, k = 1 - fy;
      const lebar = 1 + P.putar * 0.18 * k, dx = geser(fy) + (FW - FW * lebar) / 2;
      ctx.drawImage(rig.badan, 0, y0, FW, hh, o.x + dx * sx, o.y + y0 * sy, FW * lebar * sx, hh * sy);
    }
    const lengan = (img, piv, r, s, tx, ty) => {
      const fy = piv[1], lebar = 1 + P.putar * 0.18 * (1 - fy);
      const bx = o.x + (piv[0] * FW * lebar + geser(fy) + (FW - FW * lebar) / 2) * sx, by = o.y + piv[1] * FH * sy;
      ctx.save(); ctx.translate(bx + tx * o.w, by + ty * o.h); ctx.rotate(r); ctx.scale(s, s); ctx.translate(-piv[0] * FW * sx, -piv[1] * FH * sy);
      ctx.drawImage(img, 0, 0, FW, FH, 0, 0, o.w, o.h); ctx.restore();
      return [bx + tx * o.w, by + ty * o.h];
    };
    const bahuT = lengan(rig.tinju, PIV_T, P.rT, P.sT, P.tTx, P.tTy);
    const bahuS = lengan(rig.senjata, PIV_S, P.rS, P.sS, P.sTx || 0, P.sTy || 0);
    const m = ctx.getTransform();
    ctx.restore();
    // titik ujung serangan dalam koordinat ctx
    const titik = (lx, ly) => { const q = dasar.transformPoint(m.transformPoint(new DOMPoint(lx, ly))); return [q.x, q.y]; };
    if (P.ujung === 'tinju') { const d = 0.17 * o.w * P.sT, a = P.rT + 0.25; return titik(bahuT[0] + Math.cos(a) * d, bahuT[1] + Math.sin(a) * d); }
    if (P.ujung === 'senjata') { const d = 0.36 * o.h * P.sS, a = P.rS - Math.PI / 2 - 0.15; return titik(bahuS[0] + Math.cos(a) * d, bahuS[1] + Math.sin(a) * d); }
    if (P.ujung === 'tanah') return titik(cx, kaki);
    if (P.ujung === 'tongkat') { const dx = (0.1 - PIV_S[0]) * o.w * P.sS, dy = (0.8 - PIV_S[1]) * o.h * P.sS, c = Math.cos(P.rS), n = Math.sin(P.rS); return titik(bahuS[0] + dx * c - dy * n, bahuS[1] + dx * n + dy * c); }
    return null;
  }
  // ===== Hujan Meteor Api (jurus area) =====
  // hujan(seed, n, area) → daftar meteor deterministik (sama di semua HP untuk jurus yang sama).
  // Tiap meteor: titik jatuh (tx, ty), waktu jatuh tl (pecahan fase serang), ukuran r.
  const JATUH = 0.13;
  function hujan(seed, n, area, khusus) {
    let a = (Math.abs(Math.floor(seed)) % 233280) || 1;
    const r = () => (a = (a * 9301 + 49297) % 233280) / 233280;
    const out = [];
    for (let i = 0; i < n; i++) {
      const tl = 0.2 + 0.68 * (i / n) + (r() - 0.5) * 0.06;
      out.push({ tx: area.x0 + (area.x1 - area.x0) * r(), ty: area.y0 + (area.y1 - area.y0) * Math.sqrt(r()), tl, r: 0.65 + r() * 0.7, sx: 0.25 + r() * 0.25, kilau: r() });
    }
    (khusus || []).forEach(([tx, ty], i) => { const m = out[Math.floor((i * 7 + 3) % n)]; if (m) { m.tx = tx; m.ty = ty; m.r = Math.max(m.r, 1); } });
    return out;
  }
  // gambarHujan(ctx, daftar, u, uk, H, opsi) — u = progres fase serang 0..1, uk = ukuran dasar (px).
  // Telegraf lingkaran merah yang menyempit di titik jatuh → meteor menyala jatuh miring dengan ekor api → ledakan,
  // cincin kejut & bekas hangus. Mengembalikan kekuatan getar (0..1) untuk kamera.
  function gambarHujan(ctx, daftar, u, uk, H, opsi = {}) {
    let getar = 0;
    ctx.save();
    // bekas hangus & telegraf (di lantai, digambar dulu)
    for (const m of daftar) {
      const R = uk * 1.25 * m.r, d = u - m.tl;
      if (d >= 0) { const k = Math.min(1, d / 0.5); ctx.globalAlpha = 0.45 * (1 - k * 0.7); ctx.fillStyle = 'rgb(40,18,8)'; ctx.beginPath(); ctx.ellipse(m.tx, m.ty, R * 0.8, R * 0.24, 0, 0, 6.283); ctx.fill(); }
      else if (d > -0.42) {
        const k = 1 + d / 0.42; // 0 → 1 mendekati jatuh
        ctx.globalAlpha = 0.25 + 0.55 * k; ctx.strokeStyle = 'rgb(255,70,40)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(m.tx, m.ty, R, R * 0.3, 0, 0, 6.283); ctx.stroke();
        ctx.fillStyle = `rgba(255,60,30,${0.12 + 0.2 * k})`; ctx.beginPath(); ctx.ellipse(m.tx, m.ty, R * (1.6 - 0.6 * k), R * 0.3 * (1.6 - 0.6 * k), 0, 0, 6.283); ctx.fill();
        ctx.globalAlpha = 0.5 + 0.5 * k; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(m.tx, m.ty, R * (1.7 - 0.7 * k), R * 0.3 * (1.7 - 0.7 * k), 0, 0, 6.283); ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const m of daftar) {
      const f = (u - (m.tl - JATUH)) / JATUH, R = uk * m.r;
      if (f > 0 && f < 1) { // meteor jatuh miring dengan ekor api
        const e = f * f, L = H * 1.15, dx = -L * m.sx, dy = -L;
        const hx = m.tx + dx * (1 - e), hy = m.ty + dy * (1 - e), ek = R * (5 + 4 * f);
        const nx = dx / Math.hypot(dx, dy), ny = dy / Math.hypot(dx, dy);
        const gr = ctx.createLinearGradient(hx, hy, hx + nx * ek, hy + ny * ek);
        gr.addColorStop(0, 'rgba(255,240,190,.95)'); gr.addColorStop(0.25, 'rgba(255,150,40,.7)'); gr.addColorStop(1, 'rgba(255,60,20,0)');
        ctx.globalAlpha = 1; ctx.strokeStyle = gr; ctx.lineCap = 'round';
        ctx.lineWidth = R * 0.9; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + nx * ek, hy + ny * ek); ctx.stroke();
        ctx.lineWidth = R * 0.35; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + nx * ek * 0.6, hy + ny * ek * 0.6); ctx.stroke();
        const gk = ctx.createRadialGradient(hx, hy, 0, hx, hy, R * 1.3);
        gk.addColorStop(0, 'rgba(255,255,230,1)'); gk.addColorStop(0.45, 'rgba(255,170,50,.9)'); gk.addColorStop(1, 'rgba(255,70,20,0)');
        ctx.fillStyle = gk; ctx.beginPath(); ctx.arc(hx, hy, R * 1.3, 0, 6.283); ctx.fill();
      }
      const d = (u - m.tl) / 0.16;
      if (d >= 0 && d < 1) { // ledakan + cincin kejut + percikan
        const k = 1 - d, e = 1 - k * k;
        if (d < 0.25) getar = Math.max(getar, (1 - d / 0.25) * Math.min(1, m.r));
        const rf = R * (1.2 + 2.6 * e), gf = ctx.createRadialGradient(m.tx, m.ty - R * 0.4, 0, m.tx, m.ty - R * 0.4, rf);
        gf.addColorStop(0, `rgba(255,250,215,${k})`); gf.addColorStop(0.4, `rgba(255,150,40,${0.75 * k})`); gf.addColorStop(1, 'rgba(255,60,20,0)');
        ctx.globalAlpha = 1; ctx.fillStyle = gf; ctx.beginPath(); ctx.arc(m.tx, m.ty - R * 0.4, rf, 0, 6.283); ctx.fill();
        ctx.strokeStyle = `rgba(255,200,120,${0.8 * k})`; ctx.lineWidth = 1 + 4 * k; ctx.beginPath(); ctx.ellipse(m.tx, m.ty, R * (0.6 + 3 * e), R * (0.18 + 0.9 * e), 0, 0, 6.283); ctx.stroke();
        if (!opsi.hemat) for (let j = 0; j < 7; j++) { const a = -Math.PI * (0.1 + 0.8 * ((j * 0.37 + m.kilau) % 1)), v = R * (1.5 + 3 * ((j * 0.53 + m.kilau) % 1)); ctx.fillStyle = `rgba(255,${180 + j * 10},90,${k})`; ctx.beginPath(); ctx.arc(m.tx + Math.cos(a) * v * e, m.ty + Math.sin(a) * v * e + R * 2 * d * d, R * 0.16 * k + 0.5, 0, 6.283); ctx.fill(); }
      }
    }
    ctx.restore();
    return getar;
  }
  // Kubah perisai emas (dipakai saat pemain menekan PERISAI). k 0..1 = kekuatan muncul, kena = kilatan saat meteor memantul.
  function gambarPerisai(ctx, x, y, r, t, k, kena) {
    if (k <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
    g.addColorStop(0, 'rgba(255,230,140,0)'); g.addColorStop(0.75, `rgba(255,214,90,${0.18 * k})`); g.addColorStop(1, `rgba(255,240,170,${(0.55 + 0.4 * (kena || 0)) * k})`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * (1 + 0.03 * Math.sin(t / 90)), Math.PI, 0); ctx.ellipse(x, y, r, r * 0.3, 0, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = `rgba(255,236,150,${0.9 * k})`; ctx.lineWidth = 2 + 3 * (kena || 0);
    ctx.beginPath(); ctx.arc(x, y, r * (1 + 0.03 * Math.sin(t / 90)), Math.PI, 0); ctx.stroke();
    ctx.globalAlpha = 0.35 * k; ctx.lineWidth = 1; // garis heksagon tipis berputar
    for (let i = 0; i < 5; i++) { const a = Math.PI * (0.15 + i * 0.175) + (t / 2400) % 0.35; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(Math.PI + a) * r, y + Math.sin(Math.PI + a) * r); ctx.stroke(); }
    ctx.restore();
  }
  // Animasi nyawa berkurang di tengah layar: hati besar muncul → retak dicoret → terbelah dua & jatuh, lalu sisa nyawa.
  // wadah = elemen posisi relatif (dialog latihan / panggung arena). sisa & maks = nyawa setelah berkurang.
  const HATI_D = 'M12 20.5s-8-4.6-8-10.4A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 8 2.5c0 5.8-8 10.4-8 10.4Z';
  function hatiPecah(wadah, sisa, maks, label) {
    if (!wadah) return;
    const lama = wadah.querySelector(':scope > .hati-pecah'); if (lama) lama.remove();
    const el = document.createElement('div');
    el.className = 'hati-pecah'; el.setAttribute('aria-hidden', 'true');
    const svg = (cls) => `<svg class="${cls}" viewBox="2 5 20 18"><path d="${HATI_D}"/></svg>`;
    const deret = Array.from({ length: maks }, (_, i) => `<i class="${i < sisa ? '' : i === sisa ? 'is-baru' : 'is-habis'}"></i>`).join('');
    el.innerHTML = `<div class="hati-pecah__hati">${svg('hp-kiri')}${svg('hp-kanan')}<svg class="hp-retak" viewBox="2 5 20 18"><path d="M12.6 7.4 10.8 11l2.3 2-2 3.2 1.1 3.8"/></svg></div>
      <p class="hati-pecah__teks"><b>−1</b> ${label || 'nyawa'}</p><p class="hati-pecah__deret">${deret}</p>`;
    wadah.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }
  window.YCSRajaRig = { hatiPecah, bangun, pose, gambar, JURUS, DAFTAR, hujan, gambarHujan, gambarPerisai };
})();
