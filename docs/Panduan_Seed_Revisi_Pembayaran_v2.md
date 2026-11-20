# Panduan Seed Data Lumière Bar & Resto — Revisi Alur Pembayaran

## File yang digunakan
- `seed.sql` — seed data demo yang diperbarui.
- `20261119000005_payment_workflow.sql` — migration tambahan untuk konfigurasi rekening/QRIS, pilihan pembayaran, bukti, dan RPC pengajuan pembayaran.
- `20261119000006_dp_deadline_and_payment_guards.sql` — batas bayar DP 15 menit, pagar check-in/selesai, pembatalan H-1, DP hangus, refund, dan RPC verifikasi pembayaran.
- PRD revisi `v0.3` — sumber aturan bisnis pembayaran yang terbaru.

## Urutan menjalankan
1. Jalankan semua migration yang sudah ada berurutan menurut nama file (termasuk `20261118000001` dan `20261119000001`).
2. Jalankan `20261119000005_payment_workflow.sql`, lalu `20261119000006_dp_deadline_and_payment_guards.sql`.
3. Jalankan seed `seed.sql` melalui Supabase SQL Editor / koneksi tepercaya.
4. Periksa jumlah dan status data dummy menggunakan query pemeriksaan pada bagian akhir seed.

## Konfigurasi pembayaran demo
Seed menambahkan konfigurasi dummy:
- Bank: BCA
- Nomor rekening: `0000000000` (dummy, bukan rekening untuk pembayaran)
- Nama rekening: Lumière Bar & Resto (DUMMY)
- Metode aktif: tunai, transfer, QRIS, kartu debit
- `qris_path`: `NULL`, karena QRIS asli belum diunggah

**Ganti nomor rekening, nama rekening, instruksi, dan unggah QRIS resmi sebelum demo. Jangan menggunakan data dummy ini untuk transaksi nyata.**

## Perubahan pada database
Migration tambahan:
- `restaurant_profile`: `bank_name`, `bank_account_number`, `bank_account_name`, `qris_path`, `available_payment_methods`, `payment_instructions`.
- `payments`: tipe transaksi menjadi text dengan constraint (`dp`, `penuh`, `pelunasan`); menambahkan `payment_choice`, `proof_path`, `selected_by`, `submitted_at`, `verified_at`; `paid_at` menjadi nullable untuk pembayaran yang belum diverifikasi.
- Bucket Storage private `payment-proofs`.
- RPC `submit_payment_request(...)` menghitung nominal DP/penuh/pelunasan dari invoice di database dan membuat status `menunggu`.
- RPC `attach_payment_proof(...)` mengaitkan file bukti yang sudah diunggah dengan pengajuan milik pelanggan.

## Dataset pembayaran
- Contoh pembayaran sebagian, menunggu verifikasi, gagal.
- DP terverifikasi.
- Pembayaran penuh 100%.
- DP dilanjutkan pelunasan.
- Metode beragam: tunai, transfer, QRIS, debit.
- `selected_by` diisi pelanggan pemilik reservasi; `recorded_by` hanya untuk pembayaran yang berhasil diverifikasi/dicatat staf.
- Bukti upload tidak dipalsukan; `proof_path` fixture tetap `NULL`.

## Perubahan seed pada revisi ini
- Tanggal fixture reservasi dimulai **besok**. Sebelumnya fixture memakai tanggal hari ini sehingga seed gagal ('Waktu reservasi hari ini sudah lewat') bila dijalankan setelah pukul 10.00 WIB.
- Ditambahkan fixture kebijakan DP: reservasi #10 dibatalkan setelah DP (refund menunggu proses staf) dan #11 tidak hadir setelah DP (DP hangus).
- Seed memanggil `public.backfill_money_flags()` di akhir untuk menandai DP hangus dan refund dari fixture.
- Invoice `belum_dibayar` pada fixture memiliki `dp_due_at` kosong sehingga tidak ikut dibatalkan otomatis saat demo.

## Catatan sebelum implementasi
Migration dan seed ini disusun untuk rancangan skema yang ada, tetapi **belum dijalankan pada project Supabase dan belum diuji end-to-end**. Migration 1–6 dan seed ini sudah dicoba pada PostgreSQL 16 lokal dengan skema `auth`/`storage`/`cron` tiruan. Jalankan pada project development terlebih dahulu dan pastikan migration 1–4 sesuai versi yang sedang dipakai. Alur verifikasi pembayaran (update status, `paid_at`, `verified_at`, dan `recorded_by`) tetap perlu diimplementasikan di dashboard staf/server.
