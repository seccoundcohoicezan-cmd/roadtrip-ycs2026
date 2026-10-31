const {upstreamGet, send} = require('./_lib');
// Daftar finalis sebagai satu respons yang di-cache CDN. Sebelum waktu_pengumuman (jam server) endpoint
// menolak dengan 425; Apps Script juga memeriksa waktu yang sama, jadi data tidak bisa diambil lebih awal.
let memo = {at: 0, buka: null};
async function waktuBuka() {
  if (Date.now() - memo.at < 15000 && memo.buka) return memo.buka;
  const cfg = await upstreamGet('config');
  memo = {at: Date.now(), buka: cfg.pengumuman ? Date.parse(cfg.pengumuman) : null};
  return memo.buka;
}
function tunggu(res, buka) {
  const sisa = Math.floor((buka - Date.now()) / 1000);
  res.setHeader('Retry-After', String(Math.max(1, Math.min(30, sisa))));
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=' + Math.max(1, Math.min(30, sisa - 1)));
  return res.status(425).json({ok: false, error: 'belum_waktunya', buka: new Date(buka).toISOString()});
}
module.exports = async function handler(req, res) {
  try {
    const buka = await waktuBuka();
    if (!buka) return send(res, {ok: false, error: 'belum_diatur'}, 'public, max-age=0, s-maxage=30');
    if (Date.now() < buka) return tunggu(res, buka);
    const data = await upstreamGet('reveal');
    if (data.error === 'belum_waktunya') { memo.at = 0; return tunggu(res, Date.parse(data.buka) || Date.now() + 2000); }
    if (data.ok !== true) throw new Error('reveal');
    const kosong = !data.finalis || !data.finalis.length;
    return send(res, data, kosong ? 'public, max-age=0, s-maxage=30' : 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400');
  } catch (_) { return send(res, {ok: false, error: 'connection'}); }
};
