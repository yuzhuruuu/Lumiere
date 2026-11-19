# Lumière Bar & Resto — Sistem Informasi Restoran & Reservasi (Next.js + Supabase)

Aplikasi web full-stack untuk **Lumière Bar & Resto** yang mengintegrasikan antarmuka pelanggan, dashboard operasional staf, dan panel manajemen administrator dengan backend & database **Supabase** sesuai **PRD v0.2** dan **Database Design**.

---

## 1. Struktur Folder Proyek

```text
lumiere-bar-resto/
├── .env.local                          # Sudah terisi NEXT_PUBLIC_SUPABASE_URL & KEY proyek Anda
├── .env.example
├── middleware.ts                       # Proteksi rute & otorisasi peran (pelanggan / staf / admin)
├── package.json
├── docs/
│   ├── PRD_Lumiere_Bar_Resto_v0.2.docx
│   └── database-design.md
├── supabase/
│   ├── migrations/
│   │   ├── 20261031000001_init_schema.sql      # 12 tabel, constraint, trigger, & RPC
│   │   ├── 20261031000002_rls_policies.sql     # Kebijakan Row-Level Security (RLS)
│   │   ├── 20261031000003_storage.sql          # Bucket Storage publik 'restaurant-assets'
│   │   └── 20261031000004_auto_cancel_cron.sql # Jadwal pg_cron pembatalan otomatis pending
│   └── seed.sql                                # Data awal restoran, 16 meja, 26 menu, 25 akun demo
└── src/
    ├── types/database.ts               # Definisi tipe TypeScript seluruh entitas & enum
    ├── lib/
    │   ├── supabase/                   # Client, Server, & Middleware helper (@supabase/ssr)
    │   ├── utils.ts                    # Format Rupiah, waktu, tanggal, dan translator error PG
    │   └── validation.ts               # Skema validasi Zod (telepon ID, reservasi, pembayaran)
    ├── components/
    │   ├── Navbar.tsx                  # Navigasi adaptif sesuai peran pengguna
    │   ├── Footer.tsx
    │   ├── BarcodeSVG.tsx              # Generator barcode Code128B vektor untuk tiket check-in
    │   └── StatusBadge.tsx
    └── app/
        ├── page.tsx                    # Beranda publik: profil restoran, jam buka, area meja, menu unggulan
        ├── menu/page.tsx               # Katalog menu digital dengan filter kategori & pencarian
        ├── login/page.tsx              # Login + tombol isi cepat akun demo (Pelanggan, Staf, Admin)
        ├── register/page.tsx           # Registrasi akun pelanggan baru
        ├── profil/page.tsx             # Kelola profil pengguna
        ├── reservasi/page.tsx          # Wizard reservasi 4 langkah + cek meja + min order Rp300.000
        ├── riwayat/page.tsx            # Daftar riwayat reservasi pelanggan
        ├── riwayat/[id]/page.tsx       # Detail reservasi, tiket barcode SVG, rincian tagihan, & batal
        ├── staf/page.tsx               # Dashboard staf + scanner verifikasi barcode check-in
        ├── staf/reservasi/[id]/page.tsx# Validasi (setujui/tolak), pindah meja, status dapur, & pembayaran
        ├── admin/                      # Panel Admin: rekap transaksi + CSV, menu, meja, jam buka, profil, user
        └── api/
            ├── health/route.ts         # Cek koneksi Supabase
            └── availability/route.ts   # Cek ketersediaan slot meja
```

---

## 2. Langkah Setup Database & Backend di Supabase

Sebelum menjalankan aplikasi frontend, pastikan skema database, RLS, dan data seed sudah diterapkan ke proyek Supabase Anda (`https://vlkfpdmqtwjetahetwwx.supabase.co`):

1. Buka **Supabase Dashboard** proyek Anda → menu **SQL Editor**.
2. Jalankan file-file berikut secara berurutan (copy-paste isi file lalu klik **Run**):
   1. `supabase/migrations/20261031000001_init_schema.sql`
   2. `supabase/migrations/20261031000002_rls_policies.sql`
   3. `supabase/migrations/20261031000003_storage.sql`
   4. `supabase/migrations/20261031000004_auto_cancel_cron.sql` *(opsional jika ekstensi `pg_cron` aktif)*
   5. `supabase/seed.sql` *(mengisi profil restoran, jam operasional, 7 kategori, 26 menu, 16 meja, dan 25 akun demo)*

> **Catatan Opsional (`SUPABASE_SERVICE_ROLE_KEY`)**:  
> Secara default, seluruh fitur aplikasi berjalan penuh menggunakan `NEXT_PUBLIC_SUPABASE_ANON_KEY` (`sb_publishable_...`) berkat fungsi RPC `create_reservation` dan `generate_invoice`. Jika Anda ingin fitur pengecekan visual meja terisi lintas pelanggan di Langkah 2 form reservasi aktif sebelum submit, tambahkan `SUPABASE_SERVICE_ROLE_KEY` dari **Project Settings → API** ke file `.env.local` (meski tanpa key tersebut, database constraint `no_double_booking` tetap 100% mencegah bentrok jadwal saat reservasi dikirim).

---

## 3. Menjalankan Aplikasi Next.js

```bash
# 1. Masuk ke folder proyek
cd lumiere-bar-resto

# 2. Install seluruh dependensi
npm install

# 3. Jalankan server development
npm run dev
```

Buka **`http://localhost:3000`** di browser Anda. Untuk mengecek apakah koneksi ke tabel database sudah siap, Anda juga dapat membuka **`http://localhost:3000/api/health`**.

---

## 4. Akun Demo Pengujian (Dari `seed.sql`)

Semua akun demo menggunakan password yang sama: **`LumiereDemo#2026`** (tersedia juga tombol pengisi otomatis di halaman `/login`):

| Peran | Email | Password | Akses Utama |
| :--- | :--- | :--- | :--- |
| **Pelanggan** | `pelanggan01@lumiere.test` (s/d `pelanggan20`) | `LumiereDemo#2026` | `/reservasi`, `/riwayat`, `/profil` |
| **Staf** | `staf1@lumiere.test` (s/d `staf3`) | `LumiereDemo#2026` | `/staf` (Validasi, Barcode Check-In, Dapur, Pembayaran) |
| **Admin** | `admin@lumiere.test` (dan `admin2@lumiere.test`) | `LumiereDemo#2026` | `/admin` (Rekap Transaksi, CRUD Menu/Meja/Jam/Profil/Akun) |
