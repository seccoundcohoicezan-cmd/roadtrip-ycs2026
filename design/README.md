# YCS 2026: Desain UI/UX v2 ("Nusa Cerah")

Redesain menyeluruh situs YCS 2026 berdasarkan mockup arahan (biru–kuning, Bali, kartu bulat) dan fitur yang benar-benar ada di `docs/API.md`. Folder ini **hanya desain**: situs live belum diubah.

Galeri: `/design/` (contoh: https://roadtrip-ycs2026.vercel.app/design/). Halaman ini tidak diindeks mesin pencari.

## Isi
| File | Isi |
|---|---|
| `ds-design-system.html` | Design system: warna, tipografi, tombol, badge/chip, input + status, umpan balik, radius/elevasi, spasi/grid, 24 karakter adat, navigasi |
| `m01`–`m10` | 10 layar mobile (390 px) |
| `d01`, `d02` | 2 layar desktop (1440 px) |
| `ds.css` | Token + komponen. Nama variabel = nama Variable di Figma |
| `tokens.json` | Token format W3C/Tokens Studio (warna, radius, font, text style) |
| `pratinjau/` | Pratinjau WebP tiap frame |
| `img/karakter/` | 24 karakter adat (PNG 384×512), dirender dari `assets/js/festival.js` |

## Memasukkan ke Figma
1. Di Figma: **Plugins → html.to.design** (gratis, ada batas impor per bulan di paket gratis).
2. Pilih tab **URL**, tempel misalnya `https://roadtrip-ycs2026.vercel.app/design/m01-beranda.html`.
3. Atur viewport: **390** untuk `m*`, **1440** untuk `d*` dan `ds*`. Impor. Hasilnya frame dengan layer teks, gambar, dan auto layout yang bisa diedit.
4. Ulangi untuk ke-13 frame (urutannya ada di `frames.json`).
5. Token: pasang plugin **Tokens Studio** → *Load from file* → `tokens.json` → *Create variables*. Setelah itu ganti fill frame impor ke variabel bila perlu.
6. Font: Plus Jakarta Sans + Caveat (keduanya ada di Google Fonts dan daftar font Figma).

Catatan kuning (`.note`) di M05 adalah anotasi desainer. Hapus layer-nya jika tidak perlu.

## Revisi v2.1 (MRKT-60)
- **M01 & D01 Beranda** disusun ulang mengikuti dua mockup arahan ("YCS 2026 Event App Homepage" dan "Youth Character Summit 2026 Landing Page"): header logo 3 baris + tombol menu 48×48, kartu hero "Selamat Datang di YCS 2026!" dengan foto Pura Ulun Danu Beratan dan tulisan *Indonesia Juara* (Caveat), gelombang navy–kuning berupa SVG, dot carousel, 4 kartu menu berikon warna, banner *Game Interaktif · Festival 1 Kata*, kartu *Informasi Acara* + hitung mundur, tab bawah putih bergaris aktif. Semua warna dari token `ds.css`.
- Mobile dipetakan dari mockup 1024×1536 ke layar 390×844 (sumbu tegak ×0,55), desktop dari 1672×941 ke 1440×900. M01 sekarang tepat satu layar, seperti mockup. *Jadwal live* dan *Road to Bali* tetap ada di M06 Live dan M10 Lainnya.
- Tab bawah mobile mengikuti mockup (4 menu): Beranda · Festival · Jadwal · Lainnya. *Jadwal* = jadwal live. *Finalis* dibuka dari kartu menu Beranda dan dari *Lainnya*. "Punya kode?" pindah ke menu (☰ di mobile, *Lainnya*), dan tombol header desktop menjadi **Game** seperti di mockup.
- Foto rombongan pelajar di mockup desktop **tidak** dipakai: kita tidak punya foto asli dengan izin, jadi hanya foto pura yang dipakai. Ganti dengan foto kegiatan asli bila panitia sudah punya.
- **Latar festival tidak lagi terpotong** (M02, M04, M05, D02): gambar latar selalu tampil utuh selebar bingkai, sama seperti situs live. Langit diperpanjang ke atas dan plaza ke bawah memakai warna yang diambil dari tepi gambar (`#13ACFD` / `#EACDA2`, helper `panggung()` di `gen.py`), jadi tidak ada lagi garis sambungan.
- Warna di banner game yang tidak ada di token (oranye, hijau pada kata-kata) memakai token terdekat: `--sun-500`, `--coral-500`, `--green-100/600`, `--violet-600`.

## Keputusan UX
- **Mobile-first, tab bawah** (v2.1: 4 menu di Beranda sesuai mockup, lihat di atas; layar lain masih 5 menu: Beranda · Festival · Live · Finalis · Lainnya). Fitur sekunder (Dana Kaget, Wildcard, Road to Bali, Survei, FAQ, Privasi) dikelompokkan di *Lainnya* supaya menu utama tidak penuh.
- **"Punya kode?" selalu di header**: satu pintu untuk semua kode. Format `YCS-XXXXX` dikenali sebagai Dana Kaget, 8 karakter sebagai Wildcard, dan pengguna langsung diarahkan (M09).
- **Satu tombol kuning per layar** = aksi kampanye utama (Masuk/Gabung Festival). Biru dipakai untuk aksi form, merah hanya untuk LIVE.
- **Gabung festival 3 langkah** (data diri → kata & karakter → gabung) dengan progress bar. Karakter otomatis disarankan dari provinsi (sesuai `modelProvinsi`).
- **Momen berbagi** (M04): kartu langsung tampil setelah gabung, CTA "Ajak 3 teman" + unduh kartu.
- **Lawan Monster** (M05): HUD ringkas (nyawa monster, warga hidup, timer), peringatan jurus 2 detik, tombol HINDAR besar di zona jempol, tiket di kiri bawah.
- **Validasi ramah**: saran typo email ("gmial.com" → gmail.com?), status valid hijau, kuota Dana Kaget tampil sebagai progress.
- **Rentang usia 15–35**: teks body 16 px, target sentuh ≥ 44 px, kontras AA (diukur, lihat DS bagian 01), bahasa santai tapi jelas, ikon selalu berlabel.

## Data di layar
Angka (2.418 warga, 12.840 dukungan, kuota, jadwal), nama warga, dan kode adalah **contoh ilustrasi**. Kartu finalis memakai karakter sebagai pengganti foto: foto asli diisi dari data panitia saat implementasi, jangan memakai foto orang lain dengan nama yang dikarang.

## Membangun ulang
Generator: `tools/design/gen.py` (HTML), `tools/design/render.py <folder-png>` dan `tools/design/karakter.py` (Playwright). Ubah token di `ds.css` atau isi di `gen.py`, jalankan ulang, lalu render pratinjau.
