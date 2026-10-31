// Jam server untuk countdown: klien menghitung selisih jam perangkat dari sini (tidak bisa diakali dengan mengubah jam HP).
module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ok: true, now: Date.now()});
};
