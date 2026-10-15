# Word Cloud Harapan — "Satu Kata untuk Indonesia"

Halaman `/harapan/` (contoh: https://roadtrip-ycs2026.vercel.app/harapan/). Peserta mengirim **satu kata harapan untuk Indonesia**, lalu semua kata digabung menjadi awan kata berbentuk tulisan **YOUTH / CHARACTER / SUMMIT / 2026**.

| Alamat | Isi |
|---|---|
| `/harapan/` | Form + awan kata + statistik |
| `/harapan/?display=1` | Mode layar proyektor (1920×1080): awan kata + kode QR ke form |
| `/harapan/?admin=1` | Panel admin (PIN): hapus kata, ekspor CSV |

Semua ada di satu file `harapan/index.html`. Database memakai Supabase (file SQL di folder `supabase/`).

## Mode demo (sebelum Supabase siap)

Selama `SUPABASE_URL` di `index.html` masih kosong, halaman berjalan dalam **mode demo**: data disimpan di browser (localStorage), sudah terisi ±120 kata contoh, dan ada label "Mode demo — data lokal". PIN admin demo: `1234`. Data demo tidak dibagikan antar perangkat.

## Langkah pasang dari nol

1. **Buat proyek Supabase.** Daftar di https://supabase.com → *New project*. Pilih region terdekat (Singapore). Simpan password database di tempat aman.
2. **Jalankan skema.** Buka *SQL Editor* → *New query* → tempel seluruh isi `supabase/schema.sql` → *Run*. Aman dijalankan ulang.
3. **Atur PIN admin.** Di SQL Editor, jalankan satu baris ini (ganti `GANTI_PIN` dengan PIN pilihanmu):
   ```sql
   insert into private.admin_pin (id, pin_hash) values (1, extensions.crypt('GANTI_PIN', extensions.gen_salt('bf'))) on conflict (id) do update set pin_hash = excluded.pin_hash, updated_at = now();
   ```
   Untuk mengganti PIN, jalankan baris yang sama dengan PIN baru. PIN hanya disimpan sebagai hash di server, tidak pernah ada di file HTML. Setelah 10 kali PIN salah dalam 15 menit, admin terkunci 15 menit (buka paksa: `delete from private.admin_fail;`).
4. **Salin kunci API.** *Project Settings → API*: salin **Project URL** dan **anon public key**, lalu isi di blok `ISI DI SINI` bagian atas `<script>` di `harapan/index.html`:
   ```js
   const SUPABASE_URL = 'https://xxxx.supabase.co';
   const SUPABASE_ANON_KEY = 'eyJ...';
   ```
   anon key memang **publik** (aman, dilindungi RLS). **Jangan pernah** memakai `service_role` key di sini.
5. **Push ke GitHub.** Commit lalu push ke repo ini; Vercel otomatis deploy ulang. Netlify atau GitHub Pages juga bisa: cukup sajikan repo sebagai situs statis, halaman ada di `/harapan/`.
6. **Cek Realtime (opsional).** `schema.sql` sudah mendaftarkan tabel `words` ke publikasi `supabase_realtime`. Kalau realtime tidak aktif, halaman tetap memperbarui data tiap 10 detik.

## Uji tampilan sebelum acara

1. Jalankan `supabase/seed-dummy.sql` di SQL Editor → 300 kata dummy masuk.
2. Buka `/harapan/?display=1` di layar proyektor, cek tulisannya terbaca dari belakang ruangan.
3. Hapus lagi dengan `supabase/hapus-dummy.sql` (hanya data `is_dummy = true` yang terhapus).

Di mode demo cukup buka `/harapan/?seed=300` untuk mengganti data contoh dengan 300 kata dummy (hanya di browser itu).

## Mengubah daftar kata kasar

- **Di halaman (cek cepat):** edit array `KATA_KASAR` (cocok persis satu kata) dan `KATA_KASAR_BERAT` (diblok juga bila muncul di dalam kata lain) di blok `ISI DI SINI`. Angka pengganti huruf (4→a, 1→i, 0→o, 3→e, 5→s, 7→t) dan huruf berulang ("anjiiing") sudah dinormalisasi otomatis. Jangan taruh kata pendek seperti "asu" di `KATA_KASAR_BERAT` karena akan ikut memblok "masuk".
- **Di server (yang benar-benar menjaga):** tambah lewat SQL Editor:
  ```sql
  insert into private.blocked_words (word, substring) values ('katabaru', false) on conflict do nothing;
  ```
  `substring = true` berarti kata itu juga diblok bila muncul di dalam kata lain. Hapus: `delete from private.blocked_words where word = 'katabaru';`

## Batas & keamanan

- Publik hanya bisa **menambah** dan **membaca** kata; ubah/hapus hanya lewat fungsi admin ber-PIN.
- Kata wajib huruf a–z, 2–20 huruf (dicek juga oleh database).
- Batas kirim: 30 kata per alamat IP per 10 menit (longgar karena peserta acara sering memakai Wi-Fi yang sama; tiap perangkat tetap dibatasi 1 kata), dan 120 kata per menit untuk seluruh situs. IP disimpan sebagai hash SHA-256 dan dibersihkan setelah 1 jam. Kalau perlu diubah, ubah angka `v_n >= 30` di fungsi `private.cek_kata_baru` pada `schema.sql`, lalu jalankan ulang file itu.
- "Satu perangkat satu kata" dijaga lewat localStorage (bisa dilewati dengan mode penyamaran); batas IP di server tetap berlaku.
