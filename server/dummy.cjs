// Warga dummy (ramaikan plaza di awal festival). Hanya tampilan: TIDAK masuk Sheet, undian, Top kontributor,
// tiket, duta, maupun HP Raja Batu. Di publik formatnya sama persis dengan warga asli ([nama, kata, provinsi, karakter])
// dan diselipkan acak di antara warga asli, jadi tidak ada penanda "dummy". Hanya admin yang melihat daftarnya.
const MAKS = 2000;
const KATA_RE = /^[a-zÀ-ɏ-]{2,20}$/;

const NAMA_L = ['Adit', 'Aldi', 'Andi', 'Arya', 'Bagas', 'Bima', 'Bayu', 'Dimas', 'Dafa', 'Dika', 'Fajar', 'Farhan', 'Fikri', 'Galih', 'Gilang', 'Hafiz', 'Ilham', 'Irfan', 'Joko', 'Kevin', 'Rizky', 'Raka', 'Rafi', 'Reza', 'Rendi', 'Satria', 'Taufik', 'Wahyu', 'Yoga', 'Yusuf', 'Zaki', 'Naufal', 'Haikal', 'Akbar', 'Alif', 'Bintang', 'Daffa', 'Evan', 'Fadil', 'Hanif', 'Iqbal', 'Juna', 'Kurniawan', 'Lutfi', 'Made', 'Nanda', 'Putu', 'Ketut', 'Wayan', 'Rangga', 'Sakti', 'Teguh', 'Umar', 'Vino', 'Wisnu', 'Yudha', 'Ahmad', 'Rizal', 'Arif', 'Dani', 'Erlangga', 'Hendra', 'Ikhsan', 'Krisna', 'Miftah', 'Nabil', 'Owen', 'Panji', 'Rehan', 'Syahrul', 'Tegar', 'Ucok', 'Arkan', 'Fathan', 'Ghani', 'Habib', 'Dio', 'Rio', 'Sandi', 'Agung'];
const NAMA_P = ['Ayu', 'Alya', 'Anisa', 'Aulia', 'Bunga', 'Citra', 'Dewi', 'Dinda', 'Fitri', 'Intan', 'Kirana', 'Laras', 'Maya', 'Nadia', 'Nabila', 'Putri', 'Rani', 'Salsa', 'Sinta', 'Tiara', 'Wulan', 'Zahra', 'Amelia', 'Azizah', 'Bella', 'Cahya', 'Dita', 'Elsa', 'Farah', 'Gita', 'Hana', 'Indah', 'Jihan', 'Keisha', 'Lestari', 'Melati', 'Nayla', 'Olivia', 'Puspa', 'Qonita', 'Rara', 'Shinta', 'Tasya', 'Ulfa', 'Vania', 'Winda', 'Yuni', 'Zaskia', 'Aisyah', 'Annisa', 'Clara', 'Dian', 'Erika', 'Fani', 'Gladys', 'Hesti', 'Ika', 'Kayla', 'Lia', 'Mutiara', 'Niken', 'Rahma', 'Sekar', 'Tari', 'Vivi', 'Yasmin', 'Kadek', 'Komang', 'Novi', 'Rizka', 'Syifa', 'Naura', 'Kezia', 'Lintang', 'Sari', 'Wening', 'Nurul', 'Raisa', 'Chika', 'Febi'];
const HURUF = 'ABCDEFGHIJKLMNOPRSTUWYZ';
// Kata positif bertema karakter pemuda; bobot berulang agar ada kata yang "ramai" seperti data asli.
const KATA = ['semangat', 'semangat', 'semangat', 'berani', 'berani', 'jujur', 'jujur', 'peduli', 'peduli', 'mandiri', 'kreatif', 'kreatif', 'disiplin', 'tangguh', 'tangguh', 'juara', 'juara', 'juara', 'bangkit', 'bersatu', 'gotong-royong', 'inspirasi', 'berkarya', 'berkarya', 'optimis', 'sabar', 'ikhlas', 'santun', 'cerdas', 'hebat', 'bermimpi', 'berprestasi', 'berdampak', 'pantang-menyerah', 'kolaborasi', 'inovatif', 'solid', 'kompak', 'bangga', 'amanah', 'tulus', 'ramah', 'rendah-hati', 'pemimpin', 'cinta-indonesia', 'merdeka', 'maju', 'tumbuh', 'belajar', 'bersyukur', 'setia', 'adil', 'toleransi', 'empati', 'gigih', 'fokus', 'percaya-diri', 'ceria', 'bijak', 'teladan', 'berbagi', 'nusantara', 'bhinneka', 'unggul', 'positif', 'luar-biasa', 'keren', 'sukses', 'harapan', 'perubahan'];
// Bobot kira-kira sebaran pelajar per provinsi (Jawa paling banyak).
const PROV = [['Jawa Barat', 16], ['Jawa Timur', 14], ['Jawa Tengah', 13], ['DKI Jakarta', 6], ['Banten', 5], ['Sumatera Utara', 5], ['DI Yogyakarta', 3], ['Sulawesi Selatan', 3], ['Lampung', 3], ['Sumatera Selatan', 3], ['Riau', 2], ['Sumatera Barat', 2], ['Bali', 2], ['Nusa Tenggara Barat', 2], ['Nusa Tenggara Timur', 2], ['Kalimantan Barat', 2], ['Kalimantan Timur', 2], ['Aceh', 2], ['Jambi', 1], ['Bengkulu', 1], ['Kepulauan Riau', 1], ['Kepulauan Bangka Belitung', 1], ['Kalimantan Selatan', 1], ['Kalimantan Tengah', 1], ['Kalimantan Utara', 1], ['Sulawesi Utara', 1], ['Sulawesi Tengah', 1], ['Sulawesi Tenggara', 1], ['Gorontalo', 1], ['Sulawesi Barat', 1], ['Maluku', 1], ['Maluku Utara', 1], ['Papua', 1], ['Papua Barat', 1], ['Papua Barat Daya', 1], ['Papua Selatan', 1], ['Papua Tengah', 1], ['Papua Pegunungan', 1]];
const PROV_NAMA = PROV.map((p) => p[0]);
const PROV_TOTAL = PROV.reduce((a, p) => a + p[1], 0);

function acak(seed) { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pilih = (r, a) => a[Math.floor(r() * a.length)];
function pilihProv(r) { let x = r() * PROV_TOTAL; for (const [n, b] of PROV) { x -= b; if (x < 0) return n; } return PROV[0][0]; }
const besar = (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
// Sama dengan namaTampil_ di Code.gs: "Nama D."
function namaTampil(nama) { const k = String(nama || '').trim().split(/\s+/).filter(Boolean); if (!k.length) return ''; return besar(k[0]).slice(0, 20) + (k[1] ? ' ' + k[1].charAt(0).toUpperCase() + '.' : ''); }

// Daftar otomatis (deterministik dari seed): [nama tampil, kata, provinsi, karakter 1..24]
function buatOtomatis(n, seed) {
  const r = acak(seed), out = [], ada = new Set();
  for (let i = 0; out.length < n && i < n * 4; i++) {
    const nama = pilih(r, r() < 0.5 ? NAMA_L : NAMA_P) + (r() < 0.9 ? ' ' + HURUF[Math.floor(r() * HURUF.length)] + '.' : '');
    const kata = pilih(r, KATA);
    if (ada.has(nama + '|' + kata)) continue;
    ada.add(nama + '|' + kata);
    out.push([nama, kata, pilihProv(r), 1 + Math.floor(r() * 24)]);
  }
  return out;
}

function buatDummy(opsi = {}) {
  const simpanan = () => { const st = (opsi.state && opsi.state()) || (opsi._st = opsi._st || {}); st.dummy = st.dummy || {aktif: false, jumlah: 0, seed: 20261223, kustom: [], pejuang: 40, kurangi: true}; return st.dummy; };
  let memo = {kunci: '', v: null};
  // Daftar lengkap (kustom dulu, sisanya otomatis) sebanyak `jumlah`.
  function daftar() {
    const d = simpanan();
    const kunci = [d.jumlah, d.seed, d.kustom.length, d.versi || 0].join('|');
    if (memo.kunci === kunci) return memo.v;
    const kustom = d.kustom.slice(0, d.jumlah);
    const pakai = new Set(kustom.map((x) => x[0] + '|' + x[1]));
    const sisa = buatOtomatis(Math.max(0, d.jumlah - kustom.length) + 50, d.seed).filter((x) => !pakai.has(x[0] + '|' + x[1])).slice(0, Math.max(0, d.jumlah - kustom.length));
    memo = {kunci, v: kustom.concat(sisa)};
    return memo.v;
  }
  // Berapa dummy yang tampil sekarang. Mode "kurangi": berkurang otomatis seiring warga asli bertambah (dummy hanya pembuka).
  function jumlahTampil(nAsli) {
    const d = simpanan();
    if (!d.aktif || !d.jumlah) return 0;
    return Math.max(0, d.kurangi ? d.jumlah - (nAsli || 0) : d.jumlah);
  }
  // Gabungkan ke respons /api/kata: diselipkan merata (urutan stabil dari seed) + hitungan kata & total.
  function gabungKata(d, nAsli) {
    const n = jumlahTampil(nAsli);
    if (!n) return d;
    const semua = daftar().slice(0, n);
    const asli = d.orang || [];
    const muat = semua.slice(0, Math.max(0, MAKS - asli.length)); // warga asli selalu tampil; plaza maks 2.000
    const r = acak(simpanan().seed ^ 0x9e3779b9);
    const orang = asli.slice();
    // sisipkan di posisi acak (stabil) — bukan blok di belakang
    for (const o of muat) orang.splice(Math.floor(r() * (orang.length + 1)), 0, o);
    const hit = new Map((d.kata || []).map(([k, c]) => [k, c]));
    semua.forEach((o) => hit.set(o[1], (hit.get(o[1]) || 0) + 1));
    const kata = [...hit.entries()].sort((a, b) => b[1] - a[1]).slice(0, 150);
    return {...d, orang, kata, total: (d.total || 0) + n};
  }
  // Untuk arena: berapa "pejuang" tampilan tambahan (animasi serangan + hitungan pejuang). Tidak memengaruhi HP bos.
  function ramai(nAsli) { const d = simpanan(); return Math.round(jumlahTampil(nAsli) * Math.max(0, Math.min(100, Number(d.pejuang) || 0)) / 100); }

  function info(nAsli) {
    const d = simpanan();
    const l = daftar();
    return {ok: true, aktif: !!d.aktif, jumlah: d.jumlah, pejuang: d.pejuang, kurangi: !!d.kurangi, kustom: d.kustom.length, tampil: jumlahTampil(nAsli), asli: nAsli || 0, ramai: ramai(nAsli), maks: MAKS,
      contoh: l.slice(0, 2000).map((x) => [x[0], x[1], x[2]]), teksKustom: d.kustom.map((x) => x.slice(0, 3).join(';')).join('\n')};
  }
  // Teks kustom: satu baris "Nama Lengkap;kata;provinsi" (provinsi opsional). Nama otomatis disingkat seperti warga asli.
  function uraiKustom(teks) {
    const out = [], salah = [], ada = new Set();
    String(teks || '').split(/\r?\n/).slice(0, MAKS + 50).forEach((baris, i) => {
      const b = baris.trim();
      if (!b) return;
      const [n, k, p] = b.split(/\s*[;\t]\s*|\s*,\s*/);
      const nama = namaTampil(n), kata = String(k || '').trim().toLowerCase().replace(/\s+/g, '-');
      if (!nama || !KATA_RE.test(kata)) { salah.push(i + 1); return; }
      const prov = PROV_NAMA.find((x) => x.toLowerCase() === String(p || '').trim().toLowerCase()) || '';
      if (ada.has(nama + '|' + kata)) return;
      ada.add(nama + '|' + kata);
      const r = acak(nama.length * 7919 + kata.length * 31 + i);
      out.push([nama, kata, prov || pilihProv(r), 1 + Math.floor(r() * 24)]);
    });
    return {out: out.slice(0, MAKS), salah};
  }
  function admin(p, nAsli, cekKata) {
    const d = simpanan();
    if (p.aksi === 'dummy-info') return info(nAsli);
    if (p.aksi === 'dummy-atur') {
      if (typeof p.kustom === 'string') {
        const {out, salah} = uraiKustom(p.kustom);
        const ditolak = cekKata ? out.filter((x) => cekKata(x[1])) : [];
        if (salah.length || ditolak.length) return {ok: false, error: 'kustom_salah', baris: salah.slice(0, 10), kata: [...new Set(ditolak.map((x) => x[1]))].slice(0, 10)};
        d.kustom = out;
      }
      d.aktif = !!p.aktif;
      d.jumlah = Math.max(0, Math.min(MAKS, Math.round(Number(p.jumlah) || 0)));
      d.pejuang = Math.max(0, Math.min(100, Math.round(Number(p.pejuang) || 0)));
      d.kurangi = !!p.kurangi;
      if (p.acakUlang) d.seed = (Math.random() * 2 ** 31) >>> 0;
      d.versi = (d.versi || 0) + 1;
      if (opsi.ubah) opsi.ubah();
      return info(nAsli);
    }
    return {ok: false, error: 'validation'};
  }
  return {gabungKata, ramai, admin, jumlahTampil, MAKS};
}

module.exports = {buatDummy, buatOtomatis, namaTampil};
