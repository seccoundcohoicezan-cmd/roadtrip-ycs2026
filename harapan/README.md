# Satu Kata untuk Indonesia

Kampanye kini ada di beranda (`/#satu-kata`): pengunjung mengirim satu kata gratis. Awan kata hasilnya terkunci (blur) dan terbuka setelah pengunjung mengetuk tombol Saluran WhatsApp YCS. Setelah terbuka, kartu kata (PNG 1080×1350) bisa diunduh.

| Alamat | Isi |
|---|---|
| `/#satu-kata` | Form kirim kata + awan kata terkunci |
| `/harapan/?display=1` | Layar acara: awan kata penuh tanpa kunci, diperbarui tiap 30 detik |
| `/harapan/` | Mengarah ke `/#satu-kata` |

Data disimpan di tab **Satu Kata** pada Google Sheet panitia (lewat `api/kata.js` → Apps Script). Kata kasar umum ditolak otomatis. Kata tambahan bisa diblokir di Admin → Pengaturan → Satu Kata. Kata yang sudah masuk disembunyikan dengan mengisi kolom `Tampil` = `TIDAK`.

Folder `supabase/` adalah arsip versi lama dan tidak dipakai lagi.
