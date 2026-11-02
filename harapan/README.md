# Satu Kata untuk Indonesia

Kampanye kini menjadi **Festival Satu Kata** di beranda (`/#satu-kata`). Pengunjung mengisi data (nama, sekolah, provinsi, email), mengetuk Saluran WhatsApp, lalu mengirim satu kata. Setelah itu festival terbuka. Setiap kiriman tampil sebagai satu warga kecil di plaza Bali (`assets/js/festival.js`, kanvas), balon harapan muncul bergantian satu per satu, dan ada pencarian nama serta kartu festival PNG. Satu email = satu warga.

| Alamat | Isi |
|---|---|
| `/#satu-kata` | Form data + kata; festival terkunci sampai terkirim |
| `/harapan/?display=1` | Layar acara: Festival penuh tanpa kunci, balon harapan bergantian, data diperbarui tiap 30 detik |
| `/harapan/` | Mengarah ke `/#satu-kata` |

Data disimpan di tab **Satu Kata** pada Google Sheet panitia (lewat `api/kata.js` → Apps Script). Kata kasar umum ditolak otomatis. Kata tambahan bisa diblokir di Admin → Pengaturan → Satu Kata. Kata yang sudah masuk disembunyikan dengan mengisi kolom `Tampil` = `TIDAK`.

Folder `supabase/` adalah arsip versi lama dan tidak dipakai lagi.
