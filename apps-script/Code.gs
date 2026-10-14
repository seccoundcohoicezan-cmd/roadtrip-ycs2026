const SPREADSHEET_ID = '1SKSCKrg_Laux39Xdu1_99tIv_NsgiJcASi27mnVe5ME';
const SHEET_NAME = 'Twibbon YCS 2026';
const HEADERS = ['Waktu', 'ID permintaan', 'Nama', 'Sekolah', 'Email', 'Bingkai', 'Klik saluran WhatsApp', 'Persetujuan data', 'Sumber'];

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
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME) || SpreadsheetApp.openById(SPREADSHEET_ID).insertSheet(SHEET_NAME);
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
    sheet.appendRow([new Date(), p.requestId, cleanCell_(name), cleanCell_(school), cleanCell_(email), p.frame, true, true, 'web-ycs2026']);
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
