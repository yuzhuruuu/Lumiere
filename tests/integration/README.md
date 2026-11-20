# Integration Test Reservasi

Tiga suite ini menguji kontrak database, API reservasi, dan alur staf terhadap
**Supabase lokal** dan aplikasi Next.js lokal. Semuanya menolak URL non-localhost
supaya tidak pernah membuat data uji di production.

## Prasyarat

1. Supabase lokal berjalan dan semua migration sudah diterapkan (1–4,
   `20261118000001`, `20261119000001`, `20261119000005`, `20261119000006`).
2. Untuk `api-reservations.mjs` dan `staff-reservations.mjs`, jalankan Next.js
   dengan environment Supabase lokal, misalnya:

   ```powershell
   $env:NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
   $env:NEXT_PUBLIC_SUPABASE_ANON_KEY = '<anon-key-lokal>'
   $env:SUPABASE_SERVICE_ROLE_KEY = '<service-role-key-lokal>'
   npm run dev -- -p 3000
   ```

   Jangan commit nilai key. Ambil nilai lokal dari `npx supabase status -o json`
   dan salin hanya ke environment shell/CI.

3. Set environment test di shell yang menjalankan test:

   ```powershell
   $env:TEST_SUPABASE_URL = 'http://127.0.0.1:54321'
   $env:TEST_SUPABASE_ANON_KEY = '<anon-key-lokal>'
   $env:TEST_SUPABASE_SERVICE_ROLE_KEY = '<service-role-key-lokal>'
   $env:TEST_APP_URL = 'http://localhost:3000' # untuk suite API dan staf
   ```

## Menjalankan

```powershell
npm run test:integration
npm run test:integration:api
npm run test:integration:staff
```

## Cakupan

- `reservations.mjs`: reservasi + item + harga snapshot, kapasitas, jam
  operasional, tanggal/durasi/jumlah tamu, reservasi hari ini yang jamnya sudah
  lewat, reschedule ke jam lewat, minimum order, menu nonaktif, meja nonaktif,
  benturan jadwal, slot bersambung, dua request paralel, status log, RLS,
  dan admin membuat reservasi untuk pelanggan terdaftar.
- `api-reservations.mjs`: login, cek ketersediaan lintas pelanggan, create +
  tagihan 10% pajak, detail + barcode, `409` benturan, `422` kapasitas/minimum
  order, `400` input tidak valid, anonim `401`, dan detail milik pelanggan lain
  `404`.
- `staff-reservations.mjs`: pencarian kode barcode, validasi setuju/tolak,
  invoice + pajak 10%, satu order per reservasi + status dapur, DP 50%,
  pelunasan sampai lunas, check-in, penolakan check-in berulang, penyelesaian
  reservasi, rekap admin, dan pembatasan akses per peran.

Test membuat user, meja, kategori, dan menu dengan suffix unik. Data uji akan
terus bertambah di database lokal; reset project lokal jika ingin bersih.
