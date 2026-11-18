# Alur Lawan Monster (setelah daftar)

```mermaid
flowchart TD
  A[Buka situs] --> B[Isi form Festival Satu Kata:<br/>nama, sekolah, provinsi,<br/>EMAIL atau NO. WHATSAPP, satu kata, pilih karakter]
  B --> C[Ketuk Saluran WA + setuju] --> D[Jadi 1 WARGA = 1 KARAKTER di plaza]
  D --> E{Monster muncul?<br/>20 mnt sebelum live / jadwal / Mulai sekarang}
  E -- belum --> E1[Hitung mundur di panggung & banner]
  E -- ya --> F[Masuk event: 1 perangkat = 1 peserta<br/>karaktermu ditandai KAMU]
  F --> G[Ketuk MONSTER atau WARGA yang berdiri<br/>= tenaga, tap meleset tidak dihitung]
  G --> H[Tenaga bersama naik → level naik → monster membesar]
  G --> T[Tiket undian #000x terbit 1x per event]
  F --> J0[Server mengumumkan SASARAN jurus berikutnya<br/>tanda bidik merah · monster mendekati & mengejar sasaran]
  J0 --> J[Peringatan jurus: AWAS! / KAMU jadi sasaran!]
  J --> K{Tekan HINDAR<br/>atau ketuk karaktermu?}
  K -- ya --> L[Pukulan MELESET, nyawa utuh]
  K -- tidak --> M{Kena pukulan?<br/>jumlah pukulan dikurangi PERISAI<br/>= tenaga tim sejak jurus lalu}
  M -- tidak --> G
  M -- ya --> M2[Nyawa −1 dari 5 ♥]
  M2 --> M3{Nyawa habis?}
  M3 -- belum --> G
  M3 -- ya --> N[Karaktermu TUMBANG:<br/>tidak bisa menyerang lagi di event ini<br/>tetap bisa nonton & ajak teman]
  L --> G
  H --> O{Target level terakhir tercapai?}
  O -- ya --> P[MONSTER TERKALAHKAN<br/>sinar langit + konfeti → ke live]
  N --> Q{Semua karakter tumbang?}
  Q -- ya --> R[MONSTER MENANG<br/>layar merah, langsung selesai]
  Q -- tidak --> G
  E --> S{Waktu habis?}
  S -- ya --> U[MONSTER KABUR]
  P --> V[Spin undian saat live: tiket → hadiah → daftar pemenang di landing]
  R --> V
  U --> V
```

## Aturan karakter

| Aturan | Keterangan |
|---|---|
| 1 pendaftar = 1 karakter | Identitas = email **atau** nomor WhatsApp (format 08…/+62… disamakan). 1 email/nomor = 1 warga. |
| 1 perangkat = 1 peserta | HP terikat ke satu identitas; ganti HP → admin "Lepas ikatan". |
| Populasi event | Semua warga festival. Jumlah hidup tampil di HUD: **Warga hidup X / Y**. |
| Nyawa | Tiap karakter punya `monster_hp_warga` nyawa (bawaan 5 ♥). Tiap pukulan −1, tumbang di 0. |
| Sasaran | Dipilih server SEBELUM jurus (diumumkan di status `jurusTarget`), diberi tanda bidik; monster mendekati & mengejar sasaran. |
| Jurus | Tiap `monster_jurus_detik` (bawaan 8 dtk). Jumlah pukulan = populasi awal × `monster_jurus_damage`% × skala level × (1 − perisai), minimal 1. |
| Perisai | Tenaga yang terkumpul sejak jurus sebelumnya ≥ `monster_perisai`% target level → menahan sampai 80%. |
| HINDAR | Hanya di jendela peringatan (≤ 2,5 dtk sebelum jurus). Pukulan ke karaktermu meleset untuk jurus itu. |
| Tumbang | Tap ditolak server (`mati: true`). Tidak bisa dibangkitkan dalam event yang sama. |
| Akhir | Monster kalah (target tercapai) · Monster menang (semua karakter tumbang) · Monster kabur (waktu habis). |

Endpoint: lihat `docs/API.md` → Lawan Monster (`masuk`, `tap`, `hindar`, `saya`).
