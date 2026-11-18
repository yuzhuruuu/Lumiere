# Lumière Bar & Resto

Sistem informasi restoran dan reservasi — project akhir.

## Tech Stack

- **Frontend & Backend**: Next.js 16 (App Router)
- **Database & Auth**: Supabase (PostgreSQL, RLS, Storage)
- **Deployment**: Vercel
- **Version Control**: GitHub

## Instalasi Lokal

### Prerequisites

- Node.js 18.x atau lebih baru
- npm
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

Isi `.env.local` dengan `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY`.
Jangan pernah commit `.env.local`.

3. Jalankan migration dan seed sesuai `docs/panduan-supabase-nextjs.md`
   dan `docs/Panduan_Seed_Data_Lumiere.md`.

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

```
app/              # Halaman dan API routes Next.js
components/       # Komponen React reusable
lib/              # Supabase client, validasi, helper backend
supabase/         # Migration SQL dan seed
docs/             # Dokumentasi project
tests/            # Unit dan integration test
proxy.js          # Refresh sesi & proteksi route
.env.example      # Template environment variables
```

`.env.local` tidak di-commit.

## Dokumentasi

- Ringkasan status backend: `docs/backend-status.md`
- Kontrak REST API: `docs/api-reference.md`
- Desain database: `docs/database-design.md`
- Autentikasi: `docs/authentication.md`
- Workflow Git: `docs/git-workflow.md`
- Deploy Vercel: `docs/vercel-deployment.md`
- Pengujian integrasi: `tests/integration/README.md`

## Catatan

Kontrak API dan batas frontend/backend dijelaskan di `docs/repo-structure.md`.
Gunakan branch fitur + Pull Request sesuai `docs/git-workflow.md`.
