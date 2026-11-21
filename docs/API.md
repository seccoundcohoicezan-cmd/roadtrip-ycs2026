# API YCS 2026

Satu backend: server Dokploy (`server/`). Situs (Vercel) hanya file statis; `vercel.json` meneruskan `/api/*` ke server. Panggil selalu dengan path relatif (`/api/...`) dari halaman situs.

Semua respons JSON berbentuk `{ok: true, ...}` atau `{ok: false, error: "<kode>"}`.

| Status HTTP | Arti |
|---|---|
| 200 | berhasil (`ok: true`) |
| 400 | `validation`: body/aksi tidak valid |
| 401 | `sesi_habis` / `sandi_salah` |
| 422 | galat bisnis lain (mis. `kata_ditolak`, `email_terdaftar`, `kuota_habis`) |
| 425 | `belum_waktunya` (reveal sebelum pengumuman; ada header `Retry-After`) |
| 429 | `rate_limit` / `terlalu_banyak` |
| 503 | `busy`: server baru hidup / sedang impor |

Formulir mengirim `requestId` (UUID) agar kiriman ulang tidak tercatat dua kali. `perangkat` = ID acak di `localStorage.ycs_perangkat`. Field `website` adalah honeypot (harus kosong).

## Baca (GET, di-cache CDN)

| Endpoint | Cache | Isi |
|---|---|---|
| `GET /api/config` | 30 dtk | pengaturan publik: `pengumuman`, `fase` (`pra`/`pasca`), `live[]`, `linkLive`, `klaim`, `survei`, `dana`, `event`, `saluran`, `acara`, `popup`, `monster` |
| `GET /api/now` | — | `{now}` jam server (ms) untuk hitung mundur |
| `GET /api/stats` | 120 dtk | `road {current, target}`, leaderboard `provinsi[]`, `kota[]` |
| `GET /api/reveal` | 5 mnt | `finalis[]` setelah `waktu_pengumuman`; sebelum itu 425 |
| `GET /api/kata` | 60 dtk | awan kata `kata[[kata, n]]`, warga festival `orang[[nama, kata, provinsi, karakter]]`, `total` |
| `GET /api/pemenang` | 20 dtk | pemenang spin `[{nama: "Ani L.", provinsi, hadiah, waktu, ke}]` (tanpa email) |
| `GET /api/monster` | 1–15 dtk | status Lawan Monster (lihat di bawah). `?uji=KODE` untuk mode uji (tanpa cache) |

## Kirim (POST, body JSON)

| Endpoint | `aksi` | Field |
|---|---|---|
| `POST /api/kata` | `kirim` | `nama, sekolah, email` **atau** `wa` (No. WhatsApp), `provinsi, kata, karakter, channelClicked, consent, ref, requestId, website, perangkat` |
| `POST /api/dana` | `akses` · `kirim` | `kodeAkses, nama, email, wa, sekolah, kota, provinsi, ref, requestId, consent, website, perangkat` |
| `POST /api/klaim` | `cek` · `verifikasi` | `kode, email, perangkat` |
| `POST /api/survei` | `kirim` | `destinasi, kegiatan, waktu, status, provinsi, impian, email, ref, requestId, website, perangkat` |
| `POST /api/twibbon` | — | `name, school, email, frame (delegasi\|squad), requestId, channelClicked, consent, city, province, ref` (fitur lama) |
| `POST /api/admin` | `admin-login`, `admin-data`, `admin-simpan-pengaturan`, `admin-simpan-live`, `admin-impor`, `admin-ekspor`, `admin-ganti-sandi`, `admin-keluar`, `admin-primer` | semua selain login butuh `token` (sesi 6 jam) |

Field di luar daftar dibuang server. Aturan validasi (panjang, format email, kata terlarang, 1 email = 1 warga, kuota Dana Kaget) ada di `apps-script/Code.gs`.

`admin-primer` + `perintah`:
- `status`: status server & sinkron Sheet.
- `tarik-sheet`: muat ulang isi Sheet.
- `monster` + `data.aksi`:
  - `tiket`, `spin` (+`latihan`), `spin-info`, `spin-atur` (`hadiah[{nama, stok, bobot}]`, `peluang`)
  - **Skema hadiah (MRKT-62):** kode undian (`#0001`) dicadangkan saat peserta ikut menyerang (status `aktif`). Bila event berakhir tanpa Raja Batu tumbang (monster menang / kabur), semua kode event itu diubah menjadi `hangus · bos tidak tumbang`. `spin` non-latihan pada event yang bosnya tidak tumbang → `{ok:false, error:"bos_tidak_tumbang"}`. Berlaku juga untuk event uji.
  - `uji-mulai` (`menit`, `target`), `uji-stop`, `uji`
  - `lepas-perangkat` (`email`)

## Lawan Monster

`GET /api/monster` →
`{fase, nama, wujud, id, mulai, selesai, live, level, levelMaks, target[], poin[], skala[], tenaga, total, pemain, tiket, interval, hidup, totalWarga, nyawa (% hidup), hpMaks, jurusTarget[[nama, kata, nyawa]], jurus, hindarMs, jurusMs, jurusAnimMs, jurusDmgMaks, jurusKe, jurusJenis (tusuk|tebas|hentak|meteor — tiap jurus ke-3 = Hujan Meteor, serangan area; aksi `hindar` saat meteor = PERISAI), jurusBerikut, jurusInfo{jenis,…}, kalah, monsterMenang, uji?}`

`fase`:

| Nilai | Arti |
|---|---|
| `mati` | fitur off / STOP |
| `tidak_ada` | tidak ada event terjadwal |
| `tunggu` | hitung mundur ≤ 24 jam |
| `tanding` | event berjalan |
| `menang` | monster dikalahkan |
| `monster_menang` | nyawa warga habis |
| `habis` | waktu habis, monster kabur |

`POST /api/monster`:
- `{aksi: "masuk", perangkat, email | wa, fp, uji?}` → `{token, nama, tiket, saya, mati}`. Galat:
  - `belum_festival`
  - `perangkat_dipakai` (+`nama`)
  - `email_perangkat_lain`
  - `uji_berakhir`
- `{aksi: "tap", token, n (≤200), seq, e (id event), uji?}` → `{terima, dup, buang, saya, tiket, mati, status}`. Karakter tumbang → `mati: true`, `terima: 0`.
- `{aksi: "hindar", token, e, uji?}` → `{aman, ke}` hanya ≤ 2,5 dtk sebelum jurus (`bukan_waktunya` di luar itu).
- `{aksi: "saya", token, uji?}` → `{mati, matiKe, hp, hpMaks, sasaran, tiket, saya}` status karakter sendiri (dipanggil setelah tiap jurus).
  - Server membatasi 10 tap/dtk/pemain.
  - `seq` lama = duplikat (aman dikirim ulang).

## Internal (bukan untuk frontend)

- `GET /health`: status server & sinkron.
- `POST /internal/sandi-baru {rahasia}`: reset password admin.
- Alias lama: `/exec` (protokol Apps Script), `/monster`, `/monster/pemenang`.

### Spin undian 2 tahap (admin, `POST /api/admin` → `admin-primer`, `perintah: monster`)
- `peserta {sumber: lolos|wildcard|semua|tiket, event?}` → `{peserta[{id, sumber, nama, sekolah, kota, provinsi, jalur, menang?}], hasil[], tunda}` — lolos = tab Finalis (impor), wildcard = tab Kode Wildcard.
- `spin-nama {sumber, event?, latihan}` → pemenang dipilih acak di server (crypto), pemenang lama tidak ikut; disimpan sebagai `tunda`.
- `spin-hadiah` → hadiah dipilih sesuai bobot & stok untuk pemenang `tunda`; hasil asli dicatat di `st.spin.hasil` + tab **Hasil Undian** (+ status tiket bila sumber tiket).
- `spin-batal`, `hadiah-gambar {id, gambar: data:image/webp|png;base64 ≤200 KB}` (foto diperkecil & latarnya dihapus di browser admin).
