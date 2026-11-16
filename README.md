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

## Server data (Dokploy) & Sheet cadangan (MRKT-56)

Sejak 16 Nov 2026 data utama ada di **server data** Dokploy (`server/`, project **YCS 2026**, aplikasi **YCS Data**, `https://ycs-data.194-238-23-221.sslip.io`). Server ini menjalankan `apps-script/Code.gs` yang sama di memori (`server/gas-memori.cjs`), jadi aturan bisnisnya tidak berubah, tapi jawabannya ±0,3 dtk, bukan 2–3 dtk.

```
HP ─► Vercel api/*.js (sin1) ──/exec──► server data (Dokploy, /data/primer.json)
HP ─► /srv/monster (rewrite vercel.json) ─────────┘          │ tiap 3 dtk: baris baru → append, sel berubah → ganti isi tab
                                                             ▼
                                              Google Sheet (cadangan) ◄─ Apps Script primer-terapkan
```

- **Cadangan:** setiap perubahan diteruskan ke Google Sheet ±3 detik kemudian. Tab `Rekap` (rumus) tidak disentuh.
- **Edit lewat panel admin, bukan Sheet.** Editan langsung di Sheet akan tertimpa. Bila terlanjur mengedit Sheet, buka admin → Keamanan → **Ambil ulang dari Sheet**.
- **Bila server data mati:** permintaan baca (config, kata, stats, reveal) jatuh ke Apps Script (data cadangan); permintaan tulis menjawab "server sibuk" agar data tidak bercabang. Darurat: set env Vercel `YCS_DATA_URL=off` untuk kembali ke Apps Script penuh.
- **Impor awal:** saat volume `/data` kosong, server mengambil seluruh isi Sheet lewat `primer-ekspor`. Rahasia bersama ada di env Dokploy `PRIMARY_SECRET`; di `Code.gs` hanya hash SHA-256-nya.
- **Reset password admin:** `POST /internal/sandi-baru {"rahasia": PRIMARY_SECRET}` membuat password baru di tab **Admin** sel B2 (ikut diteruskan ke Sheet).
- Deploy: Dokploy membangun `server/Dockerfile` (konteks build = root repo) otomatis saat push ke `main`. Saat redeploy (±10 dtk), state disimpan dan perubahan yang belum terkirim diteruskan setelah server hidup lagi.
- Status: `GET /health` dan admin → Keamanan → **Data & cadangan**.

## Lawan Monster (MRKT-56)

Event kolaboratif di panggung Festival Satu Kata sebelum live. Monster muncul di tengah plaza dan **warga festival menyingkir dari area monster** (tidak ada yang menimpa atau berjalan menembus monster). Peserta mengetuk warga: tenaga turun dari langit ke warga yang diketuk lalu mengalir ke bar bersama. Target level tercapai → monster naik level & membesar. Setelah level terakhir, sinar dari langit, monster runtuh, muncul **"Monster Terkalahkan!"** + tombol live.

### Pemicu (panel admin → tab **Lawan Monster**)

| Pemicu | Kapan muncul | Kapan berakhir |
|---|---|---|
| `sebelum_live` (bawaan) | `monster_menit_sebelum` (bawaan 20) menit sebelum **setiap** jadwal di tab Jadwal Live | saat live dimulai |
| `jadwal` | `monster_waktu` | setelah `monster_durasi` menit |
| `manual` | hanya lewat tombol **Mulai sekarang** | setelah `monster_durasi` menit |

Tombol darurat: **Mulai sekarang** (event baru dari nol), **Stop darurat**, **Kembali ikut jadwal**. Berlaku ±1 detik. Semua waktu memakai jam server.

### Level & rumus

- Target per level `monster_target` (bawaan `5000,15000,40000`) atau rumus dasar × kali^(L−1). Poin per tap = nomor level (atau `monster_poin`). Ukuran = 1 + 0,3 × (L−1), maks 2,5×. Kelebihan tenaga saat naik level tidak dibawa.
- Rumus yang sama dipakai server dan pratinjau admin: `assets/js/monster-aturan.js`.

### 1 perangkat = 1 peserta, tiket & spin undian

- Ikut melawan hanya bisa setelah membuka festival (email harus ada di tab **Satu Kata**).
- Perangkat diberi ID acak (localStorage + cookie `ycs_perangkat`). Server mengikat **1 perangkat ↔ 1 email** secara permanen: email yang sama dari perangkat lain ditolak, dan perangkat yang sama tidak bisa dipakai email lain. Peserta ganti HP → admin → Lawan Monster → **Perangkat peserta** → Lepas ikatan.
- Sidik jari ringan (UA, layar, zona waktu, kanvas) + IP disimpan: tiket dari perangkat yang tampak sama ditandai `perangkat mirip #000x` di kolom Catatan untuk ditinjau panitia (tidak diblokir otomatis karena HP sekolah bisa identik).
- Setiap peserta yang menyumbang ≥ `monster_tiket_min` tenaga (bawaan 1) mendapat **1 tiket per event**, nomor `#0001`, `#0002`, … Tiket tampil di HUD peserta dan tercatat di tab **Tiket Monster**. Ringkasan event di tab **Monster Event**.
- **Spin undian saat live:** tab **Spin Undian** (lihat di bawah). Pemenang tidak bisa menang dua kali.
- Batasan jujur: orang yang membuka mode penyamaran / menghapus data browser mendapat ID perangkat baru, tapi emailnya tetap terikat ke perangkat pertama; orang dengan beberapa email + beberapa browser masih bisa mendapat lebih dari satu tiket (ditandai bila sidik jari + IP sama).

### Mode uji monster

Admin → Lawan Monster → **Mode uji monster** → durasi → **Mulai uji** → buka link `/?uji-monster=KODE#satu-kata` di HP. Event uji terpisah dari event asli: hanya terlihat oleh pembawa link (walau monster mati/STOP), tidak wajib membuka festival, perangkat tidak diikat, dan tiket uji (catatan `UJI`) tidak ditulis ke Sheet. Tiket uji bisa dicoba di tab Spin Undian (event berawalan "UJI").

### Spin Undian (tab terpisah)

- **Atur hadiah & peluang** (bisa dibuka di layar penuh lewat tombol ⚙): nama hadiah, stok (kosong = tanpa batas) dan **bobot**. Peluang keluar = bobot / total bobot hadiah yang stoknya masih ada. Hadiah yang habis otomatis keluar dari roda.
- **Peluang tiket menang:** sama rata, atau sebanding kontribusi (tenaga).
- Roda hadiah berputar dan berhenti di hadiah yang dipilih server (`crypto.randomInt`), bersamaan dengan gulungan nama pemenang.
- **Mode latihan:** hasil tidak dicatat, stok tidak berkurang.
- Status pemenang di tab Tiket Monster: `MENANG #n · <hadiah> · <waktu> WIB`. Pengaturan hadiah dicadangkan di tab **Hadiah Spin**.

### Anti-spam & beban

- Batas 10 tap/detik/pemain (token bucket, burst 30), tap dikirim per batch (interval 1 dtk, otomatis 2–5× saat pemain ≥ 300/1.000/3.000), `seq` anti-duplikat sehingga kiriman ulang setelah offline tidak terhitung dua kali, perangkat baru maks 300 / 10 menit per IP.
- Monster tidak lagi memakai fungsi Vercel per tap: `/srv/monster` di-rewrite langsung ke server data, jadi kuota 1 juta panggilan fungsi Vercel Hobby tidak terpakai untuk tap. Upstash tidak dipakai.

### Uji

```bash
node --test tests/*.cjs                       # 23 tes: Code.gs, monster (perangkat/tiket/spin), sinkron server data ↔ Sheet
node tools/dev-server.cjs 8787                # :8787 situs+api, :8788 server data, :8789 Sheet tiruan (GET /__sheet)
node tools/uji-beban-monster.cjs http://127.0.0.1:8787 400 20   # setelah seed {"kata":400} + Mulai sekarang
```

Hasil lokal: 400 pemain + 400 pemantau selama 20 detik, 0 galat, 400 tiket terbit dan diteruskan ke Sheet tiruan. E2E browser (scripts MRKT-56) 44/44, E2E lama MRKT-45 78/78.

Checklist sebelum event: admin → Mulai sekarang → monster muncul di 2 HP (Android kelas bawah + iPhone), warga menyingkir → ketuk di kedua HP → tiket muncul → mode pesawat 10 detik sambil mengetuk → online, tenaga bertambah sekali → menang → tombol live → spin di layar penuh → cek tab Tiket Monster di Sheet → Stop darurat.
