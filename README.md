# SUDUT CCTV

Aplikasi sederhana untuk mencatat laporan CCTV harian.

Alurnya hanya tiga langkah:

1. Pilih atau tulis nama device CCTV dan tanggal.
2. Masukkan lama downtime dalam jam dan menit.
3. Simpan; tabel otomatis menghitung uptime, downtime, dan persentasenya.

## Fitur

- Input device, tanggal, serta downtime `jam:menit`.
- Uptime dihitung otomatis dari 24 jam dikurangi downtime.
- Ringkasan per device: total uptime, total downtime, rata-rata per hari, persentase, dan status.
- Klik baris device untuk melihat rincian laporan hariannya, termasuk hapus laporan.
- Filter berdasarkan nama device, rentang tanggal, dan status; urutkan per nama atau downtime terbesar.
- Ekspor laporan ke Excel (`.xlsx`).
- Jika device dan tanggal yang sama dimasukkan lagi, laporan sebelumnya diperbarui.
- Data disimpan di local storage browser sehingga langsung bisa digunakan tanpa konfigurasi database. Perubahan akan tersinkronisasi antar-tab pada browser yang sama, tetapi belum dibagikan otomatis ke komputer atau browser lain.

## Menjalankan aplikasi

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

## Perintah verifikasi

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Catatan data

Versi ini sengaja ringan. Data tersimpan pada browser yang digunakan. Jika nantinya laporan perlu dipakai bersama oleh beberapa operator, aplikasi dapat dihubungkan ke database tanpa mengubah alur inputnya.
