# Lumière Bar & Resto

Sistem Informasi Restoran dan Reservasi - Project Akhir

## Tech Stack
- **Frontend & Backend**: Next.js 15 (App Router)
- **Database**: Supabase (pending konfirmasi dosen)
- **Deployment**: Vercel
- **Version Control**: GitHub

## Instalasi Lokal

### Prerequisites
- Node.js 18.x atau lebih baru
- npm atau yarn

### Setup

1. Clone repository:
```bash
git clone <repository-url>
cd <folder-name>
```

2. Install dependencies:
```bash
npm install
```

3. Setup environment variables:
```bash
cp .env.example .env.local
```
Edit `.env.local` dan isi dengan nilai yang sesuai (akan diupdate setelah database final).

4. Jalankan development server:
```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

## Perintah Available

- `npm run dev` - Jalankan development server
- `npm run build` - Build untuk production
- `npm run start` - Jalankan production server
- `npm run lint` - Jalankan ESLint

## Struktur Folder

```
├── app/              # Next.js App Router (pages, layouts, API routes)
├── components/       # React components yang reusable
├── lib/              # Utilities, helpers, config
├── docs/             # Dokumentasi project
├── public/           # Static assets
└── .env.local        # Environment variables (tidak di-commit)
```

## Tim Development

- Backend Developer: 3 orang
- Workflow: Lihat `docs/git-workflow.md`

## Catatan

Project ini masih dalam tahap setup awal. Fitur bisnis akan ditambahkan setelah setup infrastruktur selesai.
