# Status Backend — Lumière Bar & Resto

Dokumen ini merangkum seluruh pekerjaan backend (API, autentikasi, aturan bisnis)
dan sisa pekerjaan operasional. UI/dashboard adalah tanggung jawab frontend;
backend hanya menyediakan API dan aturan server.

Terakhir diperbarui: 18 November 2026

---

## 1. Ringkasan modul

| Modul | Status | Keterangan |
|---|---|---|
| Autentikasi & role | ✅ | Register, login, logout, proteksi role, akun nonaktif ditolak |
| Profil pengguna | ✅ | Lihat/ubah nama & HP sendiri |
| Katalog publik | ✅ | Restoran, jam operasional, kategori, menu, detail menu, meja |
| Reservasi pelanggan | ✅ | Cek ketersediaan, buat, riwayat, detail, batalkan |
| Reservasi staf | ✅ | Daftar/filter, validasi, reschedule, check-in, no-show, selesai, pindah meja |
| Tagihan (invoice) | ✅ | Generate, daftar, detail, batalkan tagihan belum dibayar |
| Pembayaran | ✅ | Catat DP/pelunasan dengan idempotency key, daftar/filter |
| Pesanan dapur | ✅ | Daftar pesanan, ubah status dengan validasi transisi |
| Admin katalog | ✅ | CRUD kategori, menu, meja, jam operasional, profil restoran |
| Admin pengguna | ✅ | Daftar, ubah role, aktif/nonaktifkan (pengaman admin terakhir) |
| Laporan | ✅ | Pendapatan, status invoice/reservasi, menu terlaris |
| Upload foto | ✅ | Supabase Storage, maksimal 2 MB, JPEG/PNG/WebP |
| Dokumentasi API | ✅ | `docs/api-reference.md` |

Jumlah route API: **35 file route** di `app/api/` (sekitar 45 method HTTP).

---

## 2. CRUD per resource

| Resource | Create | Read | Update | Delete |
|---|---|---|---|---|
| Kategori menu | ✅ | ✅ | ✅ | ✅ |
| Menu item | ✅ | ✅ | ✅ | ✅ |
| Meja | ✅ | ✅ | ✅ | ✅ |
| Profil restoran | – (1 baris) | ✅ | ✅ | – |
| Jam operasional | – (7 baris) | ✅ | ✅ (bulk) | – |
| Pengguna | – (via Auth) | ✅ | ✅ (role/status) | – |
| Reservasi | ✅ (pelanggan) | ✅ | ✅ (status/jadwal) | – (hanya status) |
| Item reservasi | ✅ (saat membuat reservasi) | ✅ | – | – |
| Pesanan | ✅ (otomatis saat invoice) | ✅ | ✅ (status) | – |
| Invoice | ✅ (`generate_invoice`) | ✅ | ✅ (batalkan) | – |
| Pembayaran | ✅ | ✅ | – | – |
| Profil sendiri | – | ✅ | ✅ | – |

Catatan desain database:
- Reservasi **tidak dihapus**, hanya diubah statusnya (audit trail).
- Menu/meja yang sudah dipakai transaksi tidak bisa dihapus (FK), gunakan
  `is_available = false` / `is_active = false`.
- Item pesanan dipilih pelanggan saat membuat reservasi. Staf tidak menambah
  item lewat API karena RLS memang membatasi; perubahan item hanya oleh admin.

---

## 3. Alur status reservasi

```
menunggu_validasi ──► dikonfirmasi ──► check_in ──► selesai
        │                   │
        ├──► ditolak        ├──► tidak_hadir
        └──► dibatalkan     └──► dibatalkan
```

- Transisi dijaga trigger `check_reservation_transition` (database).
- Reservasi `menunggu_validasi` otomatis dibatalkan `pg_cron` setelah
  `pending_timeout_minutes` (migration 4).
- Tagihan bisa dibuat setelah status minimal `dikonfirmasi`.
- Pembayaran mengubah status invoice: `belum_dibayar → dp_dibayar → lunas`.
- Tagihan hanya bisa dibatalkan jika belum ada pembayaran dan reservasi sudah
  `dibatalkan`/`tidak_hadir`.

---

## 4. Aturan bisnis yang dijaga server/database

- Benturan jadwal meja dijaga exclusion constraint (`23P01`), aman dari race
  condition dan sudah diuji dengan dua request paralel.
- Kapasitas meja, jam operasional, tanggal masa lalu, durasi, dan jumlah tamu
  divalidasi trigger database.
- Route API dan trigger database sama-sama menolak tanggal/jam yang sudah lewat
  pada hari yang sama. Trigger juga menolak reschedule ke jam yang sudah lewat;
  perpindahan meja saja tetap boleh untuk reservasi yang sedang berjalan.
- Minimum pembelian dicek saat commit transaksi pembuatan reservasi; response
  error menyertakan `subtotal`, `minimum_order`, dan `shortfall`.
- Harga item dibekukan dari `menu_items` oleh trigger, bukan dari angka client.
- Total tagihan dihitung database dari item, bukan angka dari client.
- Pajak **10%** (`restaurant_profile.tax_percentage`) ditambahkan ke subtotal:
  `total_amount = subtotal + tax_amount`. DP default 50% dari total.
- Pembayaran wajib `idempotency_key` unik; kelebihan bayar ditolak trigger.
- Role/status akun hanya bisa diubah admin; admin terakhir tidak bisa dinonaktifkan.
- Keputusan produk: pembuatan reservasi adalah alur pelanggan. Admin/staf tidak
  membuat reservasi baru; mereka memvalidasi, menjadwalkan ulang, memindahkan
  meja, dan memproses reservasi yang sudah ada.
- Akun `is_active = false` ditolak saat login, dashboard, dan semua API.
- Semua tanggal bisnis memakai zona waktu **Asia/Jakarta (WIB)**.
- Input pencarian dibersihkan sebelum masuk filter PostgREST.
- Pesan error ke client selalu berbahasa Indonesia; detail internal hanya di log server.
- Cek ketersediaan wajib login dan memakai agregat booking lintas pelanggan di
  server. Hanya `table_id`/`start_time`/`duration_minutes` yang dibaca; data
  kontak pelanggan tidak pernah dikembalikan.

---

## 5. Verifikasi yang sudah dilakukan

- `npm run build` ✅
- `npm run lint` ✅
- Unit test Vitest: **5 file, 41 test lulus** (`npm test`)
- Integration test database terhadap Supabase lokal: **21/21 lulus**
  (`npm run test:integration`)
  - reservasi + item + harga snapshot + status log
  - kapasitas, jam operasional, tanggal masa lalu, durasi/jumlah tamu
  - reservasi hari ini dengan jam sudah lewat, termasuk reschedule lewat trigger
  - benturan jadwal, slot bersambung, meja berbeda, tanggal berbeda
  - dua request paralel tidak menghasilkan double booking
  - minimum order, rollback saat gagal, menu tidak tersedia, meja nonaktif
  - RLS pelanggan lain dan request anonim
- Integration test API terhadap Next.js + Supabase lokal: **11/11 lulus**
  (`npm run test:integration:api`)
  - cek ketersediaan wajib login
  - reservasi lewat API menyimpan item dan pajak 10%
  - detail reservasi mengembalikan item dan `barcode_data`
  - meja yang sudah dipesan hilang dari ketersediaan, termasuk bagi pelanggan lain
  - benturan jadwal `409`, kapasitas/minimum order `422`, input tidak valid `400`
  - anonim `401` dan detail milik pelanggan lain `404`
- Integration test alur staf: **18/18 lulus**
  (`npm run test:integration:staff`)
  - pencarian kode barcode, validasi setuju/tolak dengan alasan
  - invoice otomatis 10% pajak, DP 50%, pelunasan sampai lunas
  - satu order per reservasi + transisi status pesanan dapur
  - check-in, penolakan check-in berulang, dan penyelesaian reservasi
  - pelanggan ditolak dari API staf/admin; staf ditolak dari API admin;
    admin dapat membaca rekap transaksi dan pengguna

Integration test hanya boleh dijalankan terhadap Supabase dan aplikasi
`localhost`/`127.0.0.1`; script menolak URL lain agar data production tidak
tersentuh.

- Query Supabase langsung (sesi staf/admin) ✅
  - daftar invoice + relasi reservasi/pembayaran
  - detail invoice + item + pembayaran
  - ringkasan operasional staf
  - update jadwal (bentuk query yang dipakai endpoint reschedule)
  - laporan menu terlaris dengan filter status reservasi

---

## 6. Sisa pekerjaan operasional (bukan coding)

1. **Commit & push** semua perubahan ke branch fitur, lalu PR.
2. **Deploy** ke Vercel dan uji di produksi.
3. Pastikan migration 1–5 sudah dijalankan di Supabase:
   - `SELECT * FROM cron.job;` → ada `expire-pending-reservations`
   - bucket `restaurant-assets` ada
4. Ubah `pending_timeout_minutes` dari `0` (nilai seed demo) menjadi `30`
   agar auto-cancel berfungsi.
5. Keputusan produk sudah diambil: admin/staf tidak membuat reservasi baru;
   route dan RLS tetap pelanggan-only. Tidak perlu migration RLS admin.
6. Opsional untuk nilai tambah:
   - rate limiting endpoint publik (butuh Redis/Upstash di serverless)
   - monitoring/log agregasi

---

## 7. Akun uji

| Role | Email | Password |
|---|---|---|
| Admin | `admin@lumiere.test` | `LumiereDemo#2026` |
| Staf | `staf1@lumiere.test` | `LumiereDemo#2026` |
| Pelanggan | `pelanggan01@lumiere.test` | `LumiereDemo#2026` |

Dokumentasi endpoint lengkap: **`docs/api-reference.md`**.
