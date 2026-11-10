# Panduan Seed Data — Lumière Bar & Resto

## File
`seed_lumiere_bar_resto.sql`

File ini berisi data dummy yang mengikuti rancangan 12 tabel database dan aturan PRD Lumière Bar & Resto. Jalankan setelah seluruh migration Supabase berhasil diterapkan.

## Ringkasan dataset

| Entitas | Jumlah data yang disiapkan |
|---|---:|
| Akun/profile pelanggan | 28 |
| Akun/profile staf | 2 |
| Akun/profile admin | 1 |
| **Total profile** | **31** |
| Restaurant profile | 1 (dibatasi desain database) |
| Operating hours | 7 (Minggu–Sabtu) |
| Menu categories | 8 |
| Menu items | 32 |
| Dining tables | 20 |
| Reservations | 28 |
| Reservation items | 84 |
| Orders | 20 |
| Invoices | 20 |
| Payments | 22 |
| Reservation status logs | Dibuat otomatis oleh trigger |

Tabel `profiles`, `menu_items`, `dining_tables`, `reservations`, `reservation_items`, `orders`, `invoices`, dan `payments` memiliki 20 atau lebih data dummy. Tabel konfigurasi restoran dan jam operasional mengikuti jumlah baris yang diwajibkan oleh desainnya.

## Variasi status yang dicakup

**Reservasi (28):**
- menunggu_validasi: 4
- ditolak: 2
- dibatalkan: 4
- tidak_hadir: 2
- dikonfirmasi: 4
- check_in: 5
- selesai: 7

**Pesanan (20):**
- menunggu, disiapkan, disajikan, selesai, dibatalkan.

**Invoice (20):**
- belum_dibayar, dp_dibayar, lunas, dibatalkan.

**Pembayaran (22):**
- menunggu, berhasil, gagal.
- Metode: tunai, transfer, QRIS, dan kartu debit.
- Jenis: DP dan pelunasan.

## Akun untuk pengujian login

Semua akun demo memakai kata sandi yang sama:

`LumiereDemo#2026`

Akun administrator:
- Email: `admin@lumiere.test`

Akun staf:
- Email: `staf1@lumiere.test`
- Email: `staf2@lumiere.test`

Akun pelanggan:
- Email: `pelanggan01@lumiere.test` sampai `pelanggan28@lumiere.test`

Akun dibuat sebagai user Supabase Auth dengan email terkonfirmasi untuk kebutuhan pengujian lokal/demo. Jangan gunakan kredensial ini di produksi.

## Cara menjalankan

1. Pastikan migration 1 sampai 4 sudah dijalankan dan tidak ada error.
2. Buka **Supabase Dashboard → SQL Editor**.
3. Buat query baru, lalu buka dan salin seluruh isi file `seed_lumiere_bar_resto.sql`.
4. Jalankan query menggunakan koneksi tepercaya/SQL Editor, bukan dari browser atau client aplikasi.
5. Periksa hasil dengan query pemeriksaan yang tersedia di bagian akhir file SQL.
6. Uji login memakai salah satu akun demo di atas.

## Catatan penting

- `restaurant_profile.address`, nomor telepon, email kontak, dan seluruh identitas pelanggan merupakan data dummy. Ganti informasi profil restoran sebelum demonstrasi final.
- `photo_path` menu dibiarkan `NULL` karena foto belum diunggah ke Supabase Storage. Unggah gambar ke bucket `restaurant-assets` lalu isi path-nya jika ingin menampilkan foto.
- `pending_timeout_minutes` pada konfigurasi restoran diatur ke `0` agar empat reservasi berstatus menunggu validasi tidak otomatis dibatalkan ketika cron berjalan. Ini hanya untuk mempertahankan dataset demo. Untuk menguji aturan auto-cancel/konfigurasi operasional, ubah kembali menjadi `30` setelah demo.
- Data menu, meja, dan akun memakai ID/UUID khusus seed. Script menghapus dan membuat ulang hanya reservasi fixture dengan UUID khusus tersebut saat dijalankan kembali; tidak menghapus reservasi pengguna lain.
- Karena seed membuat akun langsung melalui `auth.users`, jalankan sebagai admin/SQL Editor. Jangan menjalankan file ini dari endpoint publik aplikasi.
- `reservation_status_logs` dihasilkan oleh trigger sehingga tidak diinsert manual.
- `reservation_items.unit_price` diisi otomatis oleh trigger dari harga menu yang tersimpan, sehingga snapshot harga konsisten dengan database.
- Pada aplikasi yang berjalan, pembuatan reservasi tetap harus menggunakan RPC `create_reservation(...)` agar pemeriksaan minimum pembelian terjadi dalam satu transaksi. Pembuatan invoice tetap menggunakan `generate_invoice(...)` sesuai hak akses staf/admin.
