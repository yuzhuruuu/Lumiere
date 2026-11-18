# Deploy ke Vercel

Panduan deploy project ke Vercel.

## Prerequisites
- Akun Vercel (daftar di https://vercel.com)
- Repository sudah di-push ke GitHub

## Langkah Deploy

### 1. Connect Repository ke Vercel

1. Login ke Vercel: https://vercel.com
2. Klik **"Add New"** → **"Project"**
3. Pilih **"Import Git Repository"**
4. Pilih repository **Lumiere** dari GitHub
5. Klik **"Import"**

### 2. Configure Project

Vercel akan auto-detect Next.js. Settings default sudah benar:

- **Framework Preset**: Next.js
- **Root Directory**: `./`
- **Build Command**: `npm run build`
- **Output Directory**: (auto-detected)
- **Install Command**: `npm install`

### 3. Environment Variables

Tambahkan tiga environment variable yang dipakai aplikasi:

1. Klik **"Environment Variables"**
2. Tambahkan variable satu per satu:
   - `NEXT_PUBLIC_SUPABASE_URL` — URL project Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public key (boleh ke browser)
   - `SUPABASE_SERVICE_ROLE_KEY` — service role key (HANYA server, jangan pakai prefix `NEXT_PUBLIC_`)
   - Environment: Production, Preview, Development (pilih sesuai kebutuhan)

Lihat juga `docs/vercel-build-fix.md` untuk catatan build tanpa environment variables.
**PENTING**: Jangan commit file `.env.local` ke GitHub!

### 4. Deploy

1. Klik **"Deploy"**
2. Tunggu proses build (1-3 menit)
3. Setelah selesai, dapat URL production: `https://lumiere-resto.vercel.app`

## Auto Deploy

Setelah setup awal, Vercel akan otomatis deploy ketika:

- **Push ke `main`**: Deploy ke production
- **Push ke branch lain**: Deploy ke preview URL
- **Pull Request**: Deploy preview dan tampilkan di PR comment

## Custom Domain (Optional)

Jika ingin pakai domain sendiri:

1. Buka project di Vercel Dashboard
2. **Settings** → **Domains**
3. Tambah domain custom
4. Update DNS sesuai instruksi Vercel

## Monitoring

- **Dashboard**: https://vercel.com/dashboard
- **Logs**: Klik project → "Deployments" → pilih deployment → "Logs"
- **Analytics**: Tab "Analytics" untuk lihat traffic

## Troubleshooting

### Build Failed
- Cek logs di Vercel dashboard
- Pastikan `npm run build` sukses di local
- Cek environment variables sudah benar

### Runtime Error
- Cek "Functions" logs di dashboard
- Pastikan semua dependencies ada di `package.json`
- Cek environment variables production

## Team Collaboration

Invite anggota tim:
1. Project settings → **"Team"**
2. Invite by email
3. Role: **"Member"** (bisa lihat dan deploy)

Semua anggota bisa lihat deployment logs dan preview deployments dari PR mereka.
