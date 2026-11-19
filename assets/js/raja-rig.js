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
  };
  const DAFTAR = ['tusuk', 'tebas', 'hentak'];

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
  function pose(jenis, fase, p, t) {
    const P = { condong: 0, putar: 0, jongkok: 0, angkat: 0, rS: 0, sS: 1, rT: 0, sT: 1, tTx: 0, tTy: 0, skala: 1, geserX: 0, goyang: 0.004, benturan: false, ujung: null };
    const g = Math.sin(t / 23) * 0.012 * (fase === 'awal' ? p : 0);
    if (fase === 'awal') {
      const e = halus(p);
      P.goyang = 0.006 + 0.02 * p;
      if (jenis === 'tusuk') { P.condong = -0.24 * e; P.putar = -0.35 * e; P.jongkok = 0.08 * e; P.rT = -1.15 * e; P.tTx = 0.06 * e; P.sT = 1 - 0.18 * e; P.rS = 0.45 * e; }
      if (jenis === 'tebas') { P.condong = -0.2 * e; P.putar = 0.3 * e; P.rS = -1.3 * e + g * 4; P.sS = 1 + 0.1 * e; P.rT = 0.6 * e; P.jongkok = 0.06 * e; }
      if (jenis === 'hentak') { P.jongkok = p < 0.6 ? 0.14 * halus(p / 0.6) : 0.14 * (1 - halus((p - 0.6) / 0.4)); P.angkat = p < 0.6 ? 0 : 0.42 * keluar((p - 0.6) / 0.4); P.rS = -1.4 * e; P.rT = -1.6 * e; P.condong = -0.08 * e; }
      P.condong += g;
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
    const bahuS = lengan(rig.senjata, PIV_S, P.rS, P.sS, 0, 0);
    const m = ctx.getTransform();
    ctx.restore();
    // titik ujung serangan dalam koordinat ctx
    const titik = (lx, ly) => { const q = dasar.transformPoint(m.transformPoint(new DOMPoint(lx, ly))); return [q.x, q.y]; };
    if (P.ujung === 'tinju') { const d = 0.17 * o.w * P.sT, a = P.rT + 0.25; return titik(bahuT[0] + Math.cos(a) * d, bahuT[1] + Math.sin(a) * d); }
    if (P.ujung === 'senjata') { const d = 0.36 * o.h * P.sS, a = P.rS - Math.PI / 2 - 0.15; return titik(bahuS[0] + Math.cos(a) * d, bahuS[1] + Math.sin(a) * d); }
    if (P.ujung === 'tanah') return titik(cx, kaki);
    return null;
  }
  window.YCSRajaRig = { bangun, pose, gambar, JURUS, DAFTAR };
})();
