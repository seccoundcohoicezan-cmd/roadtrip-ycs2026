# roadtrip-ycs2026

Landing page **Youth Character Summit 2026**. Seluruh halaman ada di satu file statis `index.html`, dideploy otomatis oleh Vercel dari branch `main`.

## Struktur

```
index.html        # HTML + CSS + JS dalam satu file
assets/img/       # foto dokumentasi (WebP, versi 800px & 1600px)
```

## Mengubah konten

- **Data contoh & endpoint backend**: lihat objek `CONFIG` di bagian atas `<script>`. Kalau `demo: false`, label "Data contoh" disembunyikan.
- **Jadwal live**: elemen `<li class="live-item">` beserta atribut `data-start`/`data-end` (WIB).
- **Countdown**: atribut `data-countdown` pada elemen `.countdown`.
- **Warna & font**: variabel di `:root`.

## Menambah foto

Simpan dua ukuran WebP (lebar 800 px dan 1600 px) di `assets/img/` dengan pola nama `nama-800.webp` dan `nama-1600.webp`, lalu pakai `srcset`.
Pastikan ada izin publikasi dari orang yang tampil di foto.
