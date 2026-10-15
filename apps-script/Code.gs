const SPREADSHEET_ID = '1SKSCKrg_Laux39Xdu1_99tIv_NsgiJcASi27mnVe5ME';
const SHEET_NAME = 'Twibbon YCS 2026';
const HEADERS = ['Waktu', 'ID permintaan', 'Nama', 'Sekolah', 'Email', 'Bingkai', 'Klik saluran WhatsApp', 'Persetujuan data', 'Sumber'];
const REKAP_NAME = 'Rekap';

// Jalankan sekali dari editor (pilih siapkanSheet → Jalankan) untuk memberi izin Google
// dan membangun tab data + rekap. Aman dijalankan ulang; data yang ada tidak dihapus.
function siapkanSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  siapkanTabData_(ss);
  siapkanTabRekap_(ss);
  ss.setActiveSheet(ss.getSheetByName(REKAP_NAME));
  return 'Sheet siap: ' + SHEET_NAME + ' + ' + REKAP_NAME;
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
  [150, 120, 200, 240, 240, 100, 120, 120, 110].forEach((w, i) => sheet.setColumnWidth(i + 1, w));
  sheet.getRange('A2:A').setNumberFormat('dd/mm/yyyy hh:mm');
  sheet.getRange('B:B').setFontColor('#6B7280');
  sheet.getRange('F2:I').setHorizontalAlignment('center');
  if (!sheet.getBandings().length) {
    sheet.getRange(1, 1, sheet.getMaxRows(), HEADERS.length)
      .applyRowBanding(SpreadsheetApp.BandingTheme.CYAN, true, false)
      .setHeaderRowColor('#0E5A66');
  }
  if (!sheet.getFilter()) sheet.getRange(1, 1, sheet.getMaxRows(), HEADERS.length).createFilter();
  const desc = 'Header twibbon: jangan diubah, dipakai backend';
  if (!sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE).some(x => x.getDescription() === desc)) {
    sheet.getRange(1, 1, 1, HEADERS.length).protect().setDescription(desc).setWarningOnly(true);
  }
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
    ['Hari ini', '=COUNTIFS(' + d + 'A2:A,">="&TODAY())'],
    ['Bingkai Delegasi', '=COUNTIF(' + d + 'F2:F,"delegasi")'],
    ['Bingkai YCS Squad', '=COUNTIF(' + d + 'F2:F,"squad")']
  ];
  sheet.getRange(4, 1, stats.length, 2).setValues(stats);
  sheet.getRange(4, 1, stats.length, 1).setFontWeight('bold');
  sheet.getRange(4, 2, stats.length, 1).setFontSize(14).setFontWeight('bold').setFontColor('#C2410C').setHorizontalAlignment('left');
  sheet.getRange('A12:B12').setValues([['Sekolah teratas', '']]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0E5A66');
  sheet.getRange('A13').setFormula('=IFERROR(QUERY(' + d + 'D2:D,"select D, count(D) where D <> \'\' group by D order by count(D) desc limit 30 label D \'Sekolah\', count(D) \'Jumlah\'",0),"Belum ada data")');
  sheet.getRange('D12:E12').setValues([['Per hari', '']]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0E5A66');
  sheet.getRange('D13').setFormula('=IFERROR(QUERY(' + d + 'A2:B,"select toDate(A), count(B) where B is not null group by toDate(A) order by toDate(A) desc label toDate(A) \'Tanggal\', count(B) \'Jumlah\'",0),"Belum ada data")');
  sheet.getRange('D14:D').setNumberFormat('dd/mm/yyyy');
  sheet.getRange('A13:E13').setFontWeight('bold');
  sheet.setColumnWidth(1, 260); sheet.setColumnWidth(2, 90); sheet.setColumnWidth(3, 24); sheet.setColumnWidth(4, 120); sheet.setColumnWidth(5, 90);
  sheet.setHiddenGridlines(true);
  return sheet;
}

function doGet() {
  return json_({ok: true, service: 'YCS 2026 Twibbon'});
}
function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
function cleanCell_(value) {
  return /^[=+@-]/.test(value) ? "'" + value : value;
}
function doPost(e) {
  let lock;
  try {
    if (!e || !e.postData || e.postData.contents.length > 4096) return json_({ok: false, error: 'invalid_request'});
    const p = JSON.parse(e.postData.contents);
    const name = typeof p.name === 'string' ? p.name.trim() : '';
    const school = typeof p.school === 'string' ? p.school.trim() : '';
    const email = typeof p.email === 'string' ? p.email.trim().toLowerCase() : '';
    if (name.length < 2 || name.length > 60 || school.length < 2 || school.length > 100 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !/^[a-f0-9-]{36}$/i.test(p.requestId || '') || !['delegasi', 'squad'].includes(p.frame) || p.channelClicked !== true || p.consent !== true || p.website) {
      return json_({ok: false, error: 'validation'});
    }
    lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return json_({ok: false, error: 'busy'});
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME) || siapkanTabData_(ss);
    if (!sheet.getLastRow()) { sheet.appendRow(HEADERS); sheet.setFrozenRows(1); }
    if (sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0].join('|') !== HEADERS.join('|')) return json_({ok: false, error: 'sheet_schema'});
    const last = sheet.getLastRow();
    if (last > 1) {
      const found = sheet.getRange(2, 2, last - 1, 1).createTextFinder(p.requestId).matchEntireCell(true).findNext();
      if (found) {
        const row = sheet.getRange(found.getRow(), 3, 1, 4).getValues()[0];
        if (row.join('|') !== [cleanCell_(name), cleanCell_(school), cleanCell_(email), p.frame].join('|')) return json_({ok: false, error: 'request_conflict'});
        return json_({ok: true, requestId: p.requestId, duplicate: true});
      }
    }
    // Batasi kiriman per email tanpa membuat email atau data peserta dapat dibaca publik.
    const cache = CacheService.getScriptCache();
    const key = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, email));
    const count = Number(cache.get(key) || 0);
    if (count >= 5) return json_({ok: false, error: 'rate_limit'});
    sheet.appendRow([new Date(), p.requestId, cleanCell_(name), cleanCell_(school), cleanCell_(email), p.frame, 'Ya', 'Ya', 'web-ycs2026']);
    SpreadsheetApp.flush();
    cache.put(key, String(count + 1), 3600);
    return json_({ok: true, requestId: p.requestId});
  } catch (err) {
    console.error('Twibbon save failed: ' + err.message);
    return json_({ok: false, error: 'save_failed'});
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}
