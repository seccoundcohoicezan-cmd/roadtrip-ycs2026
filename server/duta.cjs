// Duta (peserta lolos / data Finalis hasil impor): tiap duta punya link referral ?ref=duta-xxxxxx.
// Warga yang mengisi Festival Satu Kata lewat link itu tercatat di kolom "Sumber" tab Satu Kata,
// jadi jumlah warga per duta dihitung langsung dari data yang sudah ada (tanpa tabel baru).
// Duta tidak ikut undian (lihat monster.cjs: pesertaDari) — tugas mereka mengajak teman ikut festival.
const crypto = require('node:crypto');

const norm = (v) => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
const kodeDuta = (nama, sekolah) => 'duta-' + BigInt('0x' + crypto.createHash('sha1').update(norm(nama) + '|' + norm(sekolah)).digest('hex').slice(0, 12)).toString(36).slice(0, 6).padStart(6, '0');
const namaTampil = (n) => { const b = String(n || '').trim().split(/\s+/); return b.length > 1 ? b[0] + ' ' + b[b.length - 1][0] + '.' : b[0] || ''; };
const tidakTampil = (v) => /^(tidak|no|false|0)$/i.test(String(v ?? '').trim());

function buatDuta(appFn, opsi = {}) {
  const now = opsi.now || Date.now;
  let memo = {t: 0, v: null};
  function hitung() {
    if (memo.v && now() - memo.t < (opsi.memoMs ?? 15000)) return memo.v;
    const app = appFn();
    const fin = ((app.sheets.Finalis || {}).rows || []).slice(1);
    const kata = ((app.sheets['Satu Kata'] || {}).rows || []).slice(1);
    const duta = new Map();
    fin.forEach((r) => {
      if (!String(r[0] || '').trim() || tidakTampil(r[6])) return;
      const kode = kodeDuta(r[0], r[1]);
      if (!duta.has(kode)) duta.set(kode, {kode, nama: String(r[0]).trim(), sekolah: String(r[1] || ''), kota: String(r[2] || ''), provinsi: String(r[3] || ''), foto: '', warga: 0, terbaru: []});
    });
    let totalWarga = 0;
    kata.forEach((r) => {
      const sumber = String(r[4] || '').trim().toLowerCase();
      if (!sumber.startsWith('duta-') || String(r[5]).toUpperCase() === 'TIDAK') return;
      const d = duta.get(sumber);
      if (!d) return;
      d.warga++; totalWarga++;
      d.terbaru.push({nama: namaTampil(r[6]), provinsi: String(r[3] || ''), kata: String(r[2] || ''), waktu: r[0] instanceof Date ? r[0].toISOString() : String(r[0] || '')});
    });
    const daftar = [...duta.values()];
    daftar.forEach((d) => { d.terbaru = d.terbaru.slice(-10).reverse(); });
    // peringkat: terbanyak dulu, seri → urut nama
    const urut = daftar.slice().sort((a, b) => b.warga - a.warga || a.nama.localeCompare(b.nama, 'id'));
    urut.forEach((d, i) => { d.peringkat = d.warga ? i + 1 : null; });
    memo = {t: now(), v: {daftar, urut, totalWarga}};
    return memo.v;
  }
  function lihat(kode) {
    const h = hitung();
    if (kode) {
      const d = h.daftar.find((x) => x.kode === String(kode).toLowerCase());
      if (!d) return {ok: false, error: 'tidak_ditemukan'};
      return {ok: true, duta: d, totalDuta: h.daftar.length};
    }
    return {ok: true, totalDuta: h.daftar.length, totalWarga: h.totalWarga, duta: h.urut.map(({kode, nama, sekolah, kota, provinsi, warga, peringkat}) => ({kode, nama, sekolah, kota, provinsi, warga, peringkat})), diperbarui: new Date(now()).toISOString()};
  }
  return {lihat, segarkan: () => { memo.t = 0; }, kodeDuta};
}

module.exports = {buatDuta, kodeDuta};
