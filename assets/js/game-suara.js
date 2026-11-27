/* Suara & getar game YCS — tanpa file audio: semua disintesis WebAudio (ringan, tanpa unduhan). Bisa dimatikan (disimpan di perangkat).
   - Efek pendek: pukul, kritis, awas, aman, kena, menang, kalah, klik (dipakai latihan & lobi).
   - Pertempuran (Lawan Monster): musik latar orkestra-perang orisinal (genderang, drone, ostinato, brass) + efek jurus
     yang dijadwalkan pada jam audio (tepat di detik benturan animasi) + suara tap yang naik nadanya mengikuti combo. */
(() => {
  'use strict';
  let ctx = null, nyala = true, master = null, busMusik = null, busEfek = null, noiseBuf = null;
  try { nyala = localStorage.getItem('ycs_suara') !== '0'; } catch (e) {}
  const siap = () => {
    if (!nyala) return null;
    if (!ctx) {
      const A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
      ctx = new A();
      const komp = ctx.createDynamicsCompressor(); // satu kompresor di akhir: banyak ledakan bersamaan tidak pecah
      komp.threshold.value = -14; komp.knee.value = 10; komp.ratio.value = 6; komp.attack.value = 0.003; komp.release.value = 0.2;
      master = ctx.createGain(); master.gain.value = 0.9; master.connect(komp).connect(ctx.destination);
      busMusik = ctx.createGain(); busMusik.gain.value = 0; busMusik.connect(master);
      busEfek = ctx.createGain(); busEfek.gain.value = 1; busEfek.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  const T = (tunda = 0) => ctx.currentTime + Math.max(0, tunda);
  const ke = (node, pan) => {
    if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); node.connect(p); return p; }
    return node;
  };
  // nada sederhana (efek lama)
  function nada(f1, f2, ms, jenis = 'square', vol = 0.06, tunda = 0) {
    const c = siap(); if (!c) return;
    const t = T(tunda), o = c.createOscillator(), g = c.createGain();
    o.type = jenis; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + ms / 1000);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    o.connect(g).connect(busEfek); o.start(t); o.stop(t + ms / 1000 + 0.02);
  }
  // osilator dengan amplop: serang a, tahan sampai durasi d, lepas r (detik)
  function osc(t, jenis, f, d, vol, { a = 0.005, r = 0.08, f2 = null, ke: tujuan = busEfek, pan = 0, filter = null, detune = 0 } = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = jenis; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.setValueAtTime(vol, t + Math.max(a, d - r)); g.gain.exponentialRampToValueAtTime(0.0001, t + d + r);
    let n = o; if (filter) { n.connect(filter); n = filter; }
    n.connect(g); ke(g, pan).connect(tujuan); o.start(t); o.stop(t + d + r + 0.05);
    return o;
  }
  // derau berfilter (ledakan, desir, gemuruh)
  function derau(t, d, vol, { tipe = 'lowpass', f = 800, f2 = null, q = 0.7, a = 0.004, ke: tujuan = busEfek, pan = 0, mulaiAcak = true } = {}) {
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true;
    fl.type = tipe; fl.Q.value = q; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(fl).connect(g); ke(g, pan).connect(tujuan);
    s.start(t, mulaiAcak ? Math.random() : 0); s.stop(t + d + 0.05);
  }
  const getar = (pola) => { try { if (nyala && navigator.vibrate) navigator.vibrate(pola); } catch (e) {} };

  /* ===================== Efek jurus (dijadwalkan: tunda dalam detik dari sekarang) ===================== */
  // Ledakan: sub turun + derau kresek + ekor gemuruh. kuat 0.3..1.5
  function ledakan(tunda, kuat = 1, pan = 0) {
    if (!siap()) return; const t = T(tunda), k = Math.min(1.5, kuat);
    osc(t, 'sine', 95 + 20 * Math.random(), 0.35 + 0.25 * k, 0.5 * k, { a: 0.003, r: 0.25, f2: 32, pan: pan * 0.6 });
    derau(t, 0.18 + 0.12 * k, 0.55 * k, { f: 5200, f2: 500, pan });
    derau(t + 0.02, 0.7 + 0.5 * k, 0.22 * k, { f: 900, f2: 90, q: 0.5, pan: pan * 0.5 });
  }
  // Desir meteor jatuh: siul turun + desis udara yang makin keras sampai menghantam
  function siulMeteor(tunda, dur, pan = 0, kuat = 1) {
    if (!siap()) return; const t = T(tunda), d = Math.max(0.12, dur);
    const g = ctx.createGain(), o = ctx.createOscillator();
    o.type = 'sine'; o.frequency.setValueAtTime(1500 + 500 * Math.random(), t); o.frequency.exponentialRampToValueAtTime(260, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05 * kuat, t + d * 0.85); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.02);
    o.connect(g); ke(g, pan).connect(busEfek); o.start(t); o.stop(t + d + 0.05);
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g2 = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true; fl.type = 'bandpass'; fl.Q.value = 2.5;
    fl.frequency.setValueAtTime(3500, t); fl.frequency.exponentialRampToValueAtTime(700, t + d);
    g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(0.16 * kuat, t + d); g2.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.03);
    s.connect(fl).connect(g2); ke(g2, pan).connect(busEfek); s.start(t, Math.random()); s.stop(t + d + 0.06);
  }
  // Api terkumpul (ancang-ancang): gemuruh naik + nada naik
  function kumpulApi(tunda, dur) {
    if (!siap() || dur < 0.15) return; const t = T(tunda);
    derau(t, dur, 0.16, { tipe: 'bandpass', f: 220, f2: 1800, q: 1.2, a: dur * 0.8 });
    osc(t, 'sawtooth', 70, dur, 0.05, { a: dur * 0.9, r: 0.05, f2: 210, filter: Object.assign(ctx.createBiquadFilter(), { type: 'lowpass' }) });
  }
  // Ayunan (whoosh) sebelum benturan
  function ayun(tunda, dur, tinggi = false) {
    if (!siap()) return; const t = T(tunda);
    derau(t, Math.max(0.08, dur), 0.3, { tipe: 'bandpass', f: tinggi ? 1200 : 500, f2: tinggi ? 6000 : 2200, q: 1.4, a: Math.max(0.01, dur * 0.7) });
  }
  // Benturan per jurus — tepat di detik kontak
  const BENTUR = {
    tusuk(t) { // tinju: hantaman padat + tamparan
      osc(t, 'sine', 160, 0.22, 0.7, { a: 0.002, r: 0.18, f2: 45 });
      derau(t, 0.09, 0.5, { f: 3500, f2: 600 });
      derau(t, 0.5, 0.2, { f: 700, f2: 80 });
    },
    tebas(t) { // trisula menebas: desis tajam + dering logam
      derau(t - 0.04, 0.16, 0.35, { tipe: 'highpass', f: 2500, f2: 7000, q: 0.8 });
      [880, 1327, 2213].forEach((f, i) => osc(t, 'triangle', f, 0.04, 0.09 / (i + 1), { a: 0.001, r: 0.6 }));
      osc(t, 'sine', 120, 0.18, 0.45, { a: 0.002, r: 0.15, f2: 50 });
    },
    hentak(t) { // menghantam tanah: sub sangat dalam + gemuruh panjang
      osc(t, 'sine', 70, 0.5, 0.85, { a: 0.002, r: 0.5, f2: 28 });
      derau(t, 0.12, 0.5, { f: 2500, f2: 300 });
      derau(t + 0.03, 1.4, 0.3, { f: 400, f2: 50, q: 0.4 });
    },
    meteor(t) { // trisula ditancapkan: dentang logam + gemuruh
      [440, 663, 1108].forEach((f, i) => osc(t, 'triangle', f, 0.05, 0.12 / (i + 1), { a: 0.001, r: 0.9 }));
      osc(t, 'sine', 80, 0.4, 0.6, { a: 0.002, r: 0.4, f2: 30 });
      derau(t, 1.2, 0.18, { f: 500, f2: 60 });
    },
  };
  function benturan(jenis, tunda) { if (!siap()) return; const t = T(tunda); (BENTUR[jenis] || BENTUR.tusuk)(t); musikRedam(t, 0.5); }

  /* ===================== Potion (Racun / Gempa / Petir) — selaras dengan YCSPotion.KENA ===================== */
  function potion(jenis, tunda = 0) {
    if (!siap()) return; const t = T(tunda);
    if (jenis === 'petir') {
      osc(t, 'sawtooth', 120, 0.14, 0.05, { a: 0.1, r: 0.02, f2: 900 }); // listrik mengumpul
      [0.156, 0.39, 0.624].forEach((d, i) => {
        derau(t + d, 0.16, 0.9, { tipe: 'highpass', f: 1800, f2: 600, q: 0.6, pan: (i - 1) * 0.5 }); // CETAR
        osc(t + d, 'sine', 90, 0.4, 0.6, { a: 0.002, r: 0.5, f2: 35 });
        derau(t + d + 0.03, 1.4, 0.3, { f: 600, f2: 60, q: 0.4 }); // gemuruh guntur
      });
      musikRedam(t + 0.15, 0.8);
    } else if (jenis === 'gempa') {
      osc(t, 'sine', 42, 1.3, 0.7, { a: 0.05, r: 0.4 }); osc(t, 'sine', 39, 1.3, 0.6, { a: 0.05, r: 0.4 });
      derau(t, 1.5, 0.5, { f: 300, f2: 60, q: 0.5, a: 0.04 });
      osc(t + 0.225, 'sine', 70, 0.4, 0.8, { a: 0.002, r: 0.5, f2: 28 });
      for (let i = 0; i < 16; i++) derau(t + 0.2 + Math.random() * 0.9, 0.05, 0.12 + Math.random() * 0.1, { tipe: 'bandpass', f: 900 + Math.random() * 1800, q: 2, pan: Math.random() * 2 - 1 }); // batu berjatuhan
      musikRedam(t, 1.2);
    } else {
      derau(t, 1.9, 0.14, { tipe: 'bandpass', f: 2600, q: 1.2, a: 0.25 }); // desis kabut
      for (let i = 0; i < 18; i++) { const d = 0.1 + Math.random() * 1.7, f = 260 + Math.random() * 300; osc(t + d, 'sine', f, 0.06, 0.08, { a: 0.003, r: 0.05, f2: f * 2.6, pan: Math.random() * 1.6 - 0.8 }); } // gelembung
      [0.3, 0.7, 1.1, 1.5].forEach((d) => osc(t + d, 'square', 180, 0.05, 0.05, { a: 0.002, r: 0.06, f2: 90 })); // tik kerusakan
    }
    getar(jenis === 'gempa' ? [80, 40, 120, 40, 200] : jenis === 'petir' ? [40, 120, 40, 120, 60] : [20, 60, 20]);
  }

  /* ===================== Tap: candu (nada naik per combo, skala pentatonik) ===================== */
  const PENTA = [0, 2, 4, 7, 9];
  const nadaCombo = (combo) => { const i = Math.max(0, combo - 1) % 15; return 392 * Math.pow(2, (Math.floor(i / 5) * 12 + PENTA[i % 5]) / 12); };
  function tap(combo, pan = 0) { // saat jari mengetuk: petik cerah
    if (!siap()) return; const t = T(), f = nadaCombo(combo);
    osc(t, 'triangle', f, 0.03, 0.09, { a: 0.002, r: 0.12, pan });
    osc(t, 'sine', f * 2, 0.02, 0.035, { a: 0.002, r: 0.08, pan });
  }
  function tapKena(tunda, combo, pan = 0, keMonster = true) { // saat tenaga mendarat: pukulan renyah
    if (!siap()) return; const t = T(tunda);
    osc(t, 'sine', keMonster ? 210 : 330, 0.06, 0.28, { a: 0.002, r: 0.06, f2: keMonster ? 70 : 140, pan });
    derau(t, 0.05, 0.16, { tipe: 'bandpass', f: 2200 + Math.min(combo, 30) * 60, q: 1, pan });
  }
  function milestone(n) { // setiap kelipatan combo: arpeggio naik + kilau
    if (!siap()) return; const t = T(), dasar = n >= 50 ? 659 : n >= 25 ? 587 : 523;
    [0, 4, 7, 12].forEach((s, i) => osc(t + i * 0.06, 'triangle', dasar * Math.pow(2, s / 12), 0.06, 0.08, { a: 0.003, r: 0.25 }));
    derau(t + 0.18, 0.5, 0.06, { tipe: 'highpass', f: 6000, q: 0.5 });
    getar([10, 30, 10]);
  }

  /* ===================== Musik latar pertempuran (orisinal, prosedural) ===================== */
  // 96 BPM, D minor: Dm – Bb – C – A. Lapisan: genderang taiko, tom, drone senar rendah, ostinato senar, brass tiap 2 bar,
  // simbal naik di akhir frasa. intensitas 0..1 (nyawa bos menipis / jurus mendekat) menambah lapisan & volume.
  // Dua mode musik: 'perang' (event asli: orkestra perang gelap) dan 'latihan' (beat latihan cerah & bersemangat).
  const BPM = 96, S16P = 60 / BPM / 4, S16L = 60 / 128 / 4;
  let S16 = S16P, BAR = S16 * 16;
  const AKOR = [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]]; // MIDI: Dm, Bb, C, A
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const OSTI = [0, 0, 12, 0, 3, 0, 12, 0, 0, 0, 12, 0, 7, 5, 3, 2]; // relatif ke akar
  const TAIKO = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0], TOM = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1];
  let musik = null; // {langkah, tNext, timer, drone[], intens}
  function taiko(t, kuat) { osc(t, 'sine', 75, 0.2, 0.55 * kuat, { a: 0.002, r: 0.35, f2: 42, ke: busMusik }); derau(t, 0.12, 0.18 * kuat, { f: 1200, f2: 200, ke: busMusik }); }
  function tom(t, f, kuat) { osc(t, 'sine', f, 0.1, 0.3 * kuat, { a: 0.002, r: 0.18, f2: f * 0.6, ke: busMusik }); }
  function senar(t, f, d, vol) {
    const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(900, t); fl.frequency.exponentialRampToValueAtTime(400, t + d); fl.Q.value = 2;
    osc(t, 'sawtooth', f, d, vol, { a: 0.008, r: 0.06, filter: fl, ke: busMusik });
  }
  function brass(t, akor, vol) {
    akor.forEach((m, i) => [-8, 8].forEach((dt) => {
      const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 1.5;
      fl.frequency.setValueAtTime(300, t); fl.frequency.exponentialRampToValueAtTime(1800, t + 0.12); fl.frequency.exponentialRampToValueAtTime(600, t + BAR * 0.45);
      osc(t, 'sawtooth', hz(m - 12 + (i === 0 ? 0 : 12)), BAR * 0.45, vol / 3, { a: 0.04, r: 0.3, filter: fl, detune: dt, ke: busMusik });
    }));
  }
  function aturDrone(akar, t) {
    if (!musik) return;
    musik.drone.forEach((o, i) => o.frequency.setTargetAtTime(hz(akar - 24 + (i === 2 ? 7 : 0)) * (i === 1 ? 1.004 : 1), t, 0.08));
  }
  // ---- latihan: 128 BPM, A mayor (A – E – F#m – D): kick 4/4, clap, hi-hat, bass, arpeggio petik, hook tiap 4 bar ----
  const AKOR_L = [[57, 61, 64], [52, 56, 59], [54, 57, 61], [50, 54, 57]];
  const HOOK = [12, null, 16, null, 19, null, 16, 14, 12, null, null, 9, 12, null, 14, null];
  function kick(t, kuat) { osc(t, 'sine', 150, 0.09, 0.6 * kuat, { a: 0.001, r: 0.12, f2: 45, ke: busMusik }); }
  function clap(t) { derau(t, 0.12, 0.16, { tipe: 'bandpass', f: 1500, q: 0.9, ke: busMusik }); derau(t + 0.012, 0.1, 0.1, { tipe: 'bandpass', f: 1800, q: 0.9, ke: busMusik }); }
  function pluck(t, f, vol) {
    const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 4; fl.frequency.setValueAtTime(3500, t); fl.frequency.exponentialRampToValueAtTime(500, t + 0.15);
    osc(t, 'square', f, 0.05, vol, { a: 0.002, r: 0.1, filter: fl, ke: busMusik });
  }
  function langkahLatihan(n, t, s, bar, I) {
    const akor = AKOR_L[bar % 4], semangat = I > 0.6;
    if (s % 4 === 0) kick(t, s === 0 ? 1 : 0.85);
    if (s === 4 || s === 12) clap(t);
    if (s % 4 === 2 || (semangat && s % 2 === 1)) derau(t, 0.03, 0.05, { tipe: 'highpass', f: 8000, ke: busMusik });
    if (s % 2 === 0) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 500; osc(t, 'sawtooth', hz(akor[0] - 24), S16 * 1.6, 0.09, { a: 0.004, r: 0.04, filter: fl, ke: busMusik }); }
    pluck(t, hz(akor[s % 3] + (s % 6 < 3 ? 0 : 12)), 0.03 + 0.015 * I);
    if (bar % 4 >= 2 && HOOK[s] != null) osc(t, 'triangle', hz(akor[0] + HOOK[s]), S16 * 1.8, 0.05 + 0.02 * I, { a: 0.005, r: 0.08, ke: busMusik });
    if (semangat && s === 0) derau(t, BAR, 0.05, { tipe: 'highpass', f: 1500, f2: 9000, a: BAR - 0.02, ke: busMusik }); // riser: 15 detik terakhir
  }
  function langkahPerang(n, t, s, bar, I) {
    const akor = AKOR[bar % 4];
    if (s === 0) aturDrone(akor[0], t);
    if (TAIKO[s]) taiko(t, s === 0 ? 1 : 0.75);
    if (TOM[s] && (I > 0.25 || bar % 2)) tom(t, s >= 12 ? 160 - (s - 12) * 15 : 140, 0.8);
    senar(t, hz(akor[0] - 12 + OSTI[s]), S16 * 0.9, 0.045 + 0.03 * I);
    if (I > 0.5) senar(t, hz(akor[0] + OSTI[s]), S16 * 0.8, 0.022 * I);
    if (s === 0 && bar % 2 === 0) brass(t, akor, 0.06 + 0.05 * I);
    if (I > 0.35 && s % 2 === 1) derau(t, 0.04, 0.03 * I, { tipe: 'highpass', f: 7000, ke: busMusik });
    if (s === 8 && bar % 4 === 3) derau(t, BAR / 2, 0.06, { tipe: 'highpass', f: 3000, f2: 9000, a: BAR / 2 - 0.02, ke: busMusik });
  }
  function jadwalMusik() {
    if (!musik || !ctx) return;
    const sampai = ctx.currentTime + 0.35;
    while (musik.tNext < sampai) {
      const n = musik.langkah, t = musik.tNext, s = n % 16, bar = Math.floor(n / 16), I = musik.intens;
      if (musik.mode === 'latihan') langkahLatihan(n, t, s, bar, I); else langkahPerang(n, t, s, bar, I);
      musik.langkah++; musik.tNext += S16;
    }
  }
  const VOL_MUSIK = 0.55;
  function musikMulai(mode = 'perang') {
    if (musik && musik.mode !== mode) musikBerhenti(0.3);
    if (musik || !siap()) return;
    const t = ctx.currentTime;
    S16 = mode === 'latihan' ? S16L : S16P; BAR = S16 * 16;
    const drone = mode === 'latihan' ? [] : [0, 1, 2].map((i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = hz(26 + (i === 2 ? 7 : 0)); fl.type = 'lowpass'; fl.frequency.value = 260; fl.Q.value = 1;
      g.gain.value = 0.07; o.connect(fl).connect(g).connect(busMusik); o.start(t); return o;
    });
    musik = { mode, langkah: 0, tNext: t + 0.1, drone, intens: 0.2 };
    busMusik.gain.cancelScheduledValues(t); busMusik.gain.setValueAtTime(busMusik.gain.value, t); busMusik.gain.linearRampToValueAtTime(VOL_MUSIK, t + 2.5);
    musik.timer = setInterval(jadwalMusik, 100);
    jadwalMusik();
  }
  function musikBerhenti(pelan = 1.2) {
    if (!musik || !ctx) return;
    const m = musik, t = ctx.currentTime; musik = null; clearInterval(m.timer);
    busMusik.gain.cancelScheduledValues(t); busMusik.gain.setValueAtTime(busMusik.gain.value, t); busMusik.gain.linearRampToValueAtTime(0, t + pelan);
    m.drone.forEach((o) => { try { o.stop(t + pelan + 0.1); } catch (e) {} });
  }
  // musik sedikit meredup saat benturan besar → efek jurus terdengar jelas
  function musikRedam(t, lama) {
    if (!musik) return;
    busMusik.gain.cancelScheduledValues(t); busMusik.gain.setValueAtTime(VOL_MUSIK, t); busMusik.gain.linearRampToValueAtTime(VOL_MUSIK * 0.45, t + 0.03); busMusik.gain.linearRampToValueAtTime(VOL_MUSIK, t + lama + 0.6);
  }
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else if (nyala) ctx.resume(); });

  window.YCSSuara = {
    get nyala() { return nyala; },
    set nyala(v) {
      nyala = !!v; try { localStorage.setItem('ycs_suara', nyala ? '1' : '0'); } catch (e) {}
      if (!nyala) { musikBerhenti(0.2); } else if (window.YCSSuara.ingin) musikMulai(window.YCSSuara.ingin);
    },
    get aktif() { return !!(ctx && ctx.state === 'running'); },
    pukul(combo = 1) { nada(260 + Math.min(combo, 12) * 22, 120, 90, 'square', 0.05); getar(8); },
    kritis() { nada(880, 220, 160, 'sawtooth', 0.05); getar([12, 30, 12]); },
    awas() { nada(520, 520, 120, 'triangle', 0.07); nada(520, 520, 120, 'triangle', 0.07, 0.18); getar([60, 60, 60]); },
    aman() { nada(660, 1320, 160, 'sine', 0.07); getar(15); },
    kena() { nada(180, 60, 280, 'sawtooth', 0.08); getar(220); },
    menang() { [523, 659, 784, 1047].forEach((f, i) => nada(f, f, 180, 'triangle', 0.07, i * 0.12)); getar([30, 40, 30, 40, 120]); },
    kalah() { [392, 330, 262].forEach((f, i) => nada(f, f * 0.9, 220, 'triangle', 0.06, i * 0.16)); getar(300); },
    klik() { nada(700, 500, 60, 'sine', 0.04); },
    // pertempuran
    ingin: false, // mode musik yang diinginkan ('perang' / 'latihan'); musik mulai setelah sentuhan pertama (aturan autoplay browser)
    musikMulai(mode = 'perang') { this.ingin = mode; musikMulai(mode); },
    musikBerhenti(pelan) { this.ingin = false; musikBerhenti(pelan); },
    intensitas(v) { if (musik) musik.intens = Math.max(0, Math.min(1, v)); },
    kumpulApi, ayun, benturan, ledakan, siulMeteor, tap, tapKena, milestone, potion,
  };
  // Browser hanya mengizinkan suara setelah interaksi: sentuhan pertama di halaman menyalakan musik bila pertempuran berlangsung.
  const buka = () => { if (window.YCSSuara.ingin && nyala) musikMulai(window.YCSSuara.ingin); else if (nyala) siap(); };
  ['pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, buka, { passive: true }));
})();
