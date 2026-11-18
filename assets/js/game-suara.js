/* Suara & getar game YCS — tanpa file audio: nada pendek dari WebAudio. Bisa dimatikan (disimpan di perangkat). */
(() => {
  'use strict';
  let ctx = null, nyala = true;
  try { nyala = localStorage.getItem('ycs_suara') !== '0'; } catch (e) {}
  const siap = () => {
    if (!nyala) return null;
    if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ctx = new A(); }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  function nada(f1, f2, ms, jenis = 'square', vol = 0.06, tunda = 0) {
    const c = siap(); if (!c) return;
    const t = c.currentTime + tunda, o = c.createOscillator(), g = c.createGain();
    o.type = jenis; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + ms / 1000);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + ms / 1000 + 0.02);
  }
  const getar = (pola) => { try { if (nyala && navigator.vibrate) navigator.vibrate(pola); } catch (e) {} };
  window.YCSSuara = {
    get nyala() { return nyala; },
    set nyala(v) { nyala = !!v; try { localStorage.setItem('ycs_suara', nyala ? '1' : '0'); } catch (e) {} },
    pukul(combo = 1) { nada(260 + Math.min(combo, 12) * 22, 120, 90, 'square', 0.05); getar(8); },
    kritis() { nada(880, 220, 160, 'sawtooth', 0.05); getar([12, 30, 12]); },
    awas() { nada(520, 520, 120, 'triangle', 0.07); nada(520, 520, 120, 'triangle', 0.07, 0.18); getar([60, 60, 60]); },
    aman() { nada(660, 1320, 160, 'sine', 0.07); getar(15); },
    kena() { nada(180, 60, 280, 'sawtooth', 0.08); getar(220); },
    menang() { [523, 659, 784, 1047].forEach((f, i) => nada(f, f, 180, 'triangle', 0.07, i * 0.12)); getar([30, 40, 30, 40, 120]); },
    kalah() { [392, 330, 262].forEach((f, i) => nada(f, f * 0.9, 220, 'triangle', 0.06, i * 0.16)); getar(300); },
    klik() { nada(700, 500, 60, 'sine', 0.04); },
  };
})();
