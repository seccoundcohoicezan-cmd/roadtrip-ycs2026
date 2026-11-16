# roadtrip-ycs2026

Situs **Youth Character Summit 2026**: beranda satu halaman (`index.html`) + halaman turunan, dideploy otomatis oleh Vercel dari branch `main`. Backend: fungsi Vercel (`api/`) → Google Apps Script (`apps-script/Code.gs`) → Google Sheet panitia.

## Struktur

```
index.html        # beranda: HTML + CSS + JS dalam satu file (fase pra/pasca pengumuman)
klaim/            # klaim tiket wildcard (kode 8 karakter + email penerima)
dana-kaget/       # form Dana Kaget (kode akses, kuota atomik, satu orang satu pengajuan)
survei/           # survei destinasi (dibuka saat pengumuman / survei_buka)
privasi/          # kebijakan privasi lengkap (izin orang tua, batas akses)
admin/            # panel admin (password, sesi 6 jam)
api/              # fungsi Vercel: config, now, stats, reveal, klaim, dana, survei, admin, twibbon
assets/css|js/    # gaya & utilitas bersama halaman turunan
assets/data/      # wilayah.json (38 provinsi, 514 kab/kota; tools/gen-wilayah.py, sumber cahyadsn/wilayah MIT)
tools/dev-server.cjs  # server lokal + Apps Script tiruan untuk uji tanpa Google/Vercel
assets/img/       # foto dokumentasi (WebP, versi 800px & 1600px)
assets/img/bali/  # foto ikon Bali dari Wikimedia Commons (WebP, kredit di footer)
assets/svg/       # ilustrasi & stiker Bali (hasil tools/gen-assets.py)
tools/            # generator aset SVG
```

## Aset ilustrasi

Semua SVG di `assets/svg/` digambar oleh `tools/gen-assets.py` (bebas hak cipta): scene hero (sawah, Gunung Agung, candi bentar, meru, penjor, kelapa), pola kawung, stiker layangan, kamboja, canang, cap "Road to Bali", tiket, van, papan selancar, sapuan kuas, dan skyline footer. Ubah warna/bentuk di skrip lalu jalankan `python3 tools/gen-assets.py`.

## Mengubah konten

- **Waktu pengumuman, jadwal live, link, saklar fitur**: panel `/admin/` (atau tab Pengaturan/Jadwal Live di Sheet). Atribut `data-countdown` dan `<li class="live-item">` di HTML hanya cadangan bila API tidak terjangkau.
- **Endpoint**: objek `CONFIG` di bagian atas `<script>` beranda.
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


## Foto Bali & performa

Foto latar dan galeri "Ikon Bali" berasal dari Wikimedia Commons (CC BY / CC BY-SA); daftar kredit lengkap ada di footer ("Kredit foto Bali"). Latar section dimuat malas (`data-lazy-bg` → kelas `.is-bg` saat mendekati layar). HP memakai versi 720 px/potret, desktop 1440 px. Foto galeri dokumentasi punya varian 480/800/1600 px.

## Fase pengumuman (MRKT-45)

Beranda berganti otomatis berdasarkan **jam server** (`/api/now` + `waktu_pengumuman` dari `/api/config`), bukan jam perangkat:

- **Pra**: hero + countdown (Ingatkan saya, Bagikan), live, twibbon, Road to Bali, leaderboard, teaser finalis terkunci, banner survei/Dana Kaget bila aktif.
- **Pasca**: hero berisi kartu finalis bergantian, daftar finalis naik ke posisi kedua (cari, filter provinsi & jalur), blok "Belum lolos? Klaim tiketmu", lalu bagian lain.
- Saat countdown habis di halaman, browser menunggu acak 0–3 detik lalu mengambil `/api/reveal`. Sebelum waktunya `/api/reveal` menjawab 425 dan Apps Script juga menolak, jadi data finalis tidak bisa diambil lebih awal. Setelah waktunya respons di-cache CDN 5 menit (`s-maxage=300`), sehingga lonjakan pengunjung tidak langsung memukul Apps Script.

### Data & pengaturan (Google Sheet)

`Code.gs` membuat tab berikut otomatis saat endpoint pertama kali dipanggil (data lama tidak disentuh):

| Tab | Isi |
|---|---|
| Pengaturan | pop-up informasi (`popup_*`), `waktu_pengumuman`, link live utama/cadangan, `link_event`, target Road to Bali, saklar klaim/survei/Dana Kaget, kode akses & kuota Dana Kaget |
| Jadwal Live | judul, platform, mulai/selesai (WIB), link, link cadangan, tampil |
| Finalis | nama, sekolah, kota, provinsi, jalur, foto (URL https; link Google Drive otomatis diubah ke gambar) |
| Kode Wildcard | kode, email, nama, status (`belum klaim`/`sudah klaim`/`hangus`), berlaku hingga, waktu klaim, percobaan salah |
| Dana Kaget, Survei | kiriman form |
| Admin, Log Admin | password awal (ganti setelah login pertama), catatan login/impor/ekspor |

Semua bisa diubah lewat `/admin/` atau langsung di sheet. Perubahan tampil di situs dalam ±1 menit (cache Apps Script 20 dtk + CDN 30 dtk).

Twibbon kini menyimpan `Kota/Kabupaten`, `Provinsi`, dan `Sumber` (`?ref=` kunjungan pertama, disimpan 30 hari). Header lama dimigrasikan otomatis. Leaderboard dan Road to Bali dihitung dari tab twibbon (cache 5 menit); baris lama tanpa daerah tetap dihitung di Road to Bali.

### Keamanan

- Password admin di-hash (garam + 300 putaran SHA-256) di Script Properties; 10 kali salah mengunci login 15 menit.
- Klaim: kode harus cocok dengan email penerima, sekali pakai, 5 kali salah per perangkat/IP diblokir 1 jam. IP hanya dikirim sebagai hash.
- Dana Kaget: kuota dihitung ulang di dalam `LockService`, jadi kiriman bersamaan tidak melewati kuota; duplikat dicek dari email dan nomor WhatsApp.
- Batas Apps Script: ±30 eksekusi bersamaan. Baca (config/stats/reveal) aman karena di-cache CDN; tulis (twibbon, klaim, Dana Kaget) yang sangat ramai bisa antre/`busy` dan klien diminta mencoba lagi. Untuk skala lebih besar, pindahkan tulis ke database (mis. Supabase) dengan kontrak `api/` yang sama.

### Uji

```bash
node --test tests/backend.cjs tests/fase2.cjs   # logika Code.gs + proxy
node tools/dev-server.cjs 8787                    # situs lokal + Apps Script tiruan
curl -X POST localhost:8787/__seed -d '{"finalis":30,"twibbon":40}'   # data contoh, membalas password admin
```

## Putaran 4 (MRKT-45): Twibbon diganti Dana Kaget + Satu Kata

- **Twibbon dihapus** dari beranda dan menu. Data twibbon lama tetap ada di Sheet sebagai arsip dan masih dihitung di Road to Bali.
- **Klaim Dana Kaget** ada langsung di beranda (`#dana`). Alurnya: isi identitas (nama, sekolah, provinsi, email) → masukkan kode akses → selesai. `/dana-kaget/` mengalihkan ke `/#dana` dan membawa `?kode=`.
- **Satu Kata** (`#satu-kata`): kirim kata gratis. Awan kata hasilnya ter-blur dan terbuka setelah pengunjung mengetuk tombol Saluran WhatsApp (link diatur di Admin → Satu Kata). Setelah terbuka, kartu kata PNG bisa diunduh. Layar acara: `/harapan/?display=1`. Detail: `harapan/README.md`.
- **Road to Bali & leaderboard provinsi** = twibbon lama + Satu Kata + klaim Dana Kaget.

## Lawan Monster (MRKT-56)

Event kolaboratif di panggung Festival Satu Kata sebelum live. Monster muncul di tengah plaza. Peserta mengetuk warga festival: tenaga turun dari langit ke warga yang diketuk, lalu mengalir ke bar tenaga bersama. Saat target level tercapai, monster naik level (membesar, tiap tap bernilai lebih). Setelah level terakhir, sinar cahaya turun dari langit, monster runtuh, muncul **"Monster Terkalahkan!"** dan tombol live.

### Pemicu (panel admin → tab **Lawan Monster**)

| Pemicu | Kapan muncul | Kapan berakhir |
|---|---|---|
| `sebelum_live` (bawaan) | `monster_menit_sebelum` (bawaan 20) menit sebelum **setiap** jadwal di tab Jadwal Live | saat live dimulai |
| `jadwal` | `monster_waktu` | setelah `monster_durasi` menit |
| `manual` | hanya lewat tombol **Mulai sekarang** | setelah `monster_durasi` menit |

Tombol darurat: **Mulai sekarang** (event baru, tenaga dari nol, mengalahkan pemicu lain), **Stop darurat** (monster langsung disembunyikan), **Kembali ikut jadwal**. Semua perubahan berlaku ±5 detik. Hitung mundur "monster muncul dalam …" tampil 60 menit sebelumnya di panggung dan 15 menit sebelumnya sebagai banner. Hasil (menang/waktu habis) tetap tampil 15 menit setelah event. Semua waktu memakai jam server Vercel, bukan jam HP.

### Level & rumus

- Target per level: daftar `monster_target` (bawaan `5000,15000,40000` → 3 level). Kosongkan untuk rumus: target L = `monster_target_dasar` × `monster_target_kali`^(L−1), dibulatkan ke ratusan (5000 × 2,8 → 5.000, 14.000, 39.200).
- Poin per tap = nomor level (L1 = 1, L2 = 2, …) atau daftar `monster_poin`.
- Ukuran monster = 1 + `monster_skala_naik` × (L−1), maksimal 2,5× (bawaan 1×; 1,3×; 1,6×).
- Kelebihan tenaga saat naik level tidak dibawa ke level berikutnya.
- Rumus yang sama dipakai server dan pratinjau admin: `assets/js/monster-aturan.js`.

### Arsitektur

```
HP peserta ──GET /api/monster (cache CDN 1 dtk)──────────────┐
          ──POST tap {token, n, seq, e} tiap 1–5 dtk──► api/monster.js ──EVALSHA──► Upstash Redis (skrip Lua atomik)
panel admin ──/api/admin──► Apps Script (tab Pengaturan) ──► config dibaca api/monster.js (cache 5 dtk; Redis m:cfg 60 dtk)
```

- `api/monster.js`: GET status; POST `masuk` (token HMAC, maks 300 token/10 menit per IP, env `MONSTER_BATAS_MASUK`); POST `tap`.
- `api/_monster.js`: penentuan jadwal + skrip Lua. Satu skrip = satu perintah atomik: batas 10 tap/detik/pemain (token bucket, burst 30), tolak `seq` lama (kiriman ulang tidak terhitung dua kali), poin dari level saat ini, naik level/kalah, kontribusi per pemain, hitung pemain aktif 15 detik.
- `api/_redis.js`: klien REST Upstash tanpa dependensi.
- `assets/js/monster.js`: overlay kanvas + HUD (tanpa library). Aset Raja Batu (`assets/img/monster/*.webp`, ±250 KB) hanya diunduh saat ada event. Tap disimpan di `localStorage` saat offline lalu dikirim ulang.
- Interval kirim tap naik otomatis 2×/3×/5× saat pemain aktif ≥ 300/1.000/3.000.
- Hanya pengunjung yang sudah membuka festival (isi data + satu kata) yang bisa mengetuk; yang lain melihat monster + ajakan membuka festival.
- Wujud: `raja_batu` (sprite dari ilustrasi panitia) atau `lucu` (monster kartun gambar kode, ramah anak).

Redis (prefiks `m:`, kedaluwarsa 2 hari): `m:e:<event>` state (lvl, tenaga, total, kalah, naik), `m:u:<event>` kontribusi per pemain, `m:r:<event>:<pemain>` batas tap, `m:a:<event>` pemain aktif, `m:ip:<hash>` batas token, `m:cfg` salinan pengaturan.

### Mengaktifkan (sekali)

1. Vercel → project → **Storage** → **Create Database** → **Upstash for Redis** (Marketplace), wilayah Singapura (`ap-southeast-1`), lalu **Connect** ke project ini. Variabel `KV_REST_API_URL` dan `KV_REST_API_TOKEN` terisi otomatis. Redeploy.
2. Opsional: set `MONSTER_SECRET` (string acak panjang) untuk tanda tangan token pemain. Tanpa ini, rahasia diturunkan dari token Redis.
3. Panel admin → **Lawan Monster** → nyalakan **Fitur Lawan Monster aktif**, pilih pemicu, simpan. Status "Upstash Redis belum terhubung" berarti langkah 1 belum selesai.

Tanpa Redis, `/api/monster` menjawab `fase: mati` dan beranda tidak berubah sama sekali.

### Kapasitas & biaya (perkiraan)

Per pemain yang aktif mengetuk: 1 panggilan fungsi + 1 perintah Redis per interval. Penonton yang tidak mengetuk hanya memicu GET ber-cache CDN.

| Pemain aktif selama 20 menit | Interval | Panggilan fungsi ≈ perintah Redis |
|---|---|---|
| 200 | 1 dtk | ±240 ribu |
| 1.000 | 2 dtk | ±600 ribu |
| 3.000 | 5 dtk | ±720 ribu |

Kuota gratis: Vercel Hobby 1 juta panggilan fungsi/bulan (bila habis, **semua** fungsi `api/` berhenti sampai bulan berikutnya), Upstash gratis 500 ribu perintah/bulan (pay-as-you-go US$0,20 per 100 ribu). Untuk event ribuan pelajar: pakai Upstash pay-as-you-go dan pertimbangkan Vercel Pro pada bulan event, atau naikkan `monster_interval_ms` ke 2000–3000.

### Uji

```bash
npm i fengari --prefix ~/fengari            # sekali, di luar repo (tidak ikut deploy)
NODE_PATH=~/fengari/node_modules node --test tests/*.cjs
NODE_PATH=~/fengari/node_modules node tools/dev-server.cjs 8787   # Upstash tiruan otomatis di port 8789
# mulai event lewat /admin/ (sandi dari POST /__seed), lalu uji beban:
node tools/uji-beban-monster.cjs http://127.0.0.1:8787 400 20
```

Hasil lokal (dev server, Redis tiruan): 400 pemain + 400 pemantau selama 20 detik, 25.045 tap dikirim = 25.045 diterima, 0 galat, total tenaga konsisten. Angka latensi lokal tidak mewakili produksi; uji beban produksi hanya di luar jam event karena memakai kuota.

Checklist manual sebelum event: tombol Mulai sekarang di admin → monster muncul di 2 HP berbeda (Android kelas bawah + iPhone) → ketuk → bar naik di kedua HP → mode pesawat 10 detik sambil mengetuk → online lagi, tenaga bertambah sekali → menang → tombol live → Stop darurat menyembunyikan monster.
