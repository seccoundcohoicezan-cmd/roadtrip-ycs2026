# UI/UX v2.1 "Nusa Cerah" di situs live (MRKT-62)

Sumber kebenaran: `design/` (PNG v2.1 = render dari `design/*.html`, token di `design/ds.css` + `design/tokens.json`).

## Arsitektur gaya

| File | Isi |
|---|---|
| `assets/css/tokens.css` | Satu-satunya sumber token: palet, token semantik (`--heading`, `--text`, `--surface`, `--primary`, …), tipografi, radius, elevasi, spasi, mode gelap, token ilustrasi. |
| `assets/css/komponen.css` | Komponen dasar: tombol (Primary, Sun/CTA, Dark, Ghost, Outline, Live, ikon), badge & chip, tile ikon 44 px, kartu, input (default/fokus/valid/error), alert, toast, skeleton, bottom nav, nav pil desktop, bottom sheet, daftar menu. |
| `index.html` `<style>` | Tata letak layar (Beranda, Festival, Live, Dana Kaget, Finalis, dst.) — hanya memakai token. |
| `assets/css/halaman.css` | Kerangka halaman turunan (header/hero/footer) di atas token + komponen yang sama. |

Nama kelas lama dipertahankan agar JS tidak berubah: `.btn--cta` = Sun, `.btn--soft` = Ghost, `.btn--ghost` = Outline.

## Pemetaan layar

| Lama | Frame | Status |
|---|---|---|
| Header + nav atas | d01/d02 nav pil, m01 appbar | Selesai |
| Menu hamburger + orb menu cepat | Bottom nav 5 item + m10 Lainnya | Selesai (orb dihapus atas persetujuan) |
| Hero `#beranda` | m01 / d01 | Selesai (carousel 3 slide, 4 tile, kartu game, info acara) |
| `#satu-kata` panggung + cari | m02 / d02 | Selesai (+ ringkasan samping desktop) |
| Form gerbang festival | m03 | Selesai (wizard 3 langkah, satu kiriman API) |
| Kartu PNG + Ajak teman | m04 | Selesai (dialog sukses + kartu PNG versi baru) |
| Overlay Lawan Monster | m05 | Selesai (HUD gelap, toast jurus, HINDAR, kartu tiket) |
| `#live` | m06 | Selesai (+ chip Semua/Akan datang/Rekaman) |
| `#delegasi` | m07 | Selesai |
| `#dana` | m08 | Selesai (+ saran email "Maksudnya gmail.com?") |
| Dialog Punya kode? | m09 | Selesai (bottom sheet, kotak karakter, penanda "Cocok") |

Tanpa frame (token + komponen saja, tata letak lama): Road to Bali, Leaderboard, Jejak Bali 2025, Ikon Bali, Komunitas, FAQ, Klaim wildcard (pasca), promo Survei, kartu pemenang spin, footer, popup admin, dialog bagikan, `/klaim`, `/survei`, `/privasi`, `/admin`, `/harapan`.

## Asumsi

- Mode gelap diturunkan dari token (PNG tidak menggambar versi gelap). Kartu berilustrasi (hero, panggung festival, kartu warga, monster) tetap terang/gelap seperti aslinya.
- Ukuran teks memakai skala token (min. 11–12 px); mockup m01 memakai 9–10 px di tile — dinaikkan demi keterbacaan.
- Caveat hanya untuk "Indonesia Juara" (maks. 1× per layar); aksen tulisan tangan lama diganti Plus Jakarta Sans.
- Chip festival: Semua / Provinsiku / Kata samaku. "Teman sekolah" tidak dibuat karena data sekolah tidak publik.
- Pil plaza berbunyi "warga festival" (total pendaftar), bukan "online" — tidak ada data online.
- Carousel hero: slide 1 Selamat datang (Sun "Mulai Jelajahi"), slide 2 Finalis/pengumuman, slide 3 Live & Dana Kaget; foto dari repo.
- Logo YCS masih dummy (akan diganti panitia).
- Warna kanvas JS (roda spin admin, gambar kartu) mengambil token lewat `getComputedStyle` bila memungkinkan; roda admin masih memakai palet sendiri.

## Pertentangan antar-PNG

- m01 bottom nav 4 item vs ds/m02 5 item → 5 item (ds menang, Jadwal masuk Live).
- m09 header seluler punya tombol "Punya kode?" sedangkan m01 tombol menu → mengikuti m01; "Punya kode?" ada di menu Lainnya dan di desktop.
- Judul ds "v2.0" vs paket v2.1 → v2.1.
