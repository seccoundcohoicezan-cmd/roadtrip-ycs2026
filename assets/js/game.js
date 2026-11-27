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
      const d = await (await fetch('/api/kata', { headers: { Accept: 'application/json' }, cache: 'no-cache' })).json();
      if (!d.ok || !festApi) return;
      const list = (d.orang || []).map(([n, k, p, m]) => ({ n, k, p, m }));
      if (saya && !list.some((e) => e.n === saya.n && e.k === saya.k)) list.unshift(saya);
      festApi.setWarga(list);
      if (saya && festApi.tandaiSaya) festApi.tandaiSaya(saya);
    } catch (e) { /* plaza tetap tampil */ }
  }
  muatWarga();
  setInterval(() => { if (!document.hidden && !document.body.classList.contains('is-tanding')) muatWarga(); }, 90000);

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

  let monApi = null;
  if (window.YCSMonster) {
    try {
      monApi = window.YCSMonster.pasang({
        stage, festApi, now, endpoint: '/api/monster',
        identitas: () => baca('ycs_identitas'),
        saya: () => saya,
        bolehTap: () => !!saya,
        saatTerkunci: () => tampilBuat(true),
        saatTiket: (kode, st) => catatKode(kode, st),
        saatMenang: (st) => akhiriEvent(st),
        saatHasil: (h) => catatRiwayat(h),
        saatBekal: (b) => tulisBekal(b),
        saatButuhPotion: () => sorotMisi(),
      });
    } catch (e) { /* lobi tetap jalan */ }
  }

  /* ---------- layar penuh arena (event) ---------- */
  // Ketukan pertama di arena saat bos menyerang langsung membuka layar penuh (lebih mudah dikontrol di HP).
  // Browser tanpa Fullscreen API (iPhone) memakai fallback: arena fixed memenuhi layar.
  const arena = $('#arena'), tPenuh = $('#g-penuh');
  stage.appendChild(tPenuh); // di dalam panggung agar ikut tata letak overlay (di bawah HUD, kanan)
  // Masuk/keluar layar penuh tidak menyentak: panggung memudar masuk setelah ukuran berubah.
  const pudar = () => { if (!matchMedia('(prefers-reduced-motion: reduce)').matches && stage.animate) stage.animate([{ opacity: 0.25, transform: 'scale(.985)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' }); };
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
    } else { arena.classList.add('is-penuh'); pudar(); }
    syncPenuh();
  }
  function keluarPenuh() {
    arena.classList.remove('is-penuh');
    const k = document.exitFullscreen || document.webkitExitFullscreen;
    if (fsEl() && k) try { const pr = k.call(document); if (pr && pr.catch) pr.catch(() => {}); } catch (e) {}
    syncPenuh();
  }
  tPenuh.addEventListener('click', (e) => { e.stopPropagation(); S.klik(); if (sedangPenuh()) keluarPenuh(); else masukPenuh(); });
  document.addEventListener('fullscreenchange', () => { syncPenuh(); pudar(); });
  document.addEventListener('webkitfullscreenchange', () => { syncPenuh(); pudar(); });
  arena.addEventListener('pointerup', (e) => {
    if (autoPenuh || !document.body.classList.contains('is-tanding') || sedangPenuh() || e.target.closest('button, a, .g-buat') || (!saya && !uji)) return;
    autoPenuh = true; masukPenuh();
  });

  /* ---------- riwayat match (tersimpan di HP; hasil tiap event: menang/kalah, tenaga, peringkat, hadiah Top) ---------- */
  const KUNCI_RIWAYAT = uji ? 'ycs_riwayat_uji' : 'ycs_riwayat';
  const HASIL = { menang: ['🏆', 'Bos tumbang!', false], monster_menang: ['💀', 'Raja Batu menang', true], habis: ['💨', 'Bos kabur (waktu habis)', true], kabur: ['💨', 'Bos kabur (waktu habis)', true] };
  const rp = (n) => 'Rp' + nf.format(n);
  function catatRiwayat(h) {
    if (!h || !h.id) return;
    const lama = baca(KUNCI_RIWAYAT, []), sudah = lama.find((x) => x.id === h.id);
    if (sudah && sudah.ikut && !h.ikut) return; // jangan timpa hasil yang lengkap dengan data kosong
    const list = lama.filter((x) => x.id !== h.id);
    list.push({ ...h, dicatat: now() });
    simpan(KUNCI_RIWAYAT, list.slice(-30));
    tampilRiwayat();
    if (h.top && !(sudah && sudah.top)) toast(`Kamu Top ${h.top.peringkat} kontributor! Hadiah ${rp(h.top.nominal)}.`);
  }
  function tampilRiwayat() {
    const list = baca(KUNCI_RIWAYAT, []).slice().reverse();
    const ikut = list.filter((x) => x.ikut);
    $('#g-riwayat-badge').textContent = `${list.length} match`;
    $('#g-riwayat-kosong').hidden = list.length > 0;
    $('#g-statistik').hidden = !list.length;
    $('#st-main').textContent = nf.format(ikut.length);
    $('#st-menang').textContent = nf.format(ikut.filter((x) => x.fase === 'menang').length);
    $('#st-kalah').textContent = nf.format(ikut.filter((x) => x.fase !== 'menang').length);
    const terbaik = ikut.map((x) => x.peringkat).filter(Boolean).sort((a, b) => a - b)[0];
    $('#st-terbaik').textContent = terbaik ? '#' + nf.format(terbaik) : '–';
    const e = (t) => String(t || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    $('#g-riwayat').innerHTML = list.map((x) => {
      const [ikon, judul, kalah] = HASIL[x.fase] || ['🎮', 'Event selesai', false];
      const waktu = x.mulai ? new Date(x.mulai).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) : '';
      const cap = [];
      if (x.top) cap.push(`<span class="is-top">🏆 Top ${x.top.peringkat} · ${rp(x.top.nominal)}</span>`);
      if (x.ikut) {
        cap.push(`<span>${nf.format(x.tenaga)} tenaga</span>`);
        if (x.peringkat) cap.push(`<span>Peringkat #${nf.format(x.peringkat)}${x.pemain ? ' dari ' + nf.format(x.pemain) : ''}</span>`);
        cap.push(`<span>${x.tumbang ? 'Karakter tumbang' : 'Karakter selamat'}</span>`);
        if (x.tiket) cap.push(`<span>Kode ${e(x.tiket)} ${x.fase === 'menang' ? 'sah' : 'hangus'}</span>`);
      } else cap.push('<span>Hanya menonton</span>');
      return `<li class="${kalah ? 'is-kalah' : ''}"><span class="g-hasil-ikon" aria-hidden="true">${ikon}</span><strong>${judul}${x.uji ? ' · uji' : ''}</strong><small>${e(waktu)}${x.live ? ' · ' + e(x.live) : ''}${x.levelMaks > 1 ? ` · level ${x.level}/${x.levelMaks}` : ''}</small><div class="g-capaian">${cap.join('')}</div></li>`;
    }).join('');
    // hasil match terakhir tampil di arena sampai event berikutnya dimulai
    const akhir = list[0], el = $('#g-hasil');
    if (akhir) {
      const [ikon, judul] = HASIL[akhir.fase] || ['🎮', 'Event selesai'];
      el.innerHTML = `${ikon} Match terakhir: <b>${judul}</b>` + (akhir.ikut ? ` · ${nf.format(akhir.tenaga)} tenaga${akhir.peringkat ? ` · #${nf.format(akhir.peringkat)}` : ''}${akhir.top ? ` · Top ${akhir.top.peringkat} (${rp(akhir.top.nominal)})` : ''}` : '');
      el.hidden = false;
    } else el.hidden = true;
  }
  tampilRiwayat();

  /* ---------- belum punya karakter: arahkan buat karakter dulu ---------- */
  // Muncul otomatis saat event berjalan (sekali, bisa ditutup "Nonton dulu") dan setiap kali arena diketuk tanpa karakter.
  let buatDitutup = false;
  function tampilBuat(paksa) {
    if (saya || uji) { $('#g-buat').hidden = true; return; }
    if (!paksa && buatDitutup) return;
    if (sedangPenuh()) keluarPenuh();
    $('#g-buat').hidden = false;
    $('#g-gabung').hidden = false;
    if (paksa && navigator.vibrate) try { navigator.vibrate(20); } catch (e) {}
  }
  $('#g-buat-nonton').addEventListener('click', () => { buatDitutup = true; $('#g-buat').hidden = true; toast('Mode nonton. Ketuk arena kapan saja untuk membuat karakter.'); });

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
      tulisPapan();
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
  let pesanDitutup = '';
  document.addEventListener('click', (e) => { if (e.target.closest('.mon__tutup')) { pesanDitutup = stMon && stMon.id; if (sedangPenuh()) keluarPenuh(); tampilStatus(); } });
  function tampilStatus() {
    const f = stMon ? stMon.fase : '';
    const tanding = f === 'tanding';
    const selesai = ['menang', 'monster_menang', 'habis', 'kabur'].includes(f);
    // setelah pesan akhir event ditutup, kartu lobi (hasil match terakhir + hitung mundur event berikutnya) tampil lagi
    $('#g-tidur').hidden = tanding || (selesai && pesanDitutup !== (stMon && stMon.id));
    document.body.classList.toggle('is-tanding', tanding);
    if (tanding && !saya && !uji) tampilBuat(false); else if (!tanding) $('#g-buat').hidden = true;
    // 1 jam terakhir sebelum muncul: kartu menyusut agar retakan tanah di plaza terlihat
    document.body.classList.toggle('is-retak', f === 'tunggu' && !!stMon.mulai && Date.parse(stMon.mulai) - now() < 3600000);
    tPenuh.hidden = !tanding && !sedangPenuh();
    if (!tanding && !selesai && sedangPenuh()) keluarPenuh();
    target = bosBerikut();
    const badge = $('#g-status-badge'), judul = $('#g-status-judul'), sub = $('#g-status-sub');
    $('#g-ingat').hidden = !target;
    if (stMon && stMon.ujiSalah) { badge.textContent = 'Link uji berakhir'; judul.textContent = 'Mode uji sudah selesai'; sub.textContent = 'Minta link uji baru ke panitia, atau main latihan dulu.'; $('#g-hitung').hidden = true; return; }
    if (target) { badge.textContent = document.body.classList.contains('is-retak') ? 'Tanah plaza mulai retak…' : f === 'tunggu' ? 'Segera muncul!' : 'Bos sedang tidur'; judul.textContent = 'Raja Batu muncul dalam'; sub.textContent = cfg && stMon && stMon.live ? `Sebelum live "${stMon.live.judul}". Siapkan jarimu!` : 'Bos muncul ±20 menit sebelum live. Sambil menunggu, latihan dulu!'; }
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
  const latihan = window.YCSLatihan.buat($('#latihan'), {
    saatSelesai: () => { tandaiMisi('latihan'); },
    hadiahTop: () => (stMon && stMon.hadiahTop) || null,
    saatMisi: () => sorotMisi(),
    // Ajakan "Lawan Raja Batu asli": kembali ke lobi (status & hitung mundur bos), atau langsung arena bila sedang bertanding.
    saatAjak: () => { window.scrollTo({ top: 0, behavior: 'smooth' }); if (!(stMon && stMon.fase === 'tanding')) toast('Raja Batu asli muncul sebelum live. Pantau hitung mundurnya di sini!'); },
  });
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
  // Daftar misi diatur admin (GET /api/misi). jenis: gabung | latihan | ingat | bagi | link (selesai saat diklik).
  const IKON_MISI = { gabung: 'i-users', latihan: 'i-sword', ingat: 'i-bell', bagi: 'i-share', link: 'i-play' };
  const MISI_BAWAAN = [
    { id: 'gabung', jenis: 'gabung', judul: 'Gabung Festival Satu Kata', sub: 'Karaktermu ikut bertarung', link: '/#satu-kata' },
    { id: 'wa', jenis: 'link', judul: 'Ikuti saluran WhatsApp YCS', sub: 'Info bos & kode Dana Kaget', link: 'https://whatsapp.com/channel/0029Vb5vVIaId7nEqecJ1I1G' },
    { id: 'latihan', jenis: 'latihan', judul: 'Selesaikan 1 latihan', sub: 'Asah jari sebelum bos muncul' },
    { id: 'ingat', jenis: 'ingat', judul: 'Pasang pengingat bos', sub: 'Biar nggak ketinggalan' },
    { id: 'bagi', jenis: 'bagi', judul: 'Tantang teman', sub: 'Bagikan skor latihanmu' },
  ];
  const keMisi = (x) => ({ ...x, ikon: /whatsapp/.test(x.link || '') ? 'i-whatsapp' : IKON_MISI[x.jenis] || 'i-play',
    href: x.jenis === 'link' || x.jenis === 'gabung' ? x.link : '', cek: x.jenis === 'gabung' ? () => !!baca('ycs_fest') : null,
    subTampil: () => (x.jenis === 'latihan' && baca('ycs_latihan_best', 0) ? `${x.sub ? x.sub + ' · ' : ''}Rekor: ${nf.format(baca('ycs_latihan_best', 0))}` : x.sub || '') });
  let MISI = (baca('ycs_misi_daftar') || MISI_BAWAAN).map(keMisi);
  fetch('/api/misi').then((r) => r.json()).then((d) => { if (d && d.ok && Array.isArray(d.misi) && d.misi.length) { simpan('ycs_misi_daftar', d.misi); MISI = d.misi.map(keMisi); syncMisi(); } }).catch(() => {});
  const selesaiMisi = () => baca('ycs_misi', {});
  function tandaiMisi(id) { const per = MISI.filter((q) => q.jenis === id && q.id !== id); if (per.length) { per.forEach((q) => tandaiMisi(q.id)); if (!MISI.some((q) => q.id === id)) return; } const m = selesaiMisi(); if (m[id]) { syncMisi(); return; } m[id] = now(); simpan('ycs_misi', m); syncMisi(id); }
  // Tiap 5 misi selesai = 1 Peti Equipment (1 Racun + 1 Gempa + 1 Petir), diklaim otomatis ke server.
  const PER_PETI = 5;
  function syncMisi(baru) {
    const m = selesaiMisi();
    let ubah = false;
    MISI.forEach((x) => { if (x.cek && x.cek() && !m[x.id]) { m[x.id] = now(); ubah = true; } });
    if (ubah) simpan('ycs_misi', m);
    const n = MISI.filter((x) => m[x.id]).length, peti = Math.floor(n / PER_PETI), dalam = n - peti * PER_PETI;
    const penuh = n >= MISI.length && MISI.length < PER_PETI * (peti + 1);
    $('#g-misi-n').textContent = `${n}/${MISI.length}`;
    $('#g-misi-meter').setAttribute('aria-valuemax', String(PER_PETI));
    $('#g-misi-meter').setAttribute('aria-valuenow', String(penuh ? PER_PETI : dalam));
    $('#g-misi-fill').style.width = ((penuh ? PER_PETI : dalam) / PER_PETI * 100) + '%';
    $('#g-peti-judul').textContent = peti && (penuh || dalam === 0) ? `${peti} Peti Equipment didapat! 🎉` : `${dalam}/${PER_PETI} misi → 1 Peti Equipment`;
    if (ubah || baru) monApi && monApi.syncBekal && monApi.syncBekal();
    $('#g-misi').innerHTML = MISI.map((x) => {
      const ok = !!m[x.id], sub = x.subTampil();
      const aksi = ok ? '<span class="g-misi__stempel"><svg aria-hidden="true"><use href="#i-check"/></svg>Selesai</span>'
        : x.href ? `<a class="btn btn--soft btn--sm" href="${x.href}" data-misi="${x.id}"${x.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>Kerjakan</a>`
          : `<button class="btn btn--soft btn--sm" type="button" data-misi="${x.id}">Kerjakan</button>`;
      const e = (t) => String(t || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      return `<li class="${ok ? 'is-ok' : ''}${baru === x.id ? ' is-baru' : ''}"><span class="ico ${ok ? 'ico--dana' : 'ico--info'}" aria-hidden="true"><svg><use href="#${x.ikon}"/></svg></span><span class="menu-list__txt"><strong>${e(x.judul)}</strong><small>${e(sub)}</small></span>${aksi}</li>`;
    }).join('');
    if (baru) { S.aman(); toast(n % PER_PETI === 0 ? 'Misi selesai! 🎁 Peti Equipment terbuka: +1 Racun, +1 Gempa, +1 Petir!' : `Misi selesai! ${PER_PETI - dalam} misi lagi untuk Peti Equipment.`); }
    tulisBekal(monApi && monApi.bekal);
  }
  $('#g-misi').addEventListener('click', (e) => {
    const b = e.target.closest('[data-misi]'); if (!b) return;
    const id = b.dataset.misi, x = MISI.find((q) => q.id === id) || {};
    if (x.jenis === 'link') setTimeout(() => tandaiMisi(id), 400);
    if (x.jenis === 'latihan') latihan.buka();
    if (x.jenis === 'ingat') { if (target) $('#g-ingat').click(); else toast('Jadwal bos belum diumumkan. Coba lagi nanti.'); }
    if (x.jenis === 'bagi') bagikan('Main game Lawan Raja Batu di YCS 2026, kalahkan bos sebelum live dan dapat kode undian HP:', id);
  });
  /* ---------- tas pejuang: nyawa & potion (jumlah dari server) ---------- */
  function tulisBekal(b) {
    const P = window.YCSPotion; if (!P) return;
    const hp = (b && b.hpMaks) || 5;
    $('#g-tas-nyawa').innerHTML = Array.from({ length: hp }, () => '<svg aria-hidden="true"><use href="#i-heart"/></svg>').join('') + `<span>Nyawa ${hp}</span>`;
    $('#g-tas-nyawa').setAttribute('aria-label', `Nyawa karakter ${hp}`);
    $('#g-tas-pot').innerHTML = P.URUT.map((j) => { const n = b && b.sisa ? b.sisa[j] || 0 : 0, d = P.DATA[j];
      return `<li class="${n ? '' : 'is-kosong'}">${P.ikon(j)}<b>x${n}</b><strong>${d.nama}</strong><small>= ${d.tap} tap</small></li>`; }).join('');
    const idt = baca('ycs_identitas');
    $('#g-tas-info').textContent = !(idt && (idt.email || idt.wa)) && !uji ? 'Gabung Festival Satu Kata dulu supaya potion bisa diklaim ke karaktermu.'
      : b && b.peti ? 'Potion siap dipakai saat Raja Batu muncul. Ketuk botolnya di sisi kiri arena.' : 'Belum punya potion. Selesaikan misi di bawah untuk membuka Peti Equipment.';
  }
  function sorotMisi() { const el = $('#misi'); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.classList.remove('is-sorot'); void el.offsetWidth; el.classList.add('is-sorot'); } }
  syncMisi();
  tulisBekal(null);

  /* ---------- papan hadiah (nominal Top dari pengaturan admin monster_hadiah_top) ---------- */
  function tulisPapan() {
    const h = (stMon && stMon.hadiahTop) || [100000, 100000, 50000];
    const urut = ['Hit terbanyak', 'Hit terbanyak ke-2', 'Hit terbanyak ke-3', 'Hit terbanyak ke-4', 'Hit terbanyak ke-5'];
    $('#g-papan-top').innerHTML = h.map((n, i) => `<li><span class="g-papan__medali g-papan__medali--${Math.min(i + 1, 3)}">${i + 1}</span><div><strong>Top ${i + 1} Kontributor</strong><small>${urut[i]}</small></div><b>Rp${nf.format(n)}</b></li>`).join('');
  }

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
