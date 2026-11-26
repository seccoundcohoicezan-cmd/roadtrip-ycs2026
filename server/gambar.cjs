// Gambar pop-up yang diunggah admin. Disimpan terpisah dari primer.json (berkas besar tidak ikut ditulis ulang tiap ada
// perubahan state) dan tidak masuk Google Sheet (batas 50.000 karakter per sel). Tanpa DATA_DIR (uji) → di memori.
// URL publik: /api/popup-gambar?v=<hash>; v berubah tiap gambar baru, jadi aman di-cache lama oleh browser/CDN.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const MAKS_BYTE = 400 * 1024;
const POLA = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;

function buatGambar(dataDir) {
  const file = dataDir ? path.join(dataDir, 'popup-gambar.json') : null;
  let isi = null; // {v, mime, b64}
  if (file) { try { isi = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { isi = null; } }

  function simpan(dataUrl) {
    const m = POLA.exec(String(dataUrl || ''));
    if (!m) return {ok: false, error: 'gambar_tidak_valid'};
    const buf = Buffer.from(m[2], 'base64');
    if (!buf.length || buf.length > MAKS_BYTE) return {ok: false, error: 'gambar_terlalu_besar'};
    const v = crypto.createHash('sha256').update(buf).digest('base64url').slice(0, 16);
    isi = {v, mime: 'image/' + m[1], b64: buf.toString('base64')};
    if (file) { fs.writeFileSync(file + '.tmp', JSON.stringify(isi)); fs.renameSync(file + '.tmp', file); }
    return {ok: true, url: '/api/popup-gambar?v=' + v};
  }
  // Versi lama tetap dilayani gambar terbaru (hanya ada satu gambar pop-up).
  const ambil = () => (isi ? {mime: isi.mime, buf: Buffer.from(isi.b64, 'base64'), v: isi.v} : null);
  return {simpan, ambil};
}

module.exports = {buatGambar, MAKS_BYTE};
