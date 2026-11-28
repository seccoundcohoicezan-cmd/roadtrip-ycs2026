/* Pengingat YCS 2026 (beranda & /game/): satu lembar pilihan saat tombol "Ingatkan" diketuk.
   1) Google Kalender: langsung membuka form acara Google Kalender yang sudah terisi (tanpa unduh .ics).
   2) Notifikasi Chrome: minta izin notifikasi; pop-up muncul N menit sebelum acara selama web YCS
      masih terbuka di salah satu tab (boleh di latar belakang). Tanpa server push: bila semua tab ditutup,
      notifikasi tidak muncul → itulah gunanya pilihan Google Kalender.
   3) File .ics (iPhone/Outlook) sebagai cadangan.
   Pakai: YCSPengingat.buka({kunci, judul, mulai: ms, selesai: ms, sebelum: menit, detail, url, saatPilih}) */
(() => {
  'use strict';
  const KUNCI = 'ycs_pengingat';
  const baca = () => { try { return JSON.parse(localStorage.getItem(KUNCI) || '[]') || []; } catch (e) { return []; } };
  const simpan = (v) => { try { localStorage.setItem(KUNCI, JSON.stringify(v)); } catch (e) {} };
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const utc = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const jamWib = (ms) => new Date(ms).toLocaleString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB';
  const lamaTeks = (m) => (m >= 1440 && m % 1440 === 0 ? `${m / 1440} hari` : m >= 60 && m % 60 === 0 ? `${m / 60} jam` : `${m} menit`);
  const bisaNotif = () => 'Notification' in window && window.isSecureContext;

  function linkGoogle(a) {
    const q = new URLSearchParams({ action: 'TEMPLATE', text: a.judul, dates: utc(a.mulai) + '/' + utc(a.selesai || a.mulai + 3600e3), details: [a.detail, a.url].filter(Boolean).join('\n\n'), ctz: 'Asia/Jakarta' });
    if (a.lokasi) q.set('location', a.lokasi);
    return 'https://calendar.google.com/calendar/render?' + q.toString();
  }
  function unduhIcs(a) {
    const e = (t) => String(t || '').replace(/[\\;,]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Universitas STEKOM//YCS 2026//ID', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
      `UID:${utc(a.mulai)}-${String(a.kunci || a.judul).length}@ycs2026.stekom.ac.id`, `DTSTAMP:${utc(Date.now())}`, `DTSTART:${utc(a.mulai)}`, `DTEND:${utc(a.selesai || a.mulai + 3600e3)}`,
      `SUMMARY:${e(a.judul)}`, `DESCRIPTION:${e([a.detail, a.url].filter(Boolean).join(' '))}`, a.url ? `URL:${a.url}` : '',
      'BEGIN:VALARM', `TRIGGER:-PT${a.sebelum || 10}M`, 'ACTION:DISPLAY', `DESCRIPTION:${e(a.judul)}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const el = Object.assign(document.createElement('a'), { href: url, download: 'ycs2026-pengingat.ics' });
    document.body.append(el); el.click(); el.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------- Notifikasi Chrome (terjadwal di halaman) ---------- */
  async function daftarSw() {
    if (!('serviceWorker' in navigator)) return null;
    try { return (await navigator.serviceWorker.getRegistration('/')) || (await navigator.serviceWorker.register('/sw.js', { scope: '/' })); } catch (e) { return null; }
  }
  async function tampilNotif(r) {
    const opsi = { body: r.isi, icon: '/assets/img/monster/raja-kepala.webp', badge: '/assets/img/monster/raja-kepala.webp', tag: 'ycs-' + r.kunci, requireInteraction: true, data: { url: r.url } };
    try {
      const reg = await daftarSw();
      if (reg) { if (!reg.active) await navigator.serviceWorker.ready; await reg.showNotification(r.judul, opsi); return; }
    } catch (e) { /* jatuh ke Notification biasa */ }
    try { const n = new Notification(r.judul, opsi); n.onclick = () => { window.focus(); if (r.url && location.href !== r.url) location.href = r.url; n.close(); }; } catch (e) {}
  }
  let jalan = 0;
  function periksa() {
    if (!bisaNotif() || Notification.permission !== 'granted') return;
    const t = Date.now(), list = baca();
    let ubah = false;
    list.forEach((r) => {
      if (!r.terkirim && t >= r.picu && t < r.mulai + 30 * 60000) { r.terkirim = t; ubah = true; tampilNotif(r); }
    });
    const sisa = list.filter((r) => t < r.mulai + 30 * 60000);
    if (ubah || sisa.length !== list.length) simpan(sisa);
    // jadwalkan pemeriksaan berikutnya tepat di waktu picu terdekat (maks. 30 dtk agar tetap akurat setelah HP tidur)
    clearTimeout(jalan);
    const berikut = sisa.filter((r) => !r.terkirim).map((r) => r.picu - t).filter((d) => d > 0).sort((a, b) => a - b)[0];
    if (berikut != null) jalan = setTimeout(periksa, Math.min(berikut + 200, 30000));
  }
  function jadwalkan(a) {
    const r = { kunci: a.kunci || a.judul, judul: a.notifJudul || a.judul, isi: a.notifIsi || `Mulai ${jamWib(a.mulai)}. Ketuk untuk membuka web YCS.`, url: a.url || location.href, mulai: a.mulai, picu: a.mulai - (a.sebelum || 10) * 60000 };
    const list = baca().filter((x) => x.kunci !== r.kunci);
    list.push(r); simpan(list); periksa();
  }
  const terjadwal = (kunci) => baca().some((x) => x.kunci === kunci && !x.terkirim);

  /* ---------- Lembar pilihan ---------- */
  const CSS = `
.pgi{width:min(94vw,24rem);margin:auto auto 0;padding:20px 18px calc(18px + env(safe-area-inset-bottom));border:0;border-radius:24px 24px 0 0;background:var(--surface,#fff);color:var(--text,#1b2440);box-shadow:0 -10px 40px rgba(6,24,64,.25)}
@media (min-width:40rem){.pgi{margin:auto;border-radius:24px}}
.pgi::backdrop{background:var(--scrim,rgba(6,24,64,.55))}
.pgi[open]{display:grid;gap:10px;animation:pgi-naik .28s cubic-bezier(.2,.8,.2,1)}
@keyframes pgi-naik{from{transform:translateY(24px);opacity:0}}
.pgi h2{margin:0;font:800 1.2rem/1.25 var(--font-sans,sans-serif);color:var(--heading,#061840)}
.pgi p{margin:0;font-size:.875rem;color:var(--text-2,#4a5578)}
.pgi__opsi{display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;border:0;border-radius:16px;background:var(--surface-soft,#f1f5ff);color:inherit;font:inherit;text-align:left;text-decoration:none;cursor:pointer}
.pgi__opsi:focus-visible{outline:none;box-shadow:var(--ring,0 0 0 3px #7aa2ff)}
.pgi__opsi>span:last-child{display:grid;flex:1;min-width:0}
.pgi__opsi strong{font-weight:800;color:var(--heading,#061840)}
.pgi__opsi small{font-size:.75rem;color:var(--text-2,#4a5578)}
.pgi__ikon{display:grid;place-items:center;flex:none;width:2.5rem;height:2.5rem;border-radius:12px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.12)}
.pgi__ikon svg{width:1.5rem;height:1.5rem}
.pgi__opsi.is-utama{background:color-mix(in srgb,#1a73e8 16%,var(--surface-soft,#f1f5ff));box-shadow:inset 0 0 0 1.5px #1a73e8}
.pgi__opsi.is-aktif{box-shadow:inset 0 0 0 1.5px #1e9e5a}
.pgi__ics{justify-self:center;padding:6px 10px;border:0;background:none;color:var(--text-2,#4a5578);font:600 .8125rem var(--font-sans,sans-serif);text-decoration:underline;cursor:pointer}
.pgi__tutup{position:absolute;top:12px;right:12px;width:2.25rem;height:2.25rem;border:0;border-radius:50%;background:var(--surface-soft,#f1f5ff);color:var(--text,#1b2440);font-size:1.25rem;line-height:1;cursor:pointer}`;
  const IKON_GCAL = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="3" fill="#fff" stroke="#1a73e8" stroke-width="1.6"/><path d="M3 9h18" stroke="#1a73e8" stroke-width="1.6"/><rect x="3" y="4" width="18" height="5" rx="3" fill="#1a73e8"/><path d="M8 2.5v3M16 2.5v3" stroke="#1a73e8" stroke-width="1.6" stroke-linecap="round"/><text x="12" y="18.2" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="7.5" fill="#1a73e8">31</text></svg>';
  const IKON_LONCENG = '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="#e8710a" stroke-width="2" stroke-linecap="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15Z" fill="#fde7d2"/><path d="M10 20.5a2 2 0 0 0 4 0"/></g></svg>';
  let dlg = null, aktif = null, notif = null;
  function siapkan() {
    if (dlg) return;
    const st = document.createElement('style'); st.textContent = CSS; document.head.append(st);
    dlg = document.createElement('dialog'); dlg.className = 'pgi'; dlg.setAttribute('aria-labelledby', 'pgi-judul');
    document.body.append(dlg);
    dlg.addEventListener('click', async (e) => {
      if (e.target === dlg || e.target.closest('[data-pgi=tutup]')) { dlg.close(); return; }
      const b = e.target.closest('[data-pgi]'); if (!b || !aktif) return;
      const jenis = b.dataset.pgi;
      if (jenis === 'gcal') { aktif.saatPilih && aktif.saatPilih('gcal'); notif && notif('Google Kalender terbuka di tab baru. Tekan Simpan di sana.'); setTimeout(() => dlg.close(), 300); return; } // link biasa (target _blank) → tidak diblokir pop-up blocker
      if (jenis === 'ics') { unduhIcs(aktif); aktif.saatPilih && aktif.saatPilih('ics'); notif && notif('File pengingat (.ics) diunduh. Buka untuk menambahkannya ke kalender.'); dlg.close(); return; }
      if (jenis === 'notif') {
        if (!bisaNotif()) { notif && notif('Browser ini belum mendukung notifikasi. Pakai Google Kalender saja ya.'); return; }
        let izin = Notification.permission;
        if (izin === 'default') { try { izin = await Notification.requestPermission(); } catch (x) { izin = 'denied'; } }
        if (izin !== 'granted') { notif && notif('Notifikasi diblokir. Izinkan lewat ikon gembok di samping alamat web, atau pakai Google Kalender.'); return; }
        await daftarSw();
        jadwalkan(aktif);
        aktif.saatPilih && aktif.saatPilih('notif');
        const sb = aktif.sebelum || 10;
        tampilNotif({ kunci: 'uji', judul: 'Pengingat berhasil dipasang ✅', isi: `${aktif.judul} mulai ${jamWib(aktif.mulai)}. Kamu akan dapat notifikasi ${lamaTeks(sb)} sebelumnya (${jamWib(aktif.mulai - sb * 60000)}).`, url: aktif.url });
        notif && notif(`Siap! Notifikasi muncul ${jamWib(aktif.mulai - sb * 60000)}, ${lamaTeks(sb)} sebelum mulai. Jangan tutup tab web YCS ya.`);
        dlg.close();
      }
    });
  }
  function buka(a) {
    siapkan(); aktif = a;
    const sudah = terjadwal(a.kunci || a.judul) && bisaNotif() && Notification.permission === 'granted';
    const blokir = bisaNotif() && Notification.permission === 'denied';
    dlg.innerHTML = `<button class="pgi__tutup" type="button" data-pgi="tutup" aria-label="Tutup">×</button>
      <h2 id="pgi-judul">Ingatkan aku</h2><p>${esc(a.judul)} · ${jamWib(a.mulai)}</p>
      <a class="pgi__opsi is-utama" data-pgi="gcal" href="${esc(linkGoogle(a))}" target="_blank" rel="noopener"><span class="pgi__ikon">${IKON_GCAL}</span><span><strong>Tambah ke Google Kalender</strong><small>Masuk ke kalender HP-mu, tinggal tekan Simpan. Tetap mengingatkan walau web ditutup.</small></span></a>
      <button class="pgi__opsi${sudah ? ' is-aktif' : ''}" type="button" data-pgi="notif"><span class="pgi__ikon">${IKON_LONCENG}</span><span><strong>${sudah ? 'Notifikasi Chrome sudah aktif ✓' : 'Notifikasi Chrome'}</strong><small>${blokir ? 'Notifikasi sedang diblokir. Izinkan dulu lewat ikon gembok di samping alamat web.' : `Muncul pemberitahuan di HP ${lamaTeks(a.sebelum || 10)} sebelum mulai. Syarat: tab web YCS jangan ditutup.`}</small></span></button>
      <button class="pgi__ics" type="button" data-pgi="ics">Pakai iPhone/Outlook? Unduh file kalender (.ics)</button>`;
    if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', '');
  }

  window.YCSPengingat = { buka, linkGoogle, unduhIcs, jadwalkan, periksa, atur: (o) => { if (o && o.toast) notif = o.toast; } };
  periksa();
  document.addEventListener('visibilitychange', periksa);
  setInterval(periksa, 30000);
})();
