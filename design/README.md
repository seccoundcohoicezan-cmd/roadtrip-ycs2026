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

## Keputusan UX
- **Mobile-first, tab bawah 5 menu**: Beranda · Festival · Live · Finalis · Lainnya. Fitur sekunder (Dana Kaget, Wildcard, Road to Bali, Survei, FAQ, Privasi) dikelompokkan di *Lainnya* supaya menu utama tidak penuh.
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
