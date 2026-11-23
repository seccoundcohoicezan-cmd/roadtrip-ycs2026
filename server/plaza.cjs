// Plaza Festival Satu Kata untuk puluhan ribu warga (target 50.000).
// Semua warga tetap tercatat & dihitung, tetapi browser hanya menggambar sebagian (maks TAMPIL sekaligus) supaya HP
// tetap lancar. Yang tampil BERGILIR: tiap menit sebagian warga "pulang" dan warga lain "datang" lewat gerbang,
// sehingga dalam beberapa jam semua warga sempat muncul. Duta + warga terbaru selalu tampil.
// Mencari nama (/api/kata?cari=) memeriksa SELURUH warga, lalu karakter yang ketemu dimunculkan di plaza.
const TAMPIL = 2000, DUTA_MAKS = 300, TERBARU = 400, GESER_PER_MENIT = 120;

const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const norm = (s) => String(s || '').toLocaleLowerCase('id').normalize('NFD').replace(/[̀-ͯ]/g, '');

function buatPlaza(opsi = {}) {
  const now = opsi.now || Date.now;
  let memo = {kunci: '', kolam: null};
  // Kolam bergilir: warga asli (selain terbaru) + warga pembuka, diacak stabil (hash nama|kata) agar urutan tetap antar-permintaan.
  function kolam(sisaAsli, dummy) {
    const kunci = sisaAsli.length + '|' + dummy.length + '|' + (sisaAsli[0] || []).join() + '|' + (dummy[0] || []).join() + '|' + (sisaAsli[sisaAsli.length - 1] || []).join();
    if (memo.kunci !== kunci) {
      const semua = sisaAsli.concat(dummy).map((o) => [hash(o[0] + '|' + o[1]), o]);
      semua.sort((a, b) => a[0] - b[0]);
      memo = {kunci, kolam: semua.map((x) => x[1])};
    }
    return memo.kolam;
  }
  // duta: [[n,k,p,m]], asli: warga Satu Kata terbaru lebih dulu, dummy: warga pembuka yang sedang tampil.
  function sampel(duta, asli, dummy, maks = TAMPIL) {
    const tetap = duta.slice(0, DUTA_MAKS).concat(asli.slice(0, TERBARU));
    const sisa = kolam(asli.slice(TERBARU), dummy);
    const muat = Math.max(0, maks - tetap.length);
    if (sisa.length <= muat) return tetap.concat(sisa);
    const mulai = (Math.floor(now() / 60000) * GESER_PER_MENIT) % sisa.length;
    const jendela = sisa.slice(mulai, mulai + muat);
    if (jendela.length < muat) jendela.push(...sisa.slice(0, muat - jendela.length));
    return tetap.concat(jendela);
  }
  // Cari nama di seluruh warga (asli dulu, maks 20 hasil).
  function cari(q, ...daftar) {
    const nq = norm(q).trim();
    if (nq.length < 2) return [];
    const out = [];
    for (const l of daftar) for (const o of l) { if (norm(o[0]).includes(nq)) { out.push(o); if (out.length >= 20) return out; } }
    return out;
  }
  return {sampel, cari, TAMPIL};
}

module.exports = {buatPlaza, TAMPIL};
