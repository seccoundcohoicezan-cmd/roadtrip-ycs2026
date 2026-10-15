# roadtrip-ycs2026

Landing page **Youth Character Summit 2026**. Seluruh halaman ada di satu file statis `index.html`, dideploy otomatis oleh Vercel dari branch `main`.

## Struktur

```
index.html        # HTML + CSS + JS dalam satu file
assets/img/       # foto dokumentasi (WebP, versi 800px & 1600px)
assets/svg/       # ilustrasi & stiker Bali (hasil tools/gen-assets.py)
tools/            # generator aset SVG
```

## Aset ilustrasi

Semua SVG di `assets/svg/` digambar oleh `tools/gen-assets.py` (bebas hak cipta): scene hero (sawah, Gunung Agung, candi bentar, meru, penjor, kelapa), pola kawung, stiker layangan, kamboja, canang, cap "Road to Bali", tiket, van, papan selancar, sapuan kuas, dan skyline footer. Ubah warna/bentuk di skrip lalu jalankan `python3 tools/gen-assets.py`.

## Mengubah konten

- **Data contoh & endpoint backend**: lihat objek `CONFIG` di bagian atas `<script>`. Kalau `demo: false`, label "Data contoh" disembunyikan.
- **Jadwal live**: elemen `<li class="live-item">` beserta atribut `data-start`/`data-end` (WIB).
- **Countdown**: atribut `data-countdown` pada elemen `.countdown`.
- **Warna & font**: variabel di `:root`.

## Menambah foto

Simpan dua ukuran WebP (lebar 800 px dan 1600 px) di `assets/img/` dengan pola nama `nama-800.webp` dan `nama-1600.webp`, lalu pakai `srcset`.
Pastikan ada izin publikasi dari orang yang tampil di foto.

## Alur twibbon dan spreadsheet

Isi nama, sekolah, email, buka saluran WhatsApp, setujui penyimpanan data, lalu buat PNG. Klik saluran otomatis mencentang syarat; ini mencatat klik, bukan verifikasi keanggotaan WhatsApp. Foto dan email tidak dimasukkan ke server/gambar secara bersamaan: hanya nama, sekolah, email, pilihan bingkai, persetujuan, status klik dan ID permintaan dikirim; foto tetap lokal.

- `api/twibbon.js`: fungsi Vercel yang meneruskan POST ke Apps Script, memeriksa respons sebelum menampilkan sukses. Variabel opsional `YCS_APPS_SCRIPT_URL` dapat mengganti endpoint deployment.
- `apps-script/Code.gs`: sumber backend. Membuat tab `Twibbon YCS 2026` tanpa mengubah tab lain, validasi server, lock, deduplikasi ID permintaan, perlindungan formula spreadsheet dan batas lima kiriman/email/jam. Batas email sederhana ini bukan perlindungan terhadap spam terdistribusi.
- `apps-script/appsscript.json`: konfigurasi eksekusi sebagai pemilik dan akses publik.

Proyek: https://script.google.com/home/projects/1aQQU59hgP9ytYaboeVX1n3OYt_sdth9utSYDM9zcujeJUxdcEPPIMnJ4/edit
Sheet: https://docs.google.com/spreadsheets/d/1SKSCKrg_Laux39Xdu1_99tIv_NsgiJcASi27mnVe5ME/edit

### Membangun sheet & mengaktifkan endpoint (sekali saja)

Buka Apps Script dengan akun pemilik, pilih fungsi `siapkanSheet` di toolbar, klik **Jalankan**, lalu izinkan akses Google. Fungsi ini:

- membuat/merapikan tab `Twibbon YCS 2026` (header berwarna, kolom beku, filter, lebar kolom, format waktu, header terlindungi);
- membuat tab `Rekap` berisi total twibbon, email unik, sekolah unik, jumlah hari ini, per bingkai, 30 sekolah teratas dan jumlah per hari (rumus otomatis);
- menambah menu **YCS 2026 → Siapkan / rapikan sheet** di spreadsheet.

Sebelum izin ini diberikan, endpoint Web App menjawab HTTP 403 untuk pengunjung. Deployment yang dipakai `api/twibbon.js` sudah memakai versi terbaru; jika membuat deployment baru, ubah URL di `api/twibbon.js` atau set `YCS_APPS_SCRIPT_URL` di Vercel. Panduan resmi: https://developers.google.com/apps-script/guides/web

Setelah aktif, lakukan satu uji nyata dengan data panitia, pastikan baris muncul dan unduh PNG berhasil. Jangan nyatakan integrasi aktif sebelum uji ini berhasil. Percobaan ulang pada halaman yang sama memakai ID yang sama sehingga respons hilang tidak menggandakan baris. Unduh ulang tanpa mengubah identitas/bingkai tidak menambah baris.

Statistik Road to Bali dan daftar delegasi masih memakai data contoh berlabel; tidak dihitung dari Sheet pada revisi ini.
