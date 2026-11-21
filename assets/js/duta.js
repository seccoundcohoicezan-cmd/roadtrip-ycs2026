/* Halaman Duta (/duta/, tidak ditautkan dari beranda): peserta lolos mencari namanya, menyalin link ajakan
   pribadi (?ref=duta-xxxxxx), dan memantau berapa warga yang mengisi Festival Satu Kata lewat link itu. */
(() => {
  'use strict';
  const {$, toast, nf} = window.YCS;
  const API = '/api/duta', KUNCI = 'ycs_duta_saya';
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  let semua = [], saya = null, timer = 0;

  const linkDari = (kode) => `${location.origin}/?ref=${encodeURIComponent(kode)}#satu-kata`;
  const ajakan = (d) => `Halo! Aku ${d.nama.split(' ')[0]}, peserta lolos Youth Character Summit 2026. Yuk ikut Festival Satu Kata YCS: kirim satu kata untuk Indonesia & jadi warga plaza bareng aku 👉 ${linkDari(d.kode)}`;

  async function muatDaftar() {
    try {
      const d = await (await fetch(API, {cache: 'no-cache', headers: {Accept: 'application/json'}})).json();
      if (!d.ok) throw new Error(d.error);
      semua = d.duta;
      $('#cari-info').textContent = semua.length ? `${nf.format(semua.length)} duta terdaftar. Ketik minimal 3 huruf.` : 'Daftar peserta lolos belum diunggah panitia.';
      $('#papan-ringkas').textContent = `${nf.format(d.totalWarga)} warga bergabung lewat link duta.`;
      renderPapan();
      cari();
    } catch (e) { $('#cari-info').textContent = 'Gagal memuat daftar duta. Muat ulang halaman.'; }
  }
  function renderPapan() {
    const top = semua.filter((x) => x.warga > 0).slice(0, 15);
    $('#papan').innerHTML = top.map((x) => `<li class="${saya && saya.kode === x.kode ? 'is-saya' : ''}"><span class="no">${x.peringkat}</span><span><strong>${esc(x.nama)}</strong><small>${esc(x.sekolah)}${x.provinsi ? ' · ' + esc(x.provinsi) : ''}</small></span><b>${nf.format(x.warga)}</b></li>`).join('')
      || '<li><span class="no">–</span><span><strong>Belum ada warga lewat link duta</strong><small>Jadilah duta pertama di papan ini!</small></span><b>0</b></li>';
  }
  function cari() {
    const q = norm($('#cari').value);
    const hasil = q.length < 3 ? [] : semua.filter((x) => norm(x.nama + ' ' + x.sekolah + ' ' + x.kota).includes(q)).slice(0, 20);
    $('#cari-hasil').innerHTML = hasil.map((x) => `<li><button type="button" data-kode="${esc(x.kode)}"><span><strong>${esc(x.nama)}</strong><small>${esc(x.sekolah)}${x.kota ? ' · ' + esc(x.kota) : ''}</small></span><span aria-hidden="true">›</span></button></li>`).join('')
      || (q.length >= 3 ? '<li class="small muted">Nama tidak ditemukan. Coba ketik sebagian nama atau nama sekolah, atau hubungi panitia.</li>' : '');
  }
  async function pilih(kode, gulir) {
    try {
      const d = await (await fetch(API + '?kode=' + encodeURIComponent(kode), {cache: 'no-cache', headers: {Accept: 'application/json'}})).json();
      if (!d.ok) { try { localStorage.removeItem(KUNCI); } catch (e) {} return; }
      saya = d.duta;
      try { localStorage.setItem(KUNCI, saya.kode); } catch (e) {}
      $('#v-saya').hidden = false; $('#v-cari').hidden = true;
      $('#saya-nama').textContent = saya.nama;
      $('#saya-sekolah').textContent = [saya.sekolah, saya.kota, saya.provinsi].filter(Boolean).join(' · ');
      $('#saya-warga').textContent = nf.format(saya.warga);
      $('#saya-peringkat').textContent = saya.peringkat ? '#' + saya.peringkat : '–';
      $('#saya-peringkat-sub').textContent = saya.peringkat ? `dari ${nf.format(d.totalDuta)} duta` : 'ajak 1 warga untuk masuk papan';
      $('#saya-link').value = linkDari(saya.kode);
      if (document.activeElement !== $('#kata')) $('#kata').value = saya.kata || '';
      if (!$('#kata-status').dataset.tetap) $('#kata-status').innerHTML = saya.kata ? `Kata-mu di plaza: <span class="kata-sekarang">${esc(saya.kata)}</span>` : 'Kamu belum menulis kata — karaktermu di plaza masih bertuliskan "duta".';
      $('#bagi-wa').href = 'https://wa.me/?text=' + encodeURIComponent(ajakan(saya));
      $('#bagi-native').hidden = !navigator.share;
      $('#saya-daftar').innerHTML = saya.terbaru.map((w) => `<li><span><strong>${esc(w.nama)}</strong> <small>${esc(w.provinsi)}</small></span><small>“${esc(w.kata)}”</small></li>`).join('')
        || '<li><span>Belum ada. Bagikan linkmu sekarang!</span></li>';
      $('#saya-perbarui').textContent = 'Diperbarui otomatis tiap 30 detik' + (saya.warga > saya.terbaru.length ? ` · menampilkan ${saya.terbaru.length} terbaru` : '') + '.';
      renderPapan();
      if (gulir) $('#v-saya').scrollIntoView({behavior: 'smooth', block: 'start'});
      clearTimeout(timer); timer = setTimeout(() => { muatDaftar(); pilih(saya.kode); }, 30000);
    } catch (e) { toast('Gagal memuat data duta. Coba lagi.'); }
  }

  const PESAN_KATA = {validation: 'Tulis satu kata saja (2–20 huruf, tanpa spasi/angka; tanda hubung boleh).', kata_ditolak: 'Kata itu tidak bisa dipakai. Coba kata lain yang positif.', terlalu_banyak: 'Terlalu sering diganti. Coba lagi besok.', tidak_ditemukan: 'Data duta tidak ditemukan.'};
  $('#f-kata').addEventListener('submit', async (e) => {
    e.preventDefault(); if (!saya) return;
    const kata = $('#kata').value.trim().toLowerCase(), st = $('#kata-status');
    if (!/^[a-z\u00c0-\u024f-]{2,20}$/.test(kata)) { st.textContent = PESAN_KATA.validation; return; }
    const b = $('#kata-simpan'); b.disabled = true;
    try {
      const d = await (await fetch(API, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({aksi: 'kata', kode: saya.kode, kata})})).json();
      if (!d.ok) { st.textContent = PESAN_KATA[d.error] || 'Gagal menyimpan. Coba lagi.'; return; }
      saya.kata = d.kata; st.dataset.tetap = '1';
      st.innerHTML = `Tersimpan! Kata-mu di plaza: <span class="kata-sekarang">${esc(d.kata)}</span> (tampil di festival dalam ±1 menit)`;
      setTimeout(() => { delete st.dataset.tetap; }, 8000);
      toast('Kata tersimpan!');
    } catch (err) { st.textContent = 'Koneksi bermasalah. Coba lagi.'; }
    finally { b.disabled = false; }
  });
  $('#kata').addEventListener('input', () => { $('#kata').value = $('#kata').value.toLowerCase().replace(/\s+/g, ''); });
  $('#cari').addEventListener('input', cari);
  $('#cari-hasil').addEventListener('click', (e) => { const b = e.target.closest('[data-kode]'); if (b) pilih(b.dataset.kode, true); });
  $('#salin').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('#saya-link').value); toast('Link ajakan disalin!'); }
    catch (e) { $('#saya-link').select(); document.execCommand && document.execCommand('copy'); toast('Link ajakan disalin.'); }
  });
  $('#bagi-native').addEventListener('click', async () => { try { await navigator.share({title: 'Festival Satu Kata YCS 2026', text: ajakan(saya), url: linkDari(saya.kode)}); } catch (e) {} });
  $('#ganti').addEventListener('click', () => { clearTimeout(timer); saya = null; try { localStorage.removeItem(KUNCI); } catch (e) {} $('#v-saya').hidden = true; $('#v-cari').hidden = false; $('#cari').value = ''; cari(); renderPapan(); $('#cari').focus(); });

  const qs = new URLSearchParams(location.search).get('kode');
  let tersimpan = ''; try { tersimpan = localStorage.getItem(KUNCI) || ''; } catch (e) {}
  muatDaftar().then(() => { if (qs || tersimpan) pilih(qs || tersimpan); });
})();
