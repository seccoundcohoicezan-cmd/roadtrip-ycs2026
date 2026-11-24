/* Bottom sheet: tarik lembar ke bawah untuk menutup (selain tombol ✕), seperti lembar aplikasi HP.
   - Garis/kepala lembar: langsung ikut tertarik (pointer events).
   - Badan lembar: ikut tertarik bila isi sudah di posisi paling atas dan jari bergerak ke bawah;
     selain itu tetap menggulir biasa (touch events, karena gulir native harus bisa diambil alih). */
(() => {
  'use strict';
  const HP = () => !matchMedia('(min-width: 48rem)').matches;
  const KOLOM = 'input, select, textarea, [contenteditable="true"]';

  function pasangTarikSheet(dlg) {
    if (dlg.dataset.tarik) return; dlg.dataset.tarik = '1';
    let y0 = 0, dy = 0, t0 = 0, aktif = false;
    // Dengan pointer capture, "click" setelah menarik jatuh ke <dialog> itu sendiri (dianggap klik backdrop → tertutup).
    // Klik yang berasal dari gerakan tarik diabaikan; penutupan hanya lewat selesai() di bawah.
    let abaikanKlik = 0;

    const mulaiTarik = (y, t) => {
      aktif = true; y0 = y; dy = 0; t0 = t; dlg.classList.add('is-tarik'); dlg.classList.remove('is-lepas');
    };
    const geser = (y) => { dy = Math.max(0, y - y0); dlg.style.transform = `translateY(${dy}px)`; };
    const selesai = (t) => {
      if (!aktif) return; aktif = false; abaikanKlik = Date.now();
      dlg.classList.remove('is-tarik'); dlg.classList.add('is-lepas');
      const cepat = dy / Math.max(1, t - t0) > 0.6;
      if (dy > Math.min(140, dlg.offsetHeight * 0.25) || (cepat && dy > 30)) {
        dlg.style.transform = `translateY(${dlg.offsetHeight}px)`;
        setTimeout(() => { dlg.close(); dlg.style.transform = ''; dlg.classList.remove('is-lepas'); }, 200);
      } else { dlg.style.transform = ''; setTimeout(() => dlg.classList.remove('is-lepas'), 230); }
    };

    /* --- Garis & kepala lembar (mouse, pena, sentuh) --- */
    const diKepala = (el) => el.closest('.sheet__grab, .sheet__head') && !el.closest('button, a, ' + KOLOM);
    dlg.addEventListener('pointerdown', (e) => {
      if (!HP() || !diKepala(e.target)) return;
      mulaiTarik(e.clientY, e.timeStamp);
      try { dlg.setPointerCapture(e.pointerId); } catch (x) {}
    });
    dlg.addEventListener('pointermove', (e) => { if (!aktif || e.pointerType === 'touch' && sentuhBadan) return; geser(e.clientY); if (dy > 4) e.preventDefault(); });
    const lepasPointer = (e) => { if (aktif && !sentuhBadan) selesai(e.timeStamp); };
    dlg.addEventListener('pointerup', lepasPointer);
    dlg.addEventListener('pointercancel', lepasPointer);

    /* --- Badan lembar (sentuh) --- */
    let sentuhBadan = false, sx = 0, sy = 0, bolehTarik = false;
    dlg.addEventListener('touchstart', (e) => {
      sentuhBadan = false;
      if (!HP() || e.touches.length !== 1 || aktif || diKepala(e.target) || e.target.closest(KOLOM)) return;
      const s = e.touches[0]; sx = s.clientX; sy = s.clientY; bolehTarik = true;
    }, { passive: true });
    dlg.addEventListener('touchmove', (e) => {
      if (!bolehTarik || e.touches.length !== 1) return;
      const s = e.touches[0];
      if (!sentuhBadan) {
        const dx = s.clientX - sx, dyBaru = s.clientY - sy;
        // Isi masih bisa digulir ke atas → biarkan menggulir; patokan ikut pindah supaya tarikan
        // bisa langsung menyambung begitu gulir mentok di atas.
        if (dlg.scrollTop > 0) { sx = s.clientX; sy = s.clientY; return; }
        if (Math.abs(dyBaru) < 8 && Math.abs(dx) < 8) return;
        if (dyBaru <= 0 || Math.abs(dx) > Math.abs(dyBaru)) { bolehTarik = false; return; } // gulir ke bawah / geser samping
        sentuhBadan = true; mulaiTarik(s.clientY, e.timeStamp);
      }
      if (e.cancelable) e.preventDefault();
      geser(s.clientY);
    }, { passive: false });
    const lepasSentuh = (e) => {
      bolehTarik = false;
      if (sentuhBadan) { sentuhBadan = false; selesai(e.timeStamp); if (e.cancelable) e.preventDefault(); }
    };
    dlg.addEventListener('touchend', lepasSentuh);
    dlg.addEventListener('touchcancel', lepasSentuh);

    dlg.addEventListener('click', (e) => { if (Date.now() - abaikanKlik < 400) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  }
  document.querySelectorAll('dialog.sheet').forEach(pasangTarikSheet);
  window.YCSTarikSheet = pasangTarikSheet;
})();
