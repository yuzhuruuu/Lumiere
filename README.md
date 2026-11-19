# Lumière Bar & Resto

Sistem informasi restoran dan reservasi — project akhir.

**Produksi:** https://lumiere-barnresto.vercel.app

## Deskripsi Project

Lumière Bar & Resto adalah sistem informasi restoran berbasis web untuk
mengelola informasi publik, reservasi meja, pemesanan menu, validasi staf,
check-in dengan barcode, pencatatan pembayaran, serta rekap transaksi. Proyek
ini dibangun dengan Next.js dan Supabase sebagai satu aplikasi full-stack:
frontend dan backend berada dalam satu repository, dengan batas tanggung jawab
yang dijelaskan di `docs/repo-structure.md`.

Sistem mendukung tiga peran: pelanggan mengajukan reservasi dan memantau
statusnya, staf memvalidasi reservasi serta mengelola kedatangan dan
pembayaran, sementara administrator mengelola data operasional dan laporan.
Aturan bisnis utama—kapasitas meja, jam operasional, minimum order Rp300.000,
pajak 10%, DP 50%, dan pencegahan benturan jadwal—dijaga di server dan database
agar tetap konsisten meskipun request datang langsung dari client.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 18
- **Frontend**: TypeScript/TSX, Tailwind CSS, Lucide icons
- **Backend**: Route Handlers (`app/api`), Server Actions, Zod
- **Database & Auth**: Supabase (PostgreSQL, RLS, Storage, Auth)
- **Testing**: Vitest + skrip integrasi Node.js
- **Deployment**: Vercel
- **Version Control**: GitHub

## Fitur Utama

- Halaman publik: profil restoran, jam operasional, kategori, menu, dan meja.
- Pelanggan: registrasi/login, cek ketersediaan, buat reservasi + pilih menu,
  lihat barcode, riwayat, dan pembatalan.
- Admin: boleh membuat reservasi **atas nama pelanggan terdaftar** sesuai PRD,
  selain CRUD menu/kategori/meja/jam/profil/users dan rekap transaksi.
- Staf: validasi/penolakan reservasi, reschedule, pindah meja, invoice,
  pencatatan DP/pelunasan, check-in barcode, status pesanan, dan penyelesaian.
- Database: transaksi atomik, pajak 10%, DP 50%, minimum order Rp300.000,
  pencegahan benturan meja, riwayat status, dan RLS per peran.

## Instalasi Lokal

### Prerequisites

- Node.js 18.x atau lebih baru
- npm
- Docker (untuk Supabase lokal)
- Project Supabase (lokal atau cloud)

### Setup

1. Clone repository:

```bash
git clone <repository-url>
cd Lumiere
npm install
```

2. Setup environment variables:

```bash
cp .env.example .env.local
```

Isi `.env.local` dengan:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` hanya dipakai di server (`lib/supabase/admin.js`).
Jangan pernah commit `.env.local` atau memakai prefix `NEXT_PUBLIC_` untuk
service role key.

3. Jalankan keenam migration dan seed sesuai panduan:

- `docs/panduan-supabase-nextjs.md`
- `docs/Panduan_Seed_Data_Lumiere.md`

Migration terbaru:

```text
supabase/migrations/20261119000001_admin_create_reservation_for_customer.sql
```

4. Jalankan development server:

```bash
npm run dev
```

Buka http://localhost:3000.

## Perintah yang Tersedia

- `npm run dev` — development server
- `npm run build` — build production
- `npm run start` — jalankan build production
- `npm run lint` — ESLint
- `npm test` — unit test (Vitest)
- `npm run test:integration` — test database (Supabase lokal)
- `npm run test:integration:api` — test API reservasi (app + Supabase lokal)
- `npm run test:integration:staff` — test alur staf (app + Supabase lokal)

## Struktur Folder

```text
app/              # Halaman + API routes Next.js (satu app, bukan src/app)
components/       # Komponen React reusable
lib/              # Supabase client, validasi, helper backend
types/            # Tipe database TypeScript
supabase/         # Migration SQL dan seed
docs/             # Dokumentasi project
tests/            # Unit dan integration test
public/images/    # Aset gambar
proxy.js          # Refresh sesi & proteksi route
.env.example      # Template environment variables
```

`.env.local`, `.next/`, dan `node_modules/` tidak di-commit.

## Role & Hak Akses

| Role | Reservasi | Menu/Meja/Jam | User | Rekap |
|---|---|---|---|---|
| `pelanggan` | Buat untuk diri sendiri, lihat/batalkan milik sendiri | – | – | Terbatas |
| `staf` | Validasi, check-in, reschedule, pindah meja, invoice, pembayaran | – | – | Operasional |
| `admin` | Semua hak staf + buat reservasi untuk pelanggan | CRUD | Role/status | Penuh |

## Kontributor

| Nama | Peran | GitHub | Fokus |
|---|---|---|---|
| Herdi Rizky | Front End | [@IkiBOYY21](https://github.com/IkiBOYY21) — Collaborator | Halaman dan antarmuka pengguna |
| Annisa Yusri | Back End | [@yuzhuruuu](https://github.com/yuzhuruuu) | API, database, RLS, dan integrasi Supabase |
| Mahendra | Product Manager | [@mahendrarq28](https://github.com/mahendrarq28) — Collaborator | PRD, koordinasi, dan pengawasan deliverable |

## Deployment & Catatan Produksi

- Vercel deploy otomatis dari `main`.
- Setiap migration baru harus tetap dijalankan di Supabase production melalui
  SQL Editor bila Supabase GitHub integration tidak menjalankannya.
- Pastikan bucket Storage `restaurant-assets` tersedia bila upload foto dipakai.

## Dokumentasi

- Ringkasan status backend: `docs/backend-status.md`
- Kontrak REST API: `docs/api-reference.md`
- Desain database: `docs/database-design.md`
- Autentikasi: `docs/authentication.md`
- Struktur & batas FE/BE: `docs/repo-structure.md`
- Workflow Git: `docs/git-workflow.md`
- Deploy Vercel: `docs/vercel-deployment.md`
- Migration Supabase: `supabase/README.md`
- Pengujian integrasi: `tests/integration/README.md`

## Catatan

Gunakan branch fitur + Pull Request sesuai `docs/git-workflow.md`
(`feature/... → develop → main`). Jangan push langsung ke `main`.
