const SPREADSHEET_ID = '1SKSCKrg_Laux39Xdu1_99tIv_NsgiJcASi27mnVe5ME';
const SHEET_NAME = 'Twibbon YCS 2026';
const HEADERS_LAMA = ['Waktu', 'ID permintaan', 'Nama', 'Sekolah', 'Email', 'Bingkai', 'Klik saluran WhatsApp', 'Persetujuan data', 'Sumber'];
const HEADERS = HEADERS_LAMA.concat(['Kota/Kabupaten', 'Provinsi']);
const REKAP_NAME = 'Rekap';
const REKAP_VERSI = '3';
const SKEMA_VERSI = '3';
const WIB = 7 * 3600 * 1000;

const TAB = {
  pengaturan: 'Pengaturan', live: 'Jadwal Live', finalis: 'Finalis', kode: 'Kode Wildcard',
  dana: 'Dana Kaget', survei: 'Survei', admin: 'Admin', log: 'Log Admin'
};
const KOLOM = {
  pengaturan: ['Kunci', 'Nilai', 'Keterangan'],
  live: ['Judul', 'Platform', 'Mulai (WIB)', 'Selesai (WIB)', 'Link', 'Link cadangan', 'Tampil'],
  finalis: ['Nama', 'Sekolah', 'Kota/Kabupaten', 'Provinsi', 'Jalur', 'Foto (URL)', 'Tampil'],
  kode: ['Kode', 'Email', 'Nama', 'Status', 'Berlaku hingga (WIB)', 'Waktu klaim', 'Percobaan salah', 'Catatan'],
  dana: ['Waktu', 'ID permintaan', 'Nama', 'Email', 'Nomor WhatsApp', 'Sekolah', 'Kota/Kabupaten', 'Provinsi', 'Sumber'],
  survei: ['Waktu', 'ID permintaan', 'Destinasi pilihan', 'Kegiatan favorit', 'Waktu ideal', 'Status', 'Provinsi', 'Destinasi impian lain', 'Email', 'Sumber'],
  log: ['Waktu', 'Aksi', 'Detail']
};
const STATUS_KODE = {belum: 'belum klaim', sudah: 'sudah klaim', hangus: 'hangus'};

// [kunci, nilai awal, keterangan]. Nilai disimpan sebagai teks; waktu ditulis "YYYY-MM-DD HH:mm" (WIB).
const PENGATURAN = [
  ['waktu_pengumuman', '2026-11-16 19:00', 'Countdown & reveal finalis. Data finalis baru bisa diambil setelah waktu ini (jam server).'],
  ['link_live', 'https://www.youtube.com/@universitasstekom/streams', 'Link live utama (tombol Tonton di beranda).'],
  ['link_live_cadangan', 'https://www.instagram.com/universitasstekom', 'Link live cadangan.'],
  ['pakai_link_cadangan', 'TIDAK', 'YA = semua tombol live memakai link cadangan (saat live utama bermasalah).'],
  ['nama_event', 'Event YCS berikutnya', 'Nama event untuk pemegang tiket wildcard.'],
  ['link_event', '', 'Kosong = tombol "Coming Soon". Isi link agar tombol berubah tanpa mengubah kode peserta.'],
  ['road_target', '100000', 'Target dukungan Road to Bali.'],
  ['road_tambahan', '0', 'Dukungan di luar twibbon web (mis. twibbon offline) yang ditambahkan ke progres.'],
  ['klaim_aktif', 'YA', 'YA/TIDAK. Halaman /klaim dibuka setelah waktu_pengumuman.'],
  ['klaim_berlaku_hingga', '2026-12-31 23:59', 'Batas umum masa berlaku kode wildcard (kolom per kode bisa lebih spesifik).'],
  ['survei_aktif', 'YA', 'YA/TIDAK.'],
  ['survei_buka', '', 'Kosong = dibuka bersamaan dengan waktu_pengumuman.'],
  ['dana_aktif', 'TIDAK', 'YA/TIDAK. Saklar form Dana Kaget.'],
  ['dana_kode_akses', '', 'Kode akses form Dana Kaget (dibagikan panitia). Kosong = dibuat otomatis.'],
  ['dana_kuota', '100', 'Jumlah maksimal pengajuan Dana Kaget.'],
  ['dana_tampilkan_sisa', 'YA', 'YA = tampilkan "Tersisa N" di halaman.'],
  ['dana_teks_tutup', 'Form akan dibuka saat panitia mengumumkannya lewat live dan saluran WhatsApp YCS. Simpan halaman ini, ya!', 'Teks saat form Dana Kaget belum dibuka / dinonaktifkan.'],
  ['dana_teks_habis', 'Kuota Dana Kaget kali ini sudah terpenuhi. Terima kasih sudah antusias! Pantau live YCS berikutnya, siapa tahu ada kesempatan lagi.', 'Teks saat kuota habis.'],
  ['dana_teks_sukses', 'Panitia akan menghubungimu lewat WhatsApp atau email. Pastikan nomormu aktif.', 'Teks setelah pengajuan berhasil.'],
  ['popup_aktif', 'TIDAK', 'YA = tampilkan pop-up informasi di beranda (sekali per isi; tampil lagi bila isinya diubah).'],
  ['popup_judul', '', 'Judul pop-up.'],
  ['popup_teks', '', 'Isi singkat pop-up.'],
  ['popup_gambar', '', 'Opsional: URL gambar https (rasio 16:9).'],
  ['popup_tombol', 'Lihat selengkapnya', 'Teks tombol.'],
  ['popup_link', '', 'Tujuan saat pop-up/tombol diklik: link https://, halaman situs (mis. /klaim/), atau bagian (#live).']
];
const KUNCI_YA_TIDAK = ['pakai_link_cadangan', 'klaim_aktif', 'survei_aktif', 'dana_aktif', 'dana_tampilkan_sisa', 'popup_aktif'];
const KUNCI_WAKTU = ['waktu_pengumuman', 'klaim_berlaku_hingga', 'survei_buka'];
const KUNCI_ANGKA = ['road_target', 'road_tambahan', 'dana_kuota'];
const LIVE_AWAL = [
  ['Kenalan dengan YCS & YCS Squad', 'Instagram', '2026-10-22 19:00', '2026-10-22 20:00', 'https://www.instagram.com/universitasstekom', '', 'YA'],
  ['Tips Lolos Penjurian & Persiapan ke Bali', 'TikTok', '2026-11-12 19:00', '2026-11-12 20:00', 'https://www.tiktok.com/@universitasstekom', '', 'YA'],
  ['Pengumuman 100 Finalis YCS 2026', 'YouTube', '2026-11-16 19:00', '2026-11-16 20:30', 'https://www.youtube.com/@universitasstekom/streams', 'https://www.instagram.com/universitasstekom', 'YA']
];
const SURVEI_DESTINASI = ['Bali', 'Lombok', 'Labuan Bajo', 'Yogyakarta', 'Raja Ampat', 'Danau Toba', 'Bromo', 'Belitung', 'Toraja', 'Bandung', 'Wakatobi'];
const SURVEI_KEGIATAN = ['Alam & petualangan', 'Budaya & sejarah', 'Edukasi & sains', 'Bakti sosial', 'Kuliner lokal', 'Kreatif (foto/video)'];
const SURVEI_WAKTU = ['Libur semester Desember', 'Libur kenaikan kelas', 'Akhir pekan panjang'];
const SURVEI_STATUS = ['Kelas 10', 'Kelas 11', 'Kelas 12', 'Guru/pendamping', 'Lainnya'];

/* ===================== Utilitas ===================== */

// Pemisah argumen rumus mengikuti lokal spreadsheet: lokal desimal-koma (mis. id_ID) memakai ';'.
function pemisah_(ss) {
  const lokal = ss.getSpreadsheetLocale() || 'en_US';
  return /^(en|ja|ko|zh|th|he|iw|hi|ms|fil|tl|sw|ur|bn|ta|te|ga|mt|cy|my|km|ne|si)(_|$)/.test(lokal) ? ',' : ';';
}
function rumus_(ss, teks) {
  const s = pemisah_(ss);
  // Ganti koma pemisah argumen saja; koma di dalam string "..." (teks QUERY) dibiarkan.
  return teks.replace(/("[^"]*")|,/g, (m, str) => str || s);
}
function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
function cleanCell_(value) {
  return /^[=+@-]/.test(value) ? "'" + value : value;
}
function teks_(v, maks) {
  return typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, maks) : '';
}
function emailValid_(e) {
  return e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}
// Waktu teks WIB ("2026-11-16 19:00", ISO, atau Date dari sel) → milidetik UTC.
function waktu_(v) {
  if (v instanceof Date) return v.getTime();
  let s = String(v == null ? '' : v).trim();
  if (!s) return NaN;
  s = s.replace(' ', 'T');
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += 'T00:00';
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(s)) s += '+07:00';
  return new Date(s).getTime();
}
function isoWib_(ms) {
  return new Date(ms + WIB).toISOString().slice(0, 19) + '+07:00';
}
function teksWib_(ms) {
  return new Date(ms + WIB).toISOString().slice(0, 16).replace('T', ' ');
}
function ya_(v) {
  return /^(ya|y|true|1|aktif|on)$/i.test(String(v).trim());
}
function hash_(s) {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s)));
}
function acak_(n) {
  const huruf = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  while (out.length < n) {
    const hex = Utilities.getUuid().replace(/-/g, '');
    for (let i = 0; i + 2 <= hex.length && out.length < n; i += 2) out += huruf[parseInt(hex.slice(i, i + 2), 16) % 32];
  }
  return out;
}
function ss_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}
function tab_(ss, kunci) {
  return ss.getSheetByName(TAB[kunci]) || buatTab_(ss, kunci);
}
function buatTab_(ss, kunci) {
  const sheet = ss.insertSheet(TAB[kunci]);
  const kol = KOLOM[kunci];
  if (kol) {
    sheet.getRange(1, 1, 1, kol.length).setValues([kol]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0E5A66').setWrap(true);
    sheet.setFrozenRows(1);
    sheet.getRange(2, 1, sheet.getMaxRows() - 1, kol.length).setNumberFormat('@');
  }
  return sheet;
}
function baris_(sheet, lebar) {
  const n = sheet.getLastRow() - 1;
  return n > 0 ? sheet.getRange(2, 1, n, lebar).getValues() : [];
}
function cache_() {
  return CacheService.getScriptCache();
}
function kunci_(lock, fn) {
  if (!lock.tryLock(15000)) return {ok: false, error: 'busy'};
  try { return fn(); } finally { lock.releaseLock(); }
}
// Batas percobaan gagal per perangkat dan per IP (hash dari proxy Vercel), jendela 1 jam.
function terblokir_(jenis, p, batas) {
  const c = cache_();
  return [p.perangkat, p.ipHash].filter(Boolean).some(id => Number(c.get('gagal:' + jenis + ':' + hash_(id)) || 0) >= batas);
}
function catatGagal_(jenis, p) {
  const c = cache_();
  [p.perangkat, p.ipHash].filter(Boolean).forEach(id => {
    const k = 'gagal:' + jenis + ':' + hash_(id);
    c.put(k, String(Number(c.get(k) || 0) + 1), 3600);
  });
}
function batasKirim_(jenis, p, batas) {
  const c = cache_();
  const id = p.ipHash || p.perangkat;
  if (!id) return false;
  const k = 'kirim:' + jenis + ':' + hash_(id);
  const n = Number(c.get(k) || 0);
  if (n >= batas) return true;
  c.put(k, String(n + 1), 3600);
  return false;
}

/* ===================== Sheet: setup ===================== */

// Jalankan sekali dari editor (pilih siapkanSheet → Jalankan) untuk memberi izin Google
// dan membangun semua tab. Aman dijalankan ulang; data yang ada tidak dihapus.
function siapkanSheet() {
  const ss = ss_();
  siapkanTabData_(ss);
  siapkanTabRekap_(ss);
  siapkanSkema_(ss);
  ss.setActiveSheet(ss.getSheetByName(REKAP_NAME));
  return 'Sheet siap: ' + SHEET_NAME + ', ' + REKAP_NAME + ', ' + Object.keys(TAB).map(k => TAB[k]).join(', ');
}
function onOpen() {
  SpreadsheetApp.getUi().createMenu('YCS 2026').addItem('Siapkan / rapikan sheet', 'siapkanSheet').addToUi();
}
function siapkanTabData_(ss) {
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME, 0);
  if (!sheet.getLastRow()) sheet.appendRow(HEADERS);
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    .setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0E5A66')
    .setVerticalAlignment('middle').setWrap(true);
  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 36);
  [150, 120, 200, 240, 240, 100, 120, 120, 110, 180, 160].forEach((w, i) => sheet.setColumnWidth(i + 1, w));
  sheet.getRange('A2:A').setNumberFormat('dd/mm/yyyy hh:mm');
  sheet.getRange('B:B').setFontColor('#6B7280');
  sheet.getRange('F2:I').setHorizontalAlignment('center');
  if (!sheet.getBandings().length) {
    sheet.getRange(1, 1, sheet.getMaxRows(), HEADERS.length)
      .applyRowBanding(SpreadsheetApp.BandingTheme.CYAN, true, false)
      .setHeaderRowColor('#0E5A66');
  }
  const filter = sheet.getFilter();
  if (filter && filter.getRange().getNumColumns() < HEADERS.length) filter.remove();
  if (!sheet.getFilter()) sheet.getRange(1, 1, sheet.getMaxRows(), HEADERS.length).createFilter();
  const desc = 'Header twibbon: jangan diubah, dipakai backend';
  sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE).filter(x => x.getDescription() === desc).forEach(x => x.remove());
  sheet.getRange(1, 1, 1, HEADERS.length).protect().setDescription(desc).setWarningOnly(true);
  return sheet;
}
function siapkanTabRekap_(ss) {
  const sheet = ss.getSheetByName(REKAP_NAME) || ss.insertSheet(REKAP_NAME, 0);
  const d = "'" + SHEET_NAME + "'!";
  sheet.clear();
  sheet.getRange('A1').setValue('Rekap Twibbon YCS 2026').setFontSize(16).setFontWeight('bold').setFontColor('#0E5A66');
  sheet.getRange('A2').setValue('Dihitung otomatis dari tab "' + SHEET_NAME + '". Jangan ketik di tab ini.').setFontColor('#6B7280');
  const stats = [
    ['Total twibbon dibuat', '=COUNTA(' + d + 'B2:B)'],
    ['Email unik', '=COUNTUNIQUE(' + d + 'E2:E)'],
    ['Sekolah unik', '=COUNTUNIQUE(' + d + 'D2:D)'],
    ['Hari ini', rumus_(ss, '=COUNTIFS(' + d + 'A2:A,">="&TODAY())')],
    ['Bingkai Delegasi', rumus_(ss, '=COUNTIF(' + d + 'F2:F,"delegasi")')],
    ['Bingkai YCS Squad', rumus_(ss, '=COUNTIF(' + d + 'F2:F,"squad")')]
  ];
  sheet.getRange(4, 1, stats.length, 1).setValues(stats.map(r => [r[0]]));
  sheet.getRange(4, 2, stats.length, 1).setFormulas(stats.map(r => [r[1]]));
  sheet.getRange(4, 1, stats.length, 1).setFontWeight('bold');
  sheet.getRange(4, 2, stats.length, 1).setFontSize(14).setFontWeight('bold').setFontColor('#C2410C').setHorizontalAlignment('left');
  const tabel = [
    ['A12:B12', 'Sekolah teratas', 'A13', "=IFERROR(QUERY(" + d + "D2:D,\"select D, count(D) where D <> '' group by D order by count(D) desc limit 30 label D 'Sekolah', count(D) 'Jumlah'\",0),\"Belum ada data\")"],
    ['D12:E12', 'Per hari', 'D13', "=IFERROR(QUERY(" + d + "A2:B,\"select toDate(A), count(B) where B is not null group by toDate(A) order by toDate(A) desc label toDate(A) 'Tanggal', count(B) 'Jumlah'\",0),\"Belum ada data\")"],
    ['G12:H12', 'Per sumber (?ref=)', 'G13', "=IFERROR(QUERY(" + d + "I2:I,\"select I, count(I) where I <> '' group by I order by count(I) desc label I 'Sumber', count(I) 'Jumlah'\",0),\"Belum ada data\")"],
    ['J12:K12', 'Per provinsi', 'J13', "=IFERROR(QUERY(" + d + "K2:K,\"select K, count(K) where K <> '' group by K order by count(K) desc label K 'Provinsi', count(K) 'Jumlah'\",0),\"Belum ada data\")"]
  ];
  tabel.forEach(t => {
    sheet.getRange(t[0]).setValues([[t[1], '']]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0E5A66');
    sheet.getRange(t[2]).setFormula(rumus_(ss, t[3]));
  });
  sheet.getRange('D14:D').setNumberFormat('dd/mm/yyyy');
  sheet.getRange('A13:K13').setFontWeight('bold');
  [260, 90, 24, 120, 90, 24, 160, 90, 24, 180, 90].forEach((w, i) => sheet.setColumnWidth(i + 1, w));
  sheet.setHiddenGridlines(true);
  PropertiesService.getScriptProperties().setProperty('rekap_versi', REKAP_VERSI);
  return sheet;
}
// Tab baru untuk fase pengumuman. Hanya menambah yang belum ada; isi lama tidak disentuh.
function siapkanSkema_(ss) {
  const props = PropertiesService.getScriptProperties();
  const peng = tab_(ss, 'pengaturan');
  const ada = baris_(peng, 1).map(r => String(r[0]));
  const tambah = PENGATURAN.filter(r => ada.indexOf(r[0]) < 0).map(r => r[0] === 'dana_kode_akses' ? [r[0], 'YCS-' + acak_(5), r[2]] : r);
  if (tambah.length) peng.getRange(peng.getLastRow() + 1, 1, tambah.length, 3).setNumberFormat('@').setValues(tambah);
  peng.setColumnWidth(1, 200); peng.setColumnWidth(2, 320); peng.setColumnWidth(3, 520);
  const live = tab_(ss, 'live');
  if (live.getLastRow() < 2 && !props.getProperty('live_diisi')) live.getRange(2, 1, LIVE_AWAL.length, 7).setNumberFormat('@').setValues(LIVE_AWAL);
  props.setProperty('live_diisi', '1');
  ['finalis', 'kode', 'dana', 'survei', 'log'].forEach(k => tab_(ss, k));
  if (!props.getProperty('ADMIN_HASH')) {
    const sandi = acak_(4) + '-' + acak_(4) + '-' + acak_(4);
    aturSandi_(sandi);
    const adm = ss.getSheetByName(TAB.admin) || ss.insertSheet(TAB.admin);
    adm.clear();
    adm.getRange('A1:B4').setValues([
      ['Panel admin', 'https://roadtrip-ycs2026.vercel.app/admin/'],
      ['Password awal', sandi],
      ['Dibuat', teksWib_(Date.now()) + ' WIB'],
      ['Catatan', 'Ganti password di panel admin (menu Keamanan), lalu hapus isi sel B2. Jangan bagikan tab ini.']
    ]);
    adm.getRange('A1:A4').setFontWeight('bold');
    adm.setColumnWidth(1, 160); adm.setColumnWidth(2, 520);
    adm.protect().setDescription('Rahasia admin YCS').setWarningOnly(true);
  }
  props.setProperty('skema_versi', SKEMA_VERSI);
  cache_().removeAll(['cfg', 'reveal', 'stats']);
}
function pastikanSkema_() {
  if (PropertiesService.getScriptProperties().getProperty('skema_versi') !== SKEMA_VERSI) siapkanSkema_(ss_());
}

/* ===================== Pengaturan & data publik ===================== */

function bacaPengaturan_() {
  const c = cache_();
  const simpan = c.get('cfg');
  if (simpan) return JSON.parse(simpan);
  const sheet = tab_(ss_(), 'pengaturan');
  const nilai = {};
  PENGATURAN.forEach(r => { nilai[r[0]] = r[1]; });
  baris_(sheet, 2).forEach(r => { if (r[0]) nilai[String(r[0]).trim()] = r[1] instanceof Date ? teksWib_(r[1].getTime()) : String(r[1]).trim(); });
  c.put('cfg', JSON.stringify(nilai), 20);
  return nilai;
}
function bacaLive_(cfg) {
  const cadangan = ya_(cfg.pakai_link_cadangan);
  return baris_(tab_(ss_(), 'live'), 7).filter(r => r[0] && (r[6] === '' || ya_(r[6]))).map(r => {
    const mulai = waktu_(r[2]), selesai = waktu_(r[3]);
    if (isNaN(mulai)) return null;
    const link = String(cadangan && r[5] ? r[5] : r[4] || cfg.link_live).trim();
    return {judul: String(r[0]), platform: String(r[1] || 'Live'), mulai: isoWib_(mulai), selesai: isoWib_(isNaN(selesai) ? mulai + 3600000 : selesai), link: link, cadangan: String(r[5] || '').trim()};
  }).filter(Boolean).sort((a, b) => a.mulai < b.mulai ? -1 : 1);
}
function hitungDana_(cfg, ss) {
  const kuota = Math.max(0, Number(cfg.dana_kuota) || 0);
  const terpakai = Math.max(0, tab_(ss || ss_(), 'dana').getLastRow() - 1);
  return {kuota: kuota, terpakai: terpakai, sisa: Math.max(0, kuota - terpakai)};
}
function konfigPublik_() {
  const cfg = bacaPengaturan_();
  const now = Date.now();
  const umum = waktu_(cfg.waktu_pengumuman);
  const surveiBuka = isNaN(waktu_(cfg.survei_buka)) ? umum : waktu_(cfg.survei_buka);
  const dana = hitungDana_(cfg);
  const danaAktif = ya_(cfg.dana_aktif);
  const cadangan = ya_(cfg.pakai_link_cadangan);
  return {
    ok: true, now: now,
    pengumuman: isNaN(umum) ? null : isoWib_(umum),
    fase: !isNaN(umum) && now >= umum ? 'pasca' : 'pra',
    linkLive: cadangan && cfg.link_live_cadangan ? cfg.link_live_cadangan : cfg.link_live,
    linkLiveCadangan: cfg.link_live_cadangan || '',
    live: bacaLive_(cfg),
    klaim: {aktif: ya_(cfg.klaim_aktif), buka: isNaN(umum) ? null : isoWib_(umum), berlaku: isNaN(waktu_(cfg.klaim_berlaku_hingga)) ? null : isoWib_(waktu_(cfg.klaim_berlaku_hingga))},
    survei: {aktif: ya_(cfg.survei_aktif), buka: isNaN(surveiBuka) ? null : isoWib_(surveiBuka)},
    dana: {aktif: danaAktif && dana.sisa > 0, saklar: danaAktif, penuh: dana.sisa <= 0, sisa: ya_(cfg.dana_tampilkan_sisa) ? dana.sisa : null, kuota: ya_(cfg.dana_tampilkan_sisa) ? dana.kuota : null,
      teksTutup: cfg.dana_teks_tutup || '', teksHabis: cfg.dana_teks_habis || '', teksSukses: cfg.dana_teks_sukses || ''},
    event: {nama: cfg.nama_event || '', link: cfg.link_event || ''},
    popup: ya_(cfg.popup_aktif) && cfg.popup_judul ? {aktif: true, judul: cfg.popup_judul, teks: cfg.popup_teks || '', gambar: cfg.popup_gambar || '', tombol: cfg.popup_tombol || '', link: cfg.popup_link || ''} : {aktif: false}
  };
}
function statistik_() {
  const c = cache_();
  const simpan = c.get('stats');
  if (simpan) return JSON.parse(simpan);
  const cfg = bacaPengaturan_();
  const sheet = ss_().getSheetByName(SHEET_NAME);
  const n = sheet ? sheet.getLastRow() - 1 : 0;
  const kota = {}, prov = {};
  if (n > 0 && sheet.getLastColumn() >= 11) {
    sheet.getRange(2, 10, n, 2).getValues().forEach(r => {
      const k = String(r[0]).trim(), p = String(r[1]).trim();
      if (k) kota[k] = (kota[k] || 0) + 1;
      if (p) prov[p] = (prov[p] || 0) + 1;
    });
  }
  const top = o => Object.keys(o).map(k => ({nama: k, jumlah: o[k]})).sort((a, b) => b.jumlah - a.jumlah).slice(0, 10);
  const out = {ok: true, road: {current: Math.max(0, n) + (Number(cfg.road_tambahan) || 0), target: Number(cfg.road_target) || 100000}, kota: top(kota), provinsi: top(prov), diperbarui: isoWib_(Date.now())};
  c.put('stats', JSON.stringify(out), 300);
  return out;
}
function urlFoto_(u) {
  u = String(u || '').trim();
  const m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{20,})/);
  return m ? 'https://lh3.googleusercontent.com/d/' + m[1] + '=w480' : (/^https:\/\//.test(u) ? u : '');
}
// Finalis hanya dikirim setelah waktu_pengumuman (jam server), walau endpoint dipanggil langsung.
function reveal_() {
  const cfg = bacaPengaturan_();
  const umum = waktu_(cfg.waktu_pengumuman);
  if (isNaN(umum) || Date.now() < umum) return {ok: false, error: 'belum_waktunya', buka: isNaN(umum) ? null : isoWib_(umum)};
  const c = cache_();
  const simpan = c.get('reveal');
  if (simpan) return JSON.parse(simpan);
  const finalis = baris_(tab_(ss_(), 'finalis'), 7).filter(r => r[0] && (r[6] === '' || ya_(r[6]))).map(r => ({
    nama: String(r[0]).trim(), sekolah: String(r[1]).trim(), kota: String(r[2]).trim(), provinsi: String(r[3]).trim(),
    jalur: /golden/i.test(r[4]) ? 'Golden Buzzer' : 'Seleksi Umum', foto: urlFoto_(r[5])
  }));
  const out = {ok: true, finalis: finalis, dirilis: isoWib_(umum)};
  c.put('reveal', JSON.stringify(out), 120);
  return out;
}

/* ===================== Klaim wildcard ===================== */

function cariKode_(sheet, kode) {
  if (sheet.getLastRow() < 2) return null;
  const f = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).createTextFinder(kode).matchEntireCell(true).matchCase(false).findNext();
  return f ? f.getRow() : null;
}
function samarkanEmail_(e) {
  const p = e.split('@');
  return p[0].slice(0, 2) + '•••@' + p[1];
}
function klaim_(p, verifikasi) {
  const cfg = bacaPengaturan_();
  const umum = waktu_(cfg.waktu_pengumuman);
  if (!ya_(cfg.klaim_aktif)) return {ok: false, error: 'nonaktif'};
  if (isNaN(umum) || Date.now() < umum) return {ok: false, error: 'belum_waktunya', buka: isNaN(umum) ? null : isoWib_(umum)};
  const kode = teks_(p.kode, 16).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const email = teks_(p.email, 254).toLowerCase();
  if (kode.length !== 8 || !emailValid_(email)) return {ok: false, error: 'validation'};
  if (terblokir_('klaim', p, 5)) return {ok: false, error: 'terlalu_banyak'};
  return kunci_(LockService.getScriptLock(), () => {
    const sheet = tab_(ss_(), 'kode');
    const row = cariKode_(sheet, kode);
    const data = row ? sheet.getRange(row, 1, 1, 8).getValues()[0] : null;
    if (!data || String(data[1]).trim().toLowerCase() !== email) {
      if (data) sheet.getRange(row, 7).setValue((Number(data[6]) || 0) + 1);
      catatGagal_('klaim', p);
      return {ok: false, error: 'tidak_cocok'};
    }
    const batasKode = waktu_(data[4]);
    const batas = isNaN(batasKode) ? waktu_(cfg.klaim_berlaku_hingga) : batasKode;
    let status = String(data[3]).trim().toLowerCase();
    const sudah = status === STATUS_KODE.sudah;
    if (!sudah && (status === STATUS_KODE.hangus || (!isNaN(batas) && Date.now() > batas))) {
      if (status !== STATUS_KODE.hangus) sheet.getRange(row, 4).setValue(STATUS_KODE.hangus);
      return {ok: false, error: 'hangus', berlaku: isNaN(batas) ? null : isoWib_(batas)};
    }
    const info = {ok: true, kode: kode, email: samarkanEmail_(email), nama: String(data[2] || '').trim().split(' ')[0], berlaku: isNaN(batas) ? null : isoWib_(batas), event: {nama: cfg.nama_event || '', link: cfg.link_event || ''}};
    const wk = waktu_(data[5]);
    if (sudah) return Object.assign(info, {status: 'sudah', waktuKlaim: isNaN(wk) ? null : isoWib_(wk)});
    if (!verifikasi) return Object.assign(info, {status: 'siap'});
    sheet.getRange(row, 4, 1, 3).setValues([[STATUS_KODE.sudah, teksWib_(Date.now()), data[6] || 0]]);
    return Object.assign(info, {status: 'aktif', waktuKlaim: isoWib_(Date.now())});
  });
}

/* ===================== Dana Kaget ===================== */

function danaAkses_(p, cfg) {
  const kode = teks_(p.kodeAkses, 40).toUpperCase();
  if (terblokir_('dana', p, 10)) return {ok: false, error: 'terlalu_banyak'};
  if (!kode || kode !== String(cfg.dana_kode_akses || '').trim().toUpperCase()) { catatGagal_('dana', p); return {ok: false, error: 'kode_salah'}; }
  return null;
}
function dana_(p) {
  const cfg = bacaPengaturan_();
  if (!ya_(cfg.dana_aktif)) return {ok: false, error: 'nonaktif'};
  const salah = danaAkses_(p, cfg);
  if (salah) return salah;
  if (p.aksi === 'dana-akses') {
    const d = hitungDana_(cfg);
    return d.sisa > 0 ? {ok: true, sisa: ya_(cfg.dana_tampilkan_sisa) ? d.sisa : null} : {ok: false, error: 'habis'};
  }
  const nama = teks_(p.nama, 60), email = teks_(p.email, 254).toLowerCase(), sekolah = teks_(p.sekolah, 100);
  const wa = teks_(p.wa, 20).replace(/[^0-9]/g, '').replace(/^62/, '0');
  const kota = teks_(p.kota, 80), prov = teks_(p.provinsi, 40), ref = teks_(p.ref, 40).replace(/[^\w-]/g, '');
  if (nama.length < 2 || !emailValid_(email) || !/^08\d{8,12}$/.test(wa) || sekolah.length < 2 || !kota || !prov || !/^[a-f0-9-]{36}$/i.test(p.requestId || '') || p.consent !== true || p.website) return {ok: false, error: 'validation'};
  return kunci_(LockService.getScriptLock(), () => {
    const ss = ss_();
    const sheet = tab_(ss, 'dana');
    const rows = baris_(sheet, 5);
    const lama = rows.find(r => r[1] === p.requestId);
    if (lama) return {ok: true, duplicate: true};
    if (rows.some(r => String(r[3]).toLowerCase() === email || String(r[4]).replace(/^'/, '') === wa)) return {ok: false, error: 'sudah_mengajukan'};
    // Sisa dihitung ulang di dalam lock: pengajuan bersamaan tidak bisa melewati kuota.
    const d = hitungDana_(cfg, ss);
    if (d.sisa <= 0) return {ok: false, error: 'habis'};
    sheet.appendRow([teksWib_(Date.now()), p.requestId, cleanCell_(nama), cleanCell_(email), "'" + wa, cleanCell_(sekolah), cleanCell_(kota), cleanCell_(prov), ref || 'web']);
    SpreadsheetApp.flush();
    return {ok: true, sisa: ya_(cfg.dana_tampilkan_sisa) ? d.sisa - 1 : null};
  });
}

/* ===================== Survei ===================== */

function pilihan_(v, daftar, maks) {
  const arr = (Array.isArray(v) ? v : [v]).filter(x => daftar.indexOf(x) >= 0);
  return arr.filter((x, i) => arr.indexOf(x) === i).slice(0, maks);
}
function survei_(p) {
  const cfg = bacaPengaturan_();
  const buka = isNaN(waktu_(cfg.survei_buka)) ? waktu_(cfg.waktu_pengumuman) : waktu_(cfg.survei_buka);
  if (!ya_(cfg.survei_aktif)) return {ok: false, error: 'nonaktif'};
  if (!isNaN(buka) && Date.now() < buka) return {ok: false, error: 'belum_waktunya', buka: isoWib_(buka)};
  const dest = pilihan_(p.destinasi, SURVEI_DESTINASI, 3), keg = pilihan_(p.kegiatan, SURVEI_KEGIATAN, 2);
  const kapan = pilihan_(p.waktu, SURVEI_WAKTU, 1), status = pilihan_(p.status, SURVEI_STATUS, 1);
  const prov = teks_(p.provinsi, 40), impian = teks_(p.impian, 80), email = teks_(p.email, 254).toLowerCase();
  const ref = teks_(p.ref, 40).replace(/[^\w-]/g, '');
  if (!dest.length || !keg.length || !kapan.length || !status.length || !prov || (email && !emailValid_(email)) || !/^[a-f0-9-]{36}$/i.test(p.requestId || '') || p.website) return {ok: false, error: 'validation'};
  if (batasKirim_('survei', p, 5)) return {ok: false, error: 'terlalu_banyak'};
  return kunci_(LockService.getScriptLock(), () => {
    const sheet = tab_(ss_(), 'survei');
    if (sheet.getLastRow() > 1 && sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).createTextFinder(p.requestId).matchEntireCell(true).findNext()) return {ok: true, duplicate: true};
    sheet.appendRow([teksWib_(Date.now()), p.requestId, dest.join(', '), keg.join(', '), kapan[0], status[0], cleanCell_(prov), cleanCell_(impian), cleanCell_(email), ref || 'web']);
    return {ok: true};
  });
}

/* ===================== Admin ===================== */

function aturSandi_(sandi) {
  const garam = Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty('ADMIN_HASH', garam + ':' + regangkan_(garam, sandi));
}
function regangkan_(garam, sandi) {
  let h = garam + sandi;
  for (let i = 0; i < 300; i++) h = hash_(h + garam);
  return h;
}
function cekSandi_(sandi) {
  const simpan = PropertiesService.getScriptProperties().getProperty('ADMIN_HASH') || '';
  const i = simpan.indexOf(':');
  return i > 0 && typeof sandi === 'string' && sandi.length >= 8 && regangkan_(simpan.slice(0, i), sandi) === simpan.slice(i + 1);
}
function logAdmin_(aksi, detail) {
  try { tab_(ss_(), 'log').appendRow([teksWib_(Date.now()), aksi, String(detail || '').slice(0, 500)]); } catch (e) { console.error(e.message); }
}
const EKSPOR = {
  twibbon: () => [SHEET_NAME, HEADERS.length],
  kode: () => [TAB.kode, KOLOM.kode.length],
  dana: () => [TAB.dana, KOLOM.dana.length],
  survei: () => [TAB.survei, KOLOM.survei.length],
  finalis: () => [TAB.finalis, KOLOM.finalis.length]
};
function hitungStatus_(ss) {
  const kode = {total: 0, belum: 0, sudah: 0, hangus: 0};
  baris_(tab_(ss, 'kode'), 4).forEach(r => {
    if (!r[0]) return;
    kode.total++;
    const s = String(r[3]).toLowerCase();
    if (s === STATUS_KODE.sudah) kode.sudah++; else if (s === STATUS_KODE.hangus) kode.hangus++; else kode.belum++;
  });
  return kode;
}
function ringkasanAdmin_() {
  const ss = ss_();
  const cfg = bacaPengaturan_();
  const tw = ss.getSheetByName(SHEET_NAME);
  const n = tw ? tw.getLastRow() - 1 : 0;
  const sumber = {};
  let hariIni = 0;
  const awalHari = Math.floor((Date.now() + WIB) / 86400000) * 86400000 - WIB;
  if (n > 0) {
    tw.getRange(2, 1, n, 9).getValues().forEach(r => {
      const s = String(r[8] || '(tanpa sumber)');
      sumber[s] = (sumber[s] || 0) + 1;
      if (r[0] instanceof Date && r[0].getTime() >= awalHari) hariIni++;
    });
  }
  return {
    twibbon: {total: Math.max(0, n), hariIni: hariIni, sumber: Object.keys(sumber).map(k => ({nama: k, jumlah: sumber[k]})).sort((a, b) => b.jumlah - a.jumlah).slice(0, 15)},
    klaim: hitungStatus_(ss),
    dana: hitungDana_(cfg, ss),
    survei: Math.max(0, tab_(ss, 'survei').getLastRow() - 1),
    finalis: baris_(tab_(ss, 'finalis'), 1).filter(r => r[0]).length
  };
}
function impor_(p) {
  const jenis = p.jenis, baris = Array.isArray(p.baris) ? p.baris : [];
  if (['finalis', 'kode'].indexOf(jenis) < 0 || baris.length < 2 || baris.length > 5001) return {ok: false, error: 'validation'};
  const kepala = baris[0].map(h => String(h).trim().toLowerCase());
  const kol = nama => kepala.findIndex(h => nama.some(n => h.indexOf(n) === 0));
  const ss = ss_();
  const sheet = tab_(ss, jenis);
  const lebar = KOLOM[jenis].length;
  let isi;
  if (jenis === 'finalis') {
    const i = {nama: kol(['nama']), sekolah: kol(['sekolah', 'asal']), kota: kol(['kota', 'kab', 'daerah']), prov: kol(['prov']), jalur: kol(['jalur']), foto: kol(['foto', 'gambar', 'url'])};
    if (i.nama < 0) return {ok: false, error: 'kolom_nama'};
    isi = baris.slice(1).filter(r => teks_(String(r[i.nama] || ''), 80)).map(r => {
      const g = k => i[k] < 0 ? '' : cleanCell_(teks_(String(r[i[k]] || ''), 300));
      return [g('nama'), g('sekolah'), g('kota'), g('prov'), /golden/i.test(g('jalur')) ? 'Golden Buzzer' : 'Seleksi Umum', g('foto'), 'YA'];
    });
  } else {
    const i = {kode: kol(['kode']), email: kol(['email', 'e-mail', 'surel']), nama: kol(['nama']), berlaku: kol(['berlaku', 'kedaluwarsa', 'expired'])};
    if (i.email < 0) return {ok: false, error: 'kolom_email'};
    const lama = {};
    baris_(sheet, 2).forEach(r => { lama[String(r[0]).toUpperCase()] = 1; lama['@' + String(r[1]).toLowerCase()] = 1; });
    isi = [];
    baris.slice(1).forEach(r => {
      const email = teks_(String(r[i.email] || ''), 254).toLowerCase();
      if (!emailValid_(email) || (p.mode !== 'ganti' && lama['@' + email])) return;
      let kode = i.kode < 0 ? '' : teks_(String(r[i.kode] || ''), 16).toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (kode.length !== 8 || lama[kode]) { do { kode = acak_(8); } while (lama[kode]); }
      lama[kode] = 1; lama['@' + email] = 1;
      const berlaku = i.berlaku < 0 ? NaN : waktu_(r[i.berlaku]);
      isi.push([kode, email, i.nama < 0 ? '' : cleanCell_(teks_(String(r[i.nama] || ''), 80)), STATUS_KODE.belum, isNaN(berlaku) ? '' : teksWib_(berlaku), '', 0, '']);
    });
  }
  return kunci_(LockService.getScriptLock(), () => {
    if (p.mode === 'ganti' && sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, lebar).clearContent();
    if (isi.length) sheet.getRange(sheet.getLastRow() + 1, 1, isi.length, lebar).setNumberFormat('@').setValues(isi);
    cache_().remove('reveal');
    logAdmin_('impor ' + jenis, (p.mode === 'ganti' ? 'ganti, ' : 'tambah, ') + isi.length + ' baris');
    return {ok: true, jumlah: isi.length, dilewati: baris.length - 1 - isi.length};
  });
}
function admin_(p) {
  const c = cache_();
  if (p.aksi === 'admin-login') {
    if (Number(c.get('admin:gagal') || 0) >= 10) return {ok: false, error: 'terlalu_banyak'};
    if (!cekSandi_(p.sandi)) { c.put('admin:gagal', String(Number(c.get('admin:gagal') || 0) + 1), 900); return {ok: false, error: 'sandi_salah'}; }
    const token = Utilities.getUuid() + Utilities.getUuid();
    c.put('adm:' + hash_(token), '1', 21600);
    logAdmin_('login', '');
    return {ok: true, token: token, berlakuDetik: 21600};
  }
  if (typeof p.token !== 'string' || p.token.length < 40 || !c.get('adm:' + hash_(p.token))) return {ok: false, error: 'sesi_habis'};
  const ss = ss_();
  switch (p.aksi) {
    case 'admin-data': {
      const cfg = bacaPengaturan_();
      return {ok: true, pengaturan: PENGATURAN.map(r => ({kunci: r[0], nilai: cfg[r[0]] == null ? '' : cfg[r[0]], keterangan: r[2]})),
        live: baris_(tab_(ss, 'live'), 7).map(r => r.map(v => v instanceof Date ? teksWib_(v.getTime()) : String(v))),
        ringkasan: ringkasanAdmin_(), sekarang: isoWib_(Date.now())};
    }
    case 'admin-simpan-pengaturan': {
      const nilai = p.nilai || {};
      const sheet = tab_(ss, 'pengaturan');
      const rows = baris_(sheet, 2);
      const salah = [];
      Object.keys(nilai).forEach(k => {
        if (!PENGATURAN.some(r => r[0] === k)) return;
        let v = teks_(String(nilai[k]), 500);
        if (KUNCI_YA_TIDAK.indexOf(k) >= 0) v = ya_(v) ? 'YA' : 'TIDAK';
        if (KUNCI_WAKTU.indexOf(k) >= 0 && v) { const t = waktu_(v); if (isNaN(t)) { salah.push(k); return; } v = teksWib_(t); }
        if (KUNCI_ANGKA.indexOf(k) >= 0) { if (!/^\d{1,9}$/.test(v)) { salah.push(k); return; } }
        if (/^link/.test(k) && v && !/^https:\/\/\S+$/.test(v)) { salah.push(k); return; }
        if (k === 'popup_gambar' && v && !/^https:\/\/\S+$/.test(v)) { salah.push(k); return; }
        if (k === 'popup_link' && v && !/^(https:\/\/\S+|\/[\w\-\/?=&#.%]*|#[\w-]+)$/.test(v)) { salah.push(k); return; }
        const i = rows.findIndex(r => r[0] === k);
        if (i >= 0) sheet.getRange(i + 2, 2).setNumberFormat('@').setValue(v);
        else sheet.appendRow([k, v, '']);
      });
      if (salah.length) return {ok: false, error: 'nilai_tidak_valid', kunci: salah};
      c.removeAll(['cfg', 'reveal', 'stats']);
      logAdmin_('simpan pengaturan', Object.keys(nilai).filter(k => k !== 'dana_kode_akses').join(', '));
      return {ok: true};
    }
    case 'admin-simpan-live': {
      const rows = (Array.isArray(p.baris) ? p.baris : []).slice(0, 50).map(r => [
        teks_(String(r[0] || ''), 120), teks_(String(r[1] || ''), 30), r[2], r[3], teks_(String(r[4] || ''), 300), teks_(String(r[5] || ''), 300), ya_(r[6]) ? 'YA' : 'TIDAK'
      ]).filter(r => r[0]);
      for (const r of rows) {
        const m = waktu_(r[2]), s = waktu_(r[3]);
        if (isNaN(m) || isNaN(s) || s <= m || (r[4] && !/^https:\/\//.test(r[4])) || (r[5] && !/^https:\/\//.test(r[5]))) return {ok: false, error: 'baris_tidak_valid', judul: r[0]};
        r[2] = teksWib_(m); r[3] = teksWib_(s);
      }
      const sheet = tab_(ss, 'live');
      return kunci_(LockService.getScriptLock(), () => {
        if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).clearContent();
        if (rows.length) sheet.getRange(2, 1, rows.length, 7).setNumberFormat('@').setValues(rows.map(r => r.map(cleanCell_)));
        c.remove('cfg');
        logAdmin_('simpan jadwal live', rows.length + ' baris');
        return {ok: true};
      });
    }
    case 'admin-impor': return impor_(p);
    case 'admin-ekspor': {
      const e = EKSPOR[p.jenis];
      if (!e) return {ok: false, error: 'validation'};
      const info = e();
      const sheet = ss.getSheetByName(info[0]);
      if (!sheet) return {ok: true, header: [], baris: [], total: 0};
      const total = Math.max(0, sheet.getLastRow() - 1);
      const dari = Math.max(0, Number(p.dari) || 0), jumlah = Math.min(4000, total - dari);
      const header = sheet.getRange(1, 1, 1, info[1]).getDisplayValues()[0];
      const isi = jumlah > 0 ? sheet.getRange(2 + dari, 1, jumlah, info[1]).getDisplayValues() : [];
      if (dari === 0) logAdmin_('ekspor ' + p.jenis, total + ' baris');
      return {ok: true, header: header, baris: isi, total: total, berikutnya: dari + jumlah < total ? dari + jumlah : null};
    }
    case 'admin-ganti-sandi': {
      if (!cekSandi_(p.sandi)) return {ok: false, error: 'sandi_salah'};
      if (typeof p.sandiBaru !== 'string' || p.sandiBaru.length < 10 || p.sandiBaru.length > 100) return {ok: false, error: 'sandi_lemah'};
      aturSandi_(p.sandiBaru);
      const adm = ss.getSheetByName(TAB.admin);
      if (adm) adm.getRange('B2').setValue('(sudah diganti ' + teksWib_(Date.now()) + ' WIB)');
      logAdmin_('ganti password', '');
      return {ok: true};
    }
    case 'admin-keluar':
      c.remove('adm:' + hash_(p.token));
      return {ok: true};
  }
  return {ok: false, error: 'aksi_tidak_dikenal'};
}

/* ===================== Router ===================== */

function doGet(e) {
  const aksi = e && e.parameter ? e.parameter.aksi : '';
  try {
    if (aksi === 'config') { pastikanSkema_(); return json_(konfigPublik_()); }
    if (aksi === 'stats') { pastikanSkema_(); return json_(statistik_()); }
    if (aksi === 'reveal') { pastikanSkema_(); return json_(reveal_()); }
    if (aksi === 'siapkan') { pastikanSkema_(); return json_({ok: true, skema: SKEMA_VERSI}); }
    // ?aksi=perbarui-rekap membangun ulang tab Rekap sekali per versi kode (aman dipanggil publik).
    if (aksi === 'perbarui-rekap') {
      const ss = ss_();
      const perlu = PropertiesService.getScriptProperties().getProperty('rekap_versi') !== REKAP_VERSI;
      if (perlu) { siapkanTabData_(ss); siapkanTabRekap_(ss); }
      SpreadsheetApp.flush();
      const nilai = ss.getSheetByName(REKAP_NAME).getRange('B4:B9').getDisplayValues().map(r => r[0]);
      const atas = ss.getSheetByName(REKAP_NAME).getRange('A13:K13').getDisplayValues()[0];
      return json_({ok: true, dibangunUlang: perlu, lokal: ss.getSpreadsheetLocale(), adaError: nilai.concat(atas).some(v => /^#/.test(v))});
    }
  } catch (err) {
    console.error('GET ' + aksi + ' gagal: ' + err.message);
    return json_({ok: false, error: 'server'});
  }
  return json_({ok: true, service: 'YCS 2026'});
}
function doPost(e) {
  try {
    if (!e || !e.postData || e.postData.contents.length > 600000) return json_({ok: false, error: 'invalid_request'});
    const p = JSON.parse(e.postData.contents);
    const aksi = typeof p.aksi === 'string' ? p.aksi : 'twibbon';
    if (aksi !== 'twibbon') pastikanSkema_();
    if (aksi !== 'admin-impor' && e.postData.contents.length > 8192) return json_({ok: false, error: 'invalid_request'});
    if (aksi === 'twibbon') return json_(twibbon_(p));
    if (aksi === 'klaim-cek') return json_(klaim_(p, false));
    if (aksi === 'klaim-verifikasi') return json_(klaim_(p, true));
    if (aksi === 'dana-akses' || aksi === 'dana-kirim') return json_(dana_(p));
    if (aksi === 'survei-kirim') return json_(survei_(p));
    if (aksi.indexOf('admin-') === 0) return json_(admin_(p));
    return json_({ok: false, error: 'aksi_tidak_dikenal'});
  } catch (err) {
    console.error('POST gagal: ' + err.message);
    return json_({ok: false, error: 'save_failed'});
  }
}

/* ===================== Twibbon ===================== */

function twibbon_(p) {
  let lock;
  try {
    const name = typeof p.name === 'string' ? p.name.trim() : '';
    const school = typeof p.school === 'string' ? p.school.trim() : '';
    const email = typeof p.email === 'string' ? p.email.trim().toLowerCase() : '';
    const city = teks_(p.city, 80), province = teks_(p.province, 40);
    const ref = teks_(p.ref, 40).replace(/[^\w-]/g, '');
    if (name.length < 2 || name.length > 60 || school.length < 2 || school.length > 100 || !emailValid_(email) || !/^[a-f0-9-]{36}$/i.test(p.requestId || '') || !['delegasi', 'squad'].includes(p.frame) || p.channelClicked !== true || p.consent !== true || p.website) {
      return {ok: false, error: 'validation'};
    }
    lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return {ok: false, error: 'busy'};
    const ss = ss_();
    const sheet = ss.getSheetByName(SHEET_NAME) || siapkanTabData_(ss);
    if (!sheet.getLastRow()) { sheet.appendRow(HEADERS); sheet.setFrozenRows(1); }
    const kepala = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
    if (kepala.join('|') !== HEADERS.join('|')) {
      // Migrasi otomatis dari skema lama (9 kolom) ke skema dengan Kota/Kabupaten & Provinsi.
      if (kepala.slice(0, HEADERS_LAMA.length).join('|') !== HEADERS_LAMA.join('|')) return {ok: false, error: 'sheet_schema'};
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    }
    const last = sheet.getLastRow();
    if (last > 1) {
      const found = sheet.getRange(2, 2, last - 1, 1).createTextFinder(p.requestId).matchEntireCell(true).findNext();
      if (found) {
        const row = sheet.getRange(found.getRow(), 3, 1, 4).getValues()[0];
        if (row.join('|') !== [cleanCell_(name), cleanCell_(school), cleanCell_(email), p.frame].join('|')) return {ok: false, error: 'request_conflict'};
        return {ok: true, requestId: p.requestId, duplicate: true};
      }
    }
    // Batasi kiriman per email tanpa membuat email atau data peserta dapat dibaca publik.
    const cache = cache_();
    const key = hash_(email);
    const count = Number(cache.get(key) || 0);
    if (count >= 5) return {ok: false, error: 'rate_limit'};
    sheet.appendRow([new Date(), p.requestId, cleanCell_(name), cleanCell_(school), cleanCell_(email), p.frame, 'Ya', 'Ya', ref || 'web-ycs2026', cleanCell_(city), cleanCell_(province)]);
    SpreadsheetApp.flush();
    cache.put(key, String(count + 1), 3600);
    return {ok: true, requestId: p.requestId};
  } catch (err) {
    console.error('Twibbon save failed: ' + err.message);
    return {ok: false, error: 'save_failed'};
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}
