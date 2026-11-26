/* Utilitas bersama halaman turunan YCS 2026. Mengekspos window.YCS. */
(() => {
  'use strict';
  const doc = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- Tema ---------- */
  const themeBtn = $('.theme-toggle');
  const isDark = () => (doc.dataset.theme ? doc.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
  if (themeBtn) {
    themeBtn.hidden = false;
    const sync = () => themeBtn.setAttribute('aria-pressed', String(isDark()));
    sync();
    themeBtn.addEventListener('click', () => {
      doc.dataset.theme = isDark() ? 'light' : 'dark';
      try { localStorage.setItem('ycs-theme', doc.dataset.theme); } catch (e) {}
      sync();
    });
  }

  /* ---------- Toast ---------- */
  let toastEl = $('#toast'), toastTimer;
  function toast(msg) {
    if (!toastEl) { toastEl = Object.assign(document.createElement('div'), {className: 'toast', id: 'toast'}); toastEl.setAttribute('role', 'status'); document.body.append(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 3400);
  }

  /* ---------- Jaringan ---------- */
  async function post(path, body, timeout = 25000) {
    try {
      const r = await fetch(path, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body), signal: AbortSignal.timeout(timeout)});
      const data = await r.json().catch(() => ({ok: false, error: 'connection'}));
      return data && typeof data === 'object' ? data : {ok: false, error: 'connection'};
    } catch (e) { return {ok: false, error: 'connection'}; }
  }
  let configPromise;
  function config() {
    configPromise = configPromise || fetch('/api/config', {headers: {Accept: 'application/json'}, cache: 'no-cache'}).then((r) => r.json()).then((d) => (d.ok ? d : Promise.reject(d)));
    return configPromise;
  }
  // Selisih jam perangkat terhadap jam server (ms). Jam server dipakai untuk semua gerbang waktu.
  let offsetPromise;
  function offset() {
    offsetPromise = offsetPromise || (async () => {
      try {
        const t0 = Date.now();
        const r = await fetch('/api/now', {cache: 'no-store'});
        const {now} = await r.json();
        const t1 = Date.now();
        return typeof now === 'number' ? now - (t0 + t1) / 2 : 0;
      } catch (e) { return 0; }
    })();
    return offsetPromise;
  }

  /* ---------- Identitas ringan ---------- */
  function uuid() {
    return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
  }
  function perangkat() {
    try {
      let id = localStorage.getItem('ycs_perangkat');
      if (!id) { id = uuid(); localStorage.setItem('ycs_perangkat', id); }
      return id;
    } catch (e) { return ''; }
  }
  // Sumber kunjungan (?ref=) disimpan 30 hari sebagai sentuhan pertama, untuk mengukur efektivitas blasting.
  function ref() {
    const fromUrl = (new URLSearchParams(location.search).get('ref') || '').toLowerCase().replace(/[^\w-]/g, '').slice(0, 40);
    try {
      const saved = JSON.parse(localStorage.getItem('ycs_ref') || 'null');
      const dutaBaru = fromUrl.startsWith('duta-') && !(saved && String(saved.v).startsWith('duta-') && Date.now() - saved.t < 30 * 864e5);
      if (saved && Date.now() - saved.t < 30 * 864e5 && !dutaBaru) return saved.v;
      if (fromUrl) { localStorage.setItem('ycs_ref', JSON.stringify({v: fromUrl, t: Date.now()})); return fromUrl; }
    } catch (e) { return fromUrl; }
    return '';
  }
  ref();

  /* ---------- Format ---------- */
  const fmtTanggal = new Intl.DateTimeFormat('id-ID', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta'});
  const fmtJam = new Intl.DateTimeFormat('id-ID', {hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta'});
  const waktu = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : `${fmtTanggal.format(d)}, ${fmtJam.format(d).replace(':', '.')} WIB`; };
  const nf = new Intl.NumberFormat('id-ID');

  /* ---------- Wilayah ---------- */
  let wilayahPromise;
  function wilayah() {
    wilayahPromise = wilayahPromise || fetch('/assets/data/wilayah.json').then((r) => r.json());
    return wilayahPromise;
  }
  async function isiWilayah(selProv, selKota) {
    const data = await wilayah().catch(() => null);
    if (!data) return;
    Object.keys(data).forEach((p) => selProv.append(new Option(p, p)));
    const isiKota = () => {
      selKota.length = 1;
      (data[selProv.value] || []).forEach((k) => selKota.append(new Option(k, k)));
      selKota.disabled = !selProv.value;
    };
    selProv.addEventListener('change', isiKota);
    isiKota();
  }

  /* ---------- Bagikan ---------- */
  function pasangBagikan(root, {url, text}) {
    const full = url || location.origin + location.pathname;
    $$('[data-share]', root).forEach((b) => {
      const kind = b.dataset.share;
      if (kind === 'native' && !navigator.share) { b.hidden = true; return; }
      b.addEventListener('click', async () => {
        if (kind === 'copy') {
          try { await navigator.clipboard.writeText(full); toast('Link disalin. Tempel di mana pun kamu mau!'); }
          catch (e) { prompt('Salin link ini:', full); }
        } else if (kind === 'wa') {
          window.open('https://wa.me/?text=' + encodeURIComponent(text + ' ' + full), '_blank', 'noopener');
        } else if (kind === 'native') {
          try { await navigator.share({title: document.title, text, url: full}); } catch (e) { /* dibatalkan */ }
        }
      });
    });
  }

  /* ---------- Hitung mundur sederhana ---------- */
  async function hitungMundur(el, targetMs, onDone) {
    const off = await offset();
    const pad = (n) => String(n).padStart(2, '0');
    const tick = () => {
      const diff = targetMs - (Date.now() + off);
      if (diff <= 0) { clearInterval(t); el.textContent = '00:00:00'; onDone && onDone(); return; }
      const s = Math.floor(diff / 1000);
      const d = Math.floor(s / 86400);
      el.textContent = (d ? d + ' hari ' : '') + `${pad(Math.floor(s % 86400 / 3600))}:${pad(Math.floor(s % 3600 / 60))}:${pad(s % 60)}`;
    };
    const t = setInterval(tick, 1000);
    tick();
  }

  function sibuk(btn, on) {
    btn.setAttribute('aria-busy', String(on));
    btn.disabled = on;
  }

  /* ---------- Pertempuran berlangsung: pita "Join Pertempuran" di halaman turunan (bukan admin) ---------- */
  if (!/^\/admin\//.test(location.pathname)) {
    const css = document.createElement('style');
    css.textContent = '.perang-pita{position:fixed;z-index:60;left:50%;bottom:calc(16px + env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;align-items:center;gap:.5rem;max-width:calc(100% - 1.5rem);padding:6px 6px 6px 14px;border-radius:999px;background:linear-gradient(90deg,#7A0F1E,#B3122E);color:#fff;font-size:.875rem;text-decoration:none;white-space:nowrap;box-shadow:0 10px 28px -10px rgba(179,18,46,.7);animation:perang-pita 1.6s ease-in-out infinite}'
      + '.perang-pita[hidden]{display:none}.perang-pita strong{color:#FFE066}.perang-pita small{opacity:.85}'
      + '.perang-pita b{padding:6px 12px;border-radius:999px;background:#FFC93C;color:#0A1A3F;font-weight:800}'
      + '@keyframes perang-pita{50%{box-shadow:0 10px 34px -6px rgba(255,80,60,.85)}}@media (prefers-reduced-motion:reduce){.perang-pita{animation:none}}';
    document.head.append(css);
    const pita = Object.assign(document.createElement('a'), {className: 'perang-pita', href: '/game/', hidden: true});
    pita.setAttribute('aria-label', 'Pertempuran berlangsung melawan Raja Batu. Join pertempuran');
    document.body.append(pita);
    const cek = async () => {
      try {
        const st = await (await fetch('/api/monster')).json();
        const n = (st.pemain || 0) + (st.ramai || 0);
        pita.hidden = st.fase !== 'tanding';
        if (!pita.hidden) pita.innerHTML = '⚔️ <strong>Pertempuran Berlangsung</strong>' + (n ? ` <small>${nf.format(n)} pejuang</small>` : '') + ' <b>Join Pertempuran</b>';
      } catch (e) { /* abaikan */ }
    };
    cek();
    setInterval(() => { if (!document.hidden) cek(); }, 20000);
  }

  window.YCS = {$, $$, toast, post, config, offset, uuid, perangkat, ref, waktu, nf, wilayah, isiWilayah, pasangBagikan, hitungMundur, sibuk};
})();
