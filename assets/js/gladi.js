/* Mode Gladi YCS 2026 — uji seluruh web "seperti saat acara" tanpa menyentuh data asli.
   Aktif bila URL membawa ?gladi=KODE (kode dari admin → Lawan Monster → Mode uji/gladi).
   Cara kerja (kode halaman TIDAK diubah, jadi yang diuji adalah alur asli):
   - fetch() dibungkus: GET /api/config diberi skenario (live sedang tayang, Dana Kaget buka, fase, acara, pop-up);
     semua POST formulir (kata, dana, klaim, survei, twibbon) dijawab tiruan → tidak ada yang tersimpan di server/Sheet.
   - Lawan Monster memakai event uji asli di server (kode sama), tiket uji hanya di memori server.
   - localStorage "ycs_*" dipisah ke sessionStorage "gladi:*" agar status pengunjung asli tidak tercampur.
   Dimuat paling awal di <head> setiap halaman publik. */
(() => {
  'use strict';
  const qs = new URLSearchParams(location.search);
  let kode = (qs.get('gladi') || '').replace(/[^\w-]/g, '').slice(0, 20);
  try { if (!kode) kode = sessionStorage.getItem('gladi:kode') || ''; } catch (e) {}
  if (!kode) return;
  try { sessionStorage.setItem('gladi:kode', kode); } catch (e) {}
  window.YCS_GLADI = kode;

  // Halaman game memakai event uji monster yang sama.
  if (/^\/game\/?$/.test(location.pathname) && !qs.get('uji-monster')) { qs.set('uji-monster', kode); history.replaceState(null, '', location.pathname + '?' + qs.toString() + location.hash); }
  // Tautan internal ikut membawa ?gladi agar sesi tetap gladi.
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('data-gladi-keluar')) return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || u.searchParams.get('gladi') || u.pathname.startsWith('/admin')) return;
    if (u.pathname === location.pathname && u.hash && !u.search) return; // lompat ke bagian di halaman sama
    u.searchParams.set('gladi', kode); a.href = u.toString();
  }, true);

  /* ---------- penyimpanan terpisah ---------- */
  const asli = { get: Storage.prototype.getItem, set: Storage.prototype.setItem, del: Storage.prototype.removeItem };
  const pisah = (st, k) => st === window.localStorage && /^ycs[_-]/.test(String(k)) && String(k) !== 'ycs-theme' && String(k) !== 'ycs_suara';
  Storage.prototype.getItem = function (k) { return pisah(this, k) ? asli.get.call(sessionStorage, 'gladi:' + k) : asli.get.call(this, k); };
  Storage.prototype.setItem = function (k, v) { return pisah(this, k) ? asli.set.call(sessionStorage, 'gladi:' + k, v) : asli.set.call(this, k, v); };
  Storage.prototype.removeItem = function (k) { return pisah(this, k) ? asli.del.call(sessionStorage, 'gladi:' + k) : asli.del.call(this, k); };

  /* ---------- skenario ---------- */
  const SKEN_AWAL = { fase: 'asli', live: 'tayang', dana: 'buka', acara: 'asli', popup: 'mati' };
  const baca = () => { try { return { ...SKEN_AWAL, ...JSON.parse(asli.get.call(sessionStorage, 'gladi:skenario') || '{}') }; } catch (e) { return { ...SKEN_AWAL }; } };
  const skenario = baca();
  const now = () => Date.now();
  const iso = (t) => new Date(t).toISOString();
  function ubahConfig(c) {
    if (!c || !c.ok) return c;
    const t = now();
    if (skenario.fase === 'pra') { c.fase = 'pra'; c.pengumuman = iso(t + 2 * 3600e3); }
    if (skenario.fase === 'pasca') { c.fase = 'pasca'; if (!c.pengumuman || Date.parse(c.pengumuman) > t) c.pengumuman = iso(t - 3600e3); }
    const live = (c.live || []).slice();
    if (skenario.live === 'tayang') live.push({ judul: '[GLADI] Live uji coba', platform: 'YouTube', mulai: iso(t - 5 * 60e3), selesai: iso(t + 55 * 60e3), link: c.linkLive || 'https://www.youtube.com/@universitasstekom/streams', cadangan: '' });
    if (skenario.live === 'segera') live.push({ judul: '[GLADI] Live mulai 10 menit lagi', platform: 'YouTube', mulai: iso(t + 10 * 60e3), selesai: iso(t + 70 * 60e3), link: c.linkLive || 'https://www.youtube.com/@universitasstekom/streams', cadangan: '' });
    c.live = live.sort((a, b) => Date.parse(a.mulai) - Date.parse(b.mulai));
    const dana = c.dana || {};
    if (skenario.dana === 'buka') c.dana = { ...dana, saklar: true, penuh: false, kuota: 100, sisa: Number(asli.get.call(sessionStorage, 'gladi:dana_sisa') || 37) };
    if (skenario.dana === 'belum') c.dana = { ...dana, saklar: false, penuh: false };
    if (skenario.dana === 'habis') c.dana = { ...dana, saklar: true, penuh: true, sisa: 0, kuota: 100 };
    if (skenario.acara === 'berlangsung') c.acara = { ...(c.acara || {}), mulai: iso(t - 86400e3), selesai: iso(t + 2 * 86400e3) };
    if (skenario.acara === 'selesai') c.acara = { ...(c.acara || {}), mulai: iso(t - 10 * 86400e3), selesai: iso(t - 3600e3) };
    if (skenario.popup === 'contoh') c.popup = { aktif: true, judul: '[GLADI] Dana Kaget dibuka!', teks: 'Contoh pop-up dari admin. Kode akses dibagikan saat live.', tombol: 'Klaim sekarang', link: '#dana', gambar: '' };
    return c;
  }

  /* ---------- jawaban tiruan untuk tulis ---------- */
  const namaTampil = (n) => { const b = String(n || '').trim().split(/\s+/); return b.length > 1 ? b[0] + ' ' + b[b.length - 1][0] + '.' : b[0] || ''; };
  const KASAR = /anjing|bangsat|babi|kontol|memek|goblok|tolol/i;
  function tiruan(path, body) {
    const p = body || {};
    if (path === '/api/kata') {
      if (KASAR.test(p.kata || '')) return { ok: false, error: 'kata_ditolak' };
      return { ok: true, gladi: true, entri: { n: namaTampil(p.nama), k: String(p.kata || '').toLowerCase(), p: p.provinsi || '', m: Number(p.karakter) || 1 } };
    }
    if (path === '/api/dana') {
      if (skenario.dana === 'belum') return { ok: false, error: 'nonaktif' };
      if (skenario.dana === 'habis') return { ok: false, error: 'habis' };
      if (p.aksi === 'akses') return { ok: true, gladi: true };
      if (/SALAH/i.test(p.kodeAkses || '')) return { ok: false, error: 'kode_salah' };
      const sisa = Math.max(0, Number(asli.get.call(sessionStorage, 'gladi:dana_sisa') || 37) - 1);
      asli.set.call(sessionStorage, 'gladi:dana_sisa', String(sisa));
      return { ok: true, gladi: true, sisa };
    }
    if (path === '/api/klaim') {
      if (p.aksi === 'cek') return /SALAH/i.test(p.kode || '') ? { ok: false, error: 'kode_salah' } : { ok: true, gladi: true, nama: 'Peserta Gladi', status: 'baru' };
      return { ok: true, gladi: true, nama: 'Peserta Gladi', status: 'aktif', kode: p.kode };
    }
    return { ok: true, gladi: true, requestId: p.requestId };
  }
  const json = (d, status = 200) => new Response(JSON.stringify(d), { status, headers: { 'Content-Type': 'application/json' } });
  const fetchAsli = window.fetch.bind(window);
  const TULIS = ['/api/kata', '/api/dana', '/api/klaim', '/api/survei', '/api/twibbon'];
  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    const metode = String(init.method || (typeof input !== 'string' && input.method) || 'GET').toUpperCase();
    if (url.origin === location.origin) {
      if (metode === 'POST' && TULIS.includes(url.pathname)) {
        let body = {}; try { body = JSON.parse(init.body || '{}'); } catch (e) {}
        await new Promise((r) => setTimeout(r, 350));
        const d = tiruan(url.pathname, body);
        return json(d, d.ok ? 200 : 422);
      }
      if (metode === 'GET' && url.pathname === '/api/config') {
        const r = await fetchAsli(input, init); const d = await r.json().catch(() => null);
        return json(ubahConfig(d), r.status);
      }
    }
    return fetchAsli(input, init);
  };

  /* ---------- panel gladi ---------- */
  const PILIHAN = {
    fase: [['asli', 'Ikuti server'], ['pra', 'Sebelum pengumuman'], ['pasca', 'Sesudah pengumuman']],
    live: [['asli', 'Ikuti jadwal'], ['tayang', 'Sedang tayang'], ['segera', 'Mulai 10 menit lagi']],
    dana: [['asli', 'Ikuti admin'], ['buka', 'Dibuka (sisa 37)'], ['belum', 'Belum dibuka'], ['habis', 'Kuota habis']],
    acara: [['asli', 'Ikuti admin'], ['berlangsung', 'Acara berlangsung'], ['selesai', 'Acara selesai']],
    popup: [['mati', 'Tidak tampil'], ['contoh', 'Tampilkan contoh']],
  };
  const LABEL = { fase: 'Fase pengumuman', live: 'Live', dana: 'Dana Kaget', acara: 'Waktu acara', popup: 'Pop-up admin' };
  function pasangPanel() {
    const bar = document.createElement('div');
    bar.className = 'gladi-bar';
    bar.innerHTML = `<span class="badge badge--game">Gladi</span><span class="gladi-bar__teks" id="gladi-teks">Mode gladi: alur asli, data <b>tidak</b> disimpan.</span><button type="button" class="btn btn--sm btn--light" id="gladi-buka">Atur</button>`;
    const dlg = document.createElement('dialog');
    dlg.className = 'sheet gladi-panel';
    dlg.setAttribute('aria-labelledby', 'gladi-judul');
    const opsi = Object.keys(PILIHAN).map((k) => `<div class="field"><label for="gladi-${k}">${LABEL[k]}</label><select class="select" id="gladi-${k}">${PILIHAN[k].map(([v, t]) => `<option value="${v}"${skenario[k] === v ? ' selected' : ''}>${t}</option>`).join('')}</select></div>`).join('');
    dlg.innerHTML = `<div class="sheet__grab" aria-hidden="true"></div><div class="sheet__head"><h2 class="t-h2" id="gladi-judul">Skenario gladi</h2><button class="icon-btn" type="button" data-gladi-tutup aria-label="Tutup">✕</button></div>
      <p class="t-sm">Kode gladi <b>${kode}</b>. Semua isian festival, Dana Kaget, klaim, dan survei hanya disimulasikan. Kode Dana Kaget apa pun diterima, kecuali yang mengandung "SALAH" (untuk uji pesan error).</p>
      <div class="gladi-panel__isi">${opsi}</div>
      <div class="gladi-panel__aksi"><button class="btn btn--primary btn--block" type="button" id="gladi-terapkan">Terapkan &amp; muat ulang</button>
      <a class="btn btn--soft btn--block" href="/game/?gladi=${kode}">Buka game (event uji Raja Batu)</a>
      <button class="btn btn--outline btn--block" type="button" id="gladi-reset">Hapus data gladi di HP ini</button>
      <a class="btn btn--ghost btn--block" href="${location.pathname}" id="gladi-keluar" data-gladi-keluar>Keluar mode gladi</a></div>`;
    document.body.append(bar, dlg);
    document.documentElement.classList.add('is-gladi');
    bar.querySelector('#gladi-buka').addEventListener('click', () => dlg.showModal());
    dlg.querySelector('[data-gladi-tutup]').addEventListener('click', () => dlg.close());
    dlg.querySelector('#gladi-terapkan').addEventListener('click', () => {
      const baru = {}; Object.keys(PILIHAN).forEach((k) => { baru[k] = dlg.querySelector('#gladi-' + k).value; });
      asli.set.call(sessionStorage, 'gladi:skenario', JSON.stringify(baru));
      asli.del.call(sessionStorage, 'gladi:ycs_popup');
      location.reload();
    });
    dlg.querySelector('#gladi-reset').addEventListener('click', () => {
      Object.keys(sessionStorage).filter((k) => k.startsWith('gladi:') && k !== 'gladi:kode').forEach((k) => sessionStorage.removeItem(k));
      location.reload();
    });
    dlg.querySelector('#gladi-keluar').addEventListener('click', () => { sessionStorage.removeItem('gladi:kode'); });
    // Cek kode ke server (kode = event uji monster yang sedang berjalan).
    fetchAsli('/api/monster?uji=' + encodeURIComponent(kode), { cache: 'no-store' }).then((r) => r.json()).then((d) => {
      if (d && d.ujiSalah) bar.querySelector('#gladi-teks').innerHTML = 'Kode gladi sudah berakhir: penyimpanan tetap diblokir, tapi game uji tidak aktif. Minta link baru ke admin.';
    }).catch(() => {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pasangPanel); else pasangPanel();
})();
