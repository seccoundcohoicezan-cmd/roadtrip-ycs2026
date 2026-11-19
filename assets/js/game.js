/* Halaman /game/ — Lawan Raja Batu.
   Lobi bergaya game harian: status bos + hitung mundur, mode latihan, kode undian, misi, pemenang.
   Arena event asli = panggung festival + overlay monster (assets/js/monster.js, jam & aturan dari server). */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const nf = new Intl.NumberFormat('id-ID');
  const baca = (k, d = null) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const simpan = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const S = window.YCSSuara;
  const qs = new URLSearchParams(location.search);
  const uji = (qs.get('uji-monster') || '').replace(/[^\w-]/g, '').slice(0, 20);
  const pad = (n) => String(n).padStart(2, '0');
  let offset = 0; const now = () => Date.now() + offset;
  fetch('/api/now', { cache: 'no-store' }).then((r) => r.json()).then((d) => { if (d && d.now) offset = d.now - Date.now(); }).catch(() => {});

  /* ---------- toast ---------- */
  let tt = 0;
  function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('is-visible'); clearTimeout(tt); tt = setTimeout(() => el.classList.remove('is-visible'), 3200); }

  /* ---------- suara ---------- */
  const tSuara = $('#g-suara');
  const syncSuara = () => { tSuara.setAttribute('aria-pressed', String(S.nyala)); tSuara.setAttribute('aria-label', S.nyala ? 'Matikan suara' : 'Nyalakan suara'); tSuara.classList.toggle('is-mati', !S.nyala); };
  tSuara.addEventListener('click', () => { S.nyala = !S.nyala; syncSuara(); S.klik(); });
  syncSuara();
  if (uji) $('#g-gladi').hidden = false;

  /* ---------- peserta festival ---------- */
  const saya = baca('ycs_fest');
  $('#g-gabung').hidden = !!saya || !!uji;

  /* ---------- arena: plaza festival + monster ---------- */
  const stage = $('.fest__stage');
  let festApi = null;
  if (window.YCSFestival) festApi = window.YCSFestival($('#fest-canvas'), { wadahBalon: stage, balonAktif: true });
  async function muatWarga() {
    try {
      const d = await (await fetch('/api/kata', { headers: { Accept: 'application/json' } })).json();
      if (!d.ok || !festApi) return;
      const list = (d.orang || []).map(([n, k, p, m]) => ({ n, k, p, m }));
      if (saya && !list.some((e) => e.n === saya.n && e.k === saya.k)) list.unshift(saya);
      festApi.setWarga(list);
      if (saya && festApi.tandaiSaya) festApi.tandaiSaya(saya);
    } catch (e) { /* plaza tetap tampil */ }
  }
  muatWarga();

  /* ---------- kode undian (tersimpan di perangkat) ---------- */
  const KUNCI_KODE = uji ? 'ycs_kode_uji' : 'ycs_kode_undian';
  function daftarKode() { return baca(KUNCI_KODE, []); }
  function tampilKode() {
    const list = daftarKode();
    const nSah = list.filter((k) => (k.status || 'sah') === 'sah').length;
    $('#g-jml-kode').textContent = nSah;
    $('#g-kode-badge').textContent = `${nSah} kode sah`;
    $('#g-kode-kosong').hidden = list.length > 0;
    const LBL = { menunggu: ['badge--info', 'Sah jika bos tumbang'], sah: ['badge--open', 'Sah · ikut undian'], hangus: ['badge--done', 'Hangus'] };
    $('#g-kode').innerHTML = list.slice().reverse().map((k) => `<li class="is-${k.status || 'sah'}"><span class="g-kode__tiket"><small>Kode undian</small><b>${String(k.kode).replace(/[<&]/g, '')}</b></span><span class="g-kode__info"><strong>${k.bos || 'Raja Batu'}</strong><small>${new Date(k.waktu).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}${k.live ? ' · diundi di ' + String(k.live).replace(/[<&]/g, '') : ''}</small><span class="badge ${(LBL[k.status] || LBL.sah)[0]}">${(LBL[k.status] || LBL.sah)[1]}</span></span></li>`).join('');
  }
  // Kode dicadangkan saat ikut menyerang; sah (ikut undian) hanya bila Raja Batu tumbang — sama dengan aturan server.
  function catatKode(kode, st) {
    const list = daftarKode();
    if (list.some((k) => k.kode === kode && k.event === (st && st.id))) return;
    list.push({ kode, event: st && st.id, bos: st && st.nama, live: st && st.live && st.live.judul, waktu: now(), status: 'menunggu' });
    simpan(KUNCI_KODE, list);
    tampilKode(); syncMisi();
    S.aman(); toast(`Kode ${kode} dicadangkan! Sah kalau Raja Batu tumbang.`);
  }
  function akhiriEvent(st) {
    if (!st || !st.id) return;
    const sah = st.fase === 'menang', hangus = st.fase === 'monster_menang' || st.fase === 'kabur' || st.fase === 'habis';
    if (!sah && !hangus) return;
    const list = daftarKode(); let baruSah = null;
    list.forEach((k) => { if (k.event === st.id && k.status === 'menunggu') { k.status = sah ? 'sah' : 'hangus'; if (sah) baruSah = k.kode; } });
    simpan(KUNCI_KODE, list); tampilKode();
    if (baruSah) {
      $('#dapat-kode').textContent = baruSah;
      const d = $('#dapat');
      setTimeout(() => { if (d.showModal && !d.open) { S.menang(); d.showModal(); } }, 2500);
    }
  }
  $('#dapat-tutup').addEventListener('click', () => $('#dapat').close());
  $('#dapat-bagi').addEventListener('click', () => bagikan(`Aku ikut kalahkan Raja Batu di YCS 2026 dan dapat kode undian ${$('#dapat-kode').textContent}! Ayo ikut, siapa tahu kamu yang bawa pulang HP:`));
  tampilKode();

  if (window.YCSMonster) {
    try {
      window.YCSMonster.pasang({
        stage, festApi, now, endpoint: '/api/monster',
        identitas: () => baca('ycs_identitas'),
        saya: () => saya,
        bolehTap: () => !!saya,
        saatTerkunci: () => { toast('Gabung Festival Satu Kata dulu, karaktermu ikut bertarung.'); $('#g-gabung').hidden = false; $('#g-gabung').scrollIntoView({ behavior: 'smooth', block: 'center' }); },
        saatTiket: (kode, st) => catatKode(kode, st),
        saatMenang: (st) => akhiriEvent(st),
      });
    } catch (e) { /* lobi tetap jalan */ }
  }

  /* ---------- layar penuh arena (event) ---------- */
  // Ketukan pertama di arena saat bos menyerang langsung membuka layar penuh (lebih mudah dikontrol di HP).
  // Browser tanpa Fullscreen API (iPhone) memakai fallback: arena fixed memenuhi layar.
  const arena = $('#arena'), tPenuh = $('#g-penuh');
  let autoPenuh = false;
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  const sedangPenuh = () => fsEl() === arena || arena.classList.contains('is-penuh');
  function syncPenuh() {
    const p = sedangPenuh();
    tPenuh.setAttribute('aria-pressed', String(p)); tPenuh.setAttribute('aria-label', p ? 'Keluar layar penuh' : 'Layar penuh');
    document.body.classList.toggle('is-penuh', p);
  }
  function masukPenuh() {
    const minta = arena.requestFullscreen || arena.webkitRequestFullscreen;
    if (minta) {
      try { const pr = minta.call(arena, { navigationUI: 'hide' }); if (pr && pr.catch) pr.catch(() => { arena.classList.add('is-penuh'); syncPenuh(); }); } catch (e) { arena.classList.add('is-penuh'); }
    } else arena.classList.add('is-penuh');
    syncPenuh();
  }
  function keluarPenuh() {
    arena.classList.remove('is-penuh');
    const k = document.exitFullscreen || document.webkitExitFullscreen;
    if (fsEl() && k) try { const pr = k.call(document); if (pr && pr.catch) pr.catch(() => {}); } catch (e) {}
    syncPenuh();
  }
  tPenuh.addEventListener('click', (e) => { e.stopPropagation(); S.klik(); if (sedangPenuh()) keluarPenuh(); else masukPenuh(); });
  document.addEventListener('fullscreenchange', syncPenuh);
  document.addEventListener('webkitfullscreenchange', syncPenuh);
  arena.addEventListener('pointerup', (e) => {
    if (autoPenuh || !document.body.classList.contains('is-tanding') || sedangPenuh() || e.target.closest('button, a')) return;
    autoPenuh = true; masukPenuh();
  });

  /* ---------- status bos & hitung mundur ---------- */
  let cfg = null, stMon = null, target = 0;
  async function muatStatus() {
    try {
      const [m, c] = await Promise.all([
        fetch('/api/monster' + (uji ? '?uji=' + encodeURIComponent(uji) : ''), { cache: 'no-store' }).then((r) => r.json()),
        cfg ? Promise.resolve(cfg) : fetch('/api/config').then((r) => r.json()),
      ]);
      stMon = m; cfg = c;
      akhiriEvent(m);
    } catch (e) { /* biarkan status lama */ }
    tampilStatus();
  }
  function bosBerikut() {
    if (stMon && stMon.mulai && (stMon.fase === 'tunggu')) return Date.parse(stMon.mulai);
    const mc = cfg && cfg.monster;
    if (!mc || !mc.aktif) return 0;
    const menit = Number(mc.menit || 20) * 60000;
    if (mc.pemicu === 'jadwal' && mc.waktu) { const t = Date.parse(mc.waktu); return t > now() ? t : 0; }
    const l = (cfg.live || []).map((x) => Date.parse(x.mulai) - menit).filter((t) => t > now()).sort((a, b) => a - b)[0];
    return l || 0;
  }
  function tampilStatus() {
    const f = stMon ? stMon.fase : '';
    const tanding = f === 'tanding';
    const selesai = ['menang', 'monster_menang', 'habis', 'kabur'].includes(f);
    $('#g-tidur').hidden = tanding || selesai;
    document.body.classList.toggle('is-tanding', tanding);
    tPenuh.hidden = !tanding && !sedangPenuh();
    if (!tanding && !selesai && sedangPenuh()) keluarPenuh();
    target = bosBerikut();
    const badge = $('#g-status-badge'), judul = $('#g-status-judul'), sub = $('#g-status-sub');
    $('#g-ingat').hidden = !target;
    if (stMon && stMon.ujiSalah) { badge.textContent = 'Link uji berakhir'; judul.textContent = 'Mode uji sudah selesai'; sub.textContent = 'Minta link uji baru ke panitia, atau main latihan dulu.'; $('#g-hitung').hidden = true; return; }
    if (target) { badge.textContent = f === 'tunggu' ? 'Segera muncul!' : 'Bos sedang tidur'; judul.textContent = 'Raja Batu muncul dalam'; sub.textContent = cfg && stMon && stMon.live ? `Sebelum live "${stMon.live.judul}". Siapkan jarimu!` : 'Bos muncul ±20 menit sebelum live. Sambil menunggu, latihan dulu!'; }
    else { badge.textContent = 'Bos sedang tidur'; judul.textContent = 'Jadwal Raja Batu segera diumumkan'; sub.textContent = 'Pantau saluran WhatsApp YCS. Sambil menunggu, latihan dulu!'; }
    $('#g-hitung').hidden = !target;
    tik();
  }
  function tik() {
    if (!target) return;
    const s = Math.max(0, Math.floor((target - now()) / 1000));
    const el = (u) => $(`[data-u="${u}"]`);
    el('j').textContent = pad(Math.floor(s / 3600)); el('m').textContent = pad(Math.floor((s % 3600) / 60)); el('d').textContent = pad(s % 60);
    if (s === 0) setTimeout(muatStatus, 1500);
  }
  setInterval(tik, 1000);
  muatStatus();
  setInterval(() => { if (!document.hidden) muatStatus(); }, 5000);
  $('#g-ingat').addEventListener('click', () => {
    if (!target) return;
    const f = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//YCS 2026//Game//ID', 'BEGIN:VEVENT', 'UID:bos-' + target + '@ycs2026', 'DTSTAMP:' + f(Date.now()), 'DTSTART:' + f(target), 'DTEND:' + f(target + 20 * 60000), 'SUMMARY:Lawan Raja Batu - YCS 2026', 'DESCRIPTION:Kalahkan bos\\, dapat kode undian HP: ' + location.origin + '/game/', 'BEGIN:VALARM', 'TRIGGER:-PT5M', 'ACTION:DISPLAY', 'DESCRIPTION:Raja Batu muncul 5 menit lagi!', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })), download: 'lawan-raja-batu.ics' });
    document.body.append(a); a.click(); a.remove();
    tandaiMisi('ingat'); toast('Pengingat diunduh. Buka untuk menambahkannya ke kalender.');
  });

  /* ---------- latihan ---------- */
  const latihan = window.YCSLatihan.buat($('#latihan'), { saatSelesai: () => { tandaiMisi('latihan'); } });
  $('#g-latihan').addEventListener('click', () => { S.klik(); latihan.buka(); });
  $('#lt-bagi').addEventListener('click', () => bagikan(`Skorku ${$('#lt-skor').textContent} lawan Raja Batu di game YCS 2026. Berani tanding? Kalahkan bos asli sebelum live dan dapat kode undian HP:`, 'bagi'));
  if (qs.get('main') === 'latihan') setTimeout(() => latihan.buka(), 400);

  /* ---------- bagikan ---------- */
  async function bagikan(teks, misi) {
    const url = location.origin + '/game/?ref=ajak';
    try {
      if (navigator.share) await navigator.share({ title: 'Lawan Raja Batu · YCS 2026', text: teks, url });
      else { await navigator.clipboard.writeText(teks + ' ' + url); toast('Link disalin. Tempel di WA/IG temanmu!'); }
      if (misi) tandaiMisi(misi);
    } catch (e) { /* dibatalkan */ }
  }

  /* ---------- misi (hanya lencana; kode undian tetap dari event) ---------- */
  const MISI = [
    { id: 'gabung', judul: 'Gabung Festival Satu Kata', sub: 'Karaktermu ikut bertarung', ikon: 'i-users', href: '/#satu-kata', cek: () => !!baca('ycs_fest') },
    { id: 'wa', judul: 'Ikuti saluran WhatsApp YCS', sub: 'Info bos & kode Dana Kaget', ikon: 'i-whatsapp', href: 'https://whatsapp.com/channel/0029Vb5vVIaId7nEqecJ1I1G' },
    { id: 'latihan', judul: 'Selesaikan 1 latihan', sub: () => `Rekor: ${nf.format(baca('ycs_latihan_best', 0))}`, ikon: 'i-sword' },
    { id: 'ingat', judul: 'Pasang pengingat bos', sub: 'Biar nggak ketinggalan', ikon: 'i-bell' },
    { id: 'bagi', judul: 'Tantang teman', sub: 'Bagikan skor latihanmu', ikon: 'i-share' },
  ];
  const selesaiMisi = () => baca('ycs_misi', {});
  function tandaiMisi(id) { const m = selesaiMisi(); if (m[id]) { syncMisi(); return; } m[id] = now(); simpan('ycs_misi', m); syncMisi(id); }
  function syncMisi(baru) {
    const m = selesaiMisi();
    MISI.forEach((x) => { if (x.cek && x.cek()) m[x.id] = m[x.id] || now(); });
    const n = MISI.filter((x) => m[x.id]).length;
    $('#g-misi-n').textContent = `${n}/${MISI.length}`;
    $('#g-misi-fill').style.width = (n / MISI.length * 100) + '%';
    $('#g-misi-meter').setAttribute('aria-valuenow', String(n));
    $('#g-misi').innerHTML = MISI.map((x) => {
      const ok = !!m[x.id], sub = typeof x.sub === 'function' ? x.sub() : x.sub;
      const aksi = ok ? '<span class="g-misi__stempel"><svg aria-hidden="true"><use href="#i-check"/></svg>Selesai</span>'
        : x.href ? `<a class="btn btn--soft btn--sm" href="${x.href}" data-misi="${x.id}"${x.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>Kerjakan</a>`
          : `<button class="btn btn--soft btn--sm" type="button" data-misi="${x.id}">Kerjakan</button>`;
      return `<li class="${ok ? 'is-ok' : ''}${baru === x.id ? ' is-baru' : ''}"><span class="ico ${ok ? 'ico--dana' : 'ico--info'}" aria-hidden="true"><svg><use href="#${x.ikon}"/></svg></span><span class="menu-list__txt"><strong>${x.judul}</strong><small>${sub}</small></span>${aksi}</li>`;
    }).join('');
    if (baru) { S.aman(); toast('Misi selesai! Lencana didapat.'); }
  }
  $('#g-misi').addEventListener('click', (e) => {
    const b = e.target.closest('[data-misi]'); if (!b) return;
    const id = b.dataset.misi;
    if (id === 'wa') setTimeout(() => tandaiMisi('wa'), 400);
    if (id === 'latihan') latihan.buka();
    if (id === 'ingat') { if (target) $('#g-ingat').click(); else toast('Jadwal bos belum diumumkan. Coba lagi nanti.'); }
    if (id === 'bagi') bagikan('Main game Lawan Raja Batu di YCS 2026, kalahkan bos sebelum live dan dapat kode undian HP:', 'bagi');
  });
  syncMisi();

  /* ---------- pemenang ---------- */
  async function muatJuara() {
    try {
      const d = await (await fetch('/api/pemenang')).json();
      const list = (d && d.pemenang) || [];
      $('#g-juara-kosong').hidden = list.length > 0;
      $('#g-juara').innerHTML = list.slice(0, 10).map((p) => `<li><span class="g-juara__ava">${String(p.nama || '?').trim().charAt(0).replace(/[<&]/g, '')}</span><span class="menu-list__txt"><strong>${String(p.nama || '').replace(/[<&]/g, '')}</strong><small>${String(p.provinsi || '').replace(/[<&]/g, '')}${p.tiket ? ' · kode ' + String(p.tiket).replace(/[<&]/g, '') : ''}</small></span><span class="badge badge--sun">${String(p.hadiah || 'Hadiah').replace(/[<&]/g, '')}</span></li>`).join('');
    } catch (e) { /* kosong */ }
  }
  muatJuara();
  setInterval(() => { if (!document.hidden) muatJuara(); }, 60000);
})();
