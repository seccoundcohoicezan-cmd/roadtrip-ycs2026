/* Bottom sheet: tarik garis/kepala lembar ke bawah untuk menutup (selain tombol ✕), seperti lembar aplikasi HP. */
(() => {
  'use strict';
  function pasangTarikSheet(dlg) {
    if (dlg.dataset.tarik) return; dlg.dataset.tarik = '1';
    let y0 = 0, dy = 0, t0 = 0, aktif = false;
    const mulai = (e) => {
      if (matchMedia('(min-width: 48rem)').matches) return;
      if (!e.target.closest('.sheet__grab, .sheet__head') || e.target.closest('button, a, input, select, textarea')) return;
      aktif = true; y0 = e.clientY; dy = 0; t0 = e.timeStamp; dlg.classList.add('is-tarik'); dlg.classList.remove('is-lepas');
      try { dlg.setPointerCapture(e.pointerId); } catch (x) {}
    };
    const gerak = (e) => { if (!aktif) return; dy = Math.max(0, e.clientY - y0); dlg.style.transform = `translateY(${dy}px)`; if (dy > 4) e.preventDefault(); };
    const lepas = (e) => {
      if (!aktif) return; aktif = false; dlg.classList.remove('is-tarik'); dlg.classList.add('is-lepas');
      const cepat = dy / Math.max(1, e.timeStamp - t0) > 0.6;
      if (dy > Math.min(140, dlg.offsetHeight * 0.25) || (cepat && dy > 30)) {
        dlg.style.transform = `translateY(${dlg.offsetHeight}px)`;
        setTimeout(() => { dlg.close(); dlg.style.transform = ''; dlg.classList.remove('is-lepas'); }, 200);
      } else { dlg.style.transform = ''; setTimeout(() => dlg.classList.remove('is-lepas'), 230); }
    };
    // Dengan pointer capture, "click" setelah menarik jatuh ke <dialog> itu sendiri (dianggap klik backdrop → tertutup).
    // Klik yang berasal dari gerakan tarik diabaikan; penutupan hanya lewat logika lepas() di atas.
    let abaikanKlik = 0;
    dlg.addEventListener('click', (e) => { if (Date.now() - abaikanKlik < 400) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
    dlg.addEventListener('pointerup', () => { if (aktif) abaikanKlik = Date.now(); }, true);
    dlg.addEventListener('pointerdown', mulai);
    dlg.addEventListener('pointermove', gerak);
    dlg.addEventListener('pointerup', lepas);
    dlg.addEventListener('pointercancel', lepas);
  }
  document.querySelectorAll('dialog.sheet').forEach(pasangTarikSheet);
  window.YCSTarikSheet = pasangTarikSheet;
})();
