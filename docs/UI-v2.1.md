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

## Putaran 2 (MRKT-62): game terpisah, gladi, perapian

### Game `/game/` — Lawan Raja Batu
- Lobi bergaya game harian: status bos + hitung mundur (dari jadwal monster/live), tombol **Main latihan**, **Kode undianku**, **Misi pejuang** (lencana), pemenang spin. Suara pendek (WebAudio) + getar, bisa dimatikan.
- **Arena event asli** = panggung festival + overlay monster yang sama (`assets/js/monster.js`, jam & aturan server). Beranda tidak lagi memasang monster; saat bos muncul/menjelang, beranda menampilkan banner yang menaut ke `/game/`.
- **Skema hadiah:** ikut menyerang → kode undian dicadangkan → **sah bila Raja Batu tumbang** → diundi saat live (admin Spin Undian). Bos menang/kabur → kode hangus (server + tampilan).
- **Mode latihan** (`assets/js/latihan.js`): 40 detik, tap bos (combo, kritis), HINDAR saat jurus, 3 nyawa, skor & rekor, "Tantang teman". Lokal, tanpa kode undian. Maks ±12 tap/detik dihitung (anti auto-klik).
- CSS bersama panggung + monster dipindah ke `assets/css/arena.css` (beranda & game).

### Mode Gladi seluruh web (`assets/js/gladi.js`)
- Admin → Lawan Monster → **Mode uji & gladi** → *Mulai uji* menghasilkan satu kode untuk: link game uji `/game/?uji-monster=KODE` dan **link gladi** `/?gladi=KODE`.
- Dengan link gladi, halaman asli dijalankan apa adanya; yang dicegat hanya: `GET /api/config` (diberi skenario) dan semua `POST` formulir (kata, dana, klaim, survei, twibbon → jawaban tiruan, tidak masuk server/Sheet). `localStorage ycs_*` dipisah ke `sessionStorage gladi:*`.
- Skenario (bar ungu → **Atur**): fase pengumuman, live (sedang tayang / 10 menit lagi), Dana Kaget (buka/belum/habis), waktu acara (berlangsung/selesai), pop-up admin. Kode Dana Kaget apa pun diterima kecuali yang mengandung "SALAH" (uji pesan galat).
- Game dalam gladi memakai event uji Raja Batu di server (tiket uji hanya di memori, bisa dicoba di Spin Undian event "UJI").

### Perapian
- HP sempit (≤360 px): kolom cari & tombol bottom sheet festival tidak lagi melebar keluar layar.
- Desktop: kolom cari festival pindah ke kepala bagian (tidak menimpa teks); 1024–1280 px alat festival di bawah panggung; header desktop mendapat latar saat digulir.
- Roda spin admin memakai warna token (teks navy di juring kuning).
