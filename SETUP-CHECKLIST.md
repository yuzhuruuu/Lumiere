# Setup Project - Checklist & Git Commands

## ✅ Yang Sudah Dikerjakan

### 1. Inisialisasi Next.js Project
- ✅ Next.js 16.4.3 dengan App Router
- ✅ JavaScript (bukan TypeScript)
- ✅ ESLint configured
- ✅ Build berhasil (`npm run build`)
- ✅ Dev server jalan (`npm run dev` di http://localhost:3000)

### 2. File Konfigurasi
- ✅ `.gitignore` - exclude node_modules, .env*.local, .next
- ✅ `.env.example` - template environment variables
- ✅ `package.json` - dependencies dan scripts
- ✅ `next.config.js` - Next.js config
- ✅ `.eslintrc.json` - ESLint config

### 3. Struktur Folder
```
Lumiere/
├── app/              # Next.js pages dan layouts
├── components/       # React components (ready untuk diisi)
├── lib/              # Utilities dan helpers (ready untuk diisi)
├── docs/             # Dokumentasi project
├── .env.example      # Template environment variables
└── README.md         # Panduan instalasi
```

### 4. Dokumentasi
- ✅ `README.md` - Cara install dan jalankan project
- ✅ `docs/git-workflow.md` - Aturan branch, commit, dan PR
- ✅ `docs/vercel-deployment.md` - Cara deploy ke Vercel

### 5. Verifikasi
- ✅ `npm run dev` berjalan tanpa error
- ✅ `npm run build` sukses
- ✅ ESLint configured

## 🚀 Git Commands - Commit Pertama

Jalankan perintah ini di terminal (satu per satu):

```bash
# 1. Cek status (pastikan semua file yang benar akan di-commit)
git status

# 2. Add semua file project (kecuali yang ada di .gitignore)
git add .

# 3. Commit pertama
git commit -m "chore: initial project setup

- Setup Next.js 16 with App Router and JavaScript
- Add ESLint configuration
- Create folder structure (app, components, lib, docs)
- Add documentation (README, git workflow, Vercel deployment)
- Add .gitignore and .env.example"

# 4. Cek remote repository (pastikan origin sudah terhubung)
git remote -v

# 5a. Jika belum ada remote, tambahkan (ganti <URL-REPO> dengan URL GitHub kamu):
git remote add origin <URL-REPO>

# 5b. Jika sudah ada remote, lanjut ke langkah 6

# 6. Push ke GitHub
git push -u origin main

# Jika branch default adalah 'master', gunakan:
# git push -u origin master
```

## 📝 Catatan Penting

### Jangan Commit File Berikut:
- ❌ `node_modules/` (sudah ada di .gitignore)
- ❌ `.env.local` (sudah ada di .gitignore)
- ❌ `.next/` (sudah ada di .gitignore)

### Setelah Push ke GitHub:
1. Cek GitHub - pastikan semua file sudah terupload
2. Pastikan **tidak ada** file `.env.local` atau secret di repo
3. Share URL repo ke tim

## 🌐 Deploy ke Vercel

Setelah push ke GitHub, ikuti panduan di `docs/vercel-deployment.md`:

1. Login ke https://vercel.com
2. Import repository dari GitHub
3. Vercel akan auto-detect Next.js
4. Klik Deploy
5. Dapat URL production (misal: `https://lumiere-resto.vercel.app`)

## 🎯 Langkah Selanjutnya (Setelah Setup)

1. **Konfirmasi Stack ke Dosen**
   - Verifikasi Supabase sebagai database
   - Update `.env.example` jika ada perubahan

2. **Setup Branch Development**
   ```bash
   git checkout -b develop
   git push -u origin develop
   ```

3. **Mulai Feature Development**
   - Setiap anggota bikin branch dari `develop`
   - Format: `feature/<nama>-<fitur>`
   - Contoh: `feature/andi-menu-page`

4. **Koordinasi Tim**
   - Baca `docs/git-workflow.md` bersama tim
   - Sepakati siapa ngerjain fitur apa
   - Setup Trello/Notion untuk task management (optional)

## ❓ Troubleshooting

### Build Error
```bash
# Hapus node_modules dan install ulang
rm -rf node_modules
npm install
npm run build
```

### Port 3000 Already in Use
```bash
# Matikan process yang pakai port 3000, atau gunakan port lain:
npm run dev -- -p 3001
```

### Git Push Rejected
```bash
# Pull dulu dari remote
git pull origin main --rebase
git push origin main
```

## 📞 Kontak

Jika ada masalah setup:
1. Cek dokumentasi di folder `docs/`
2. Tanya di grup tim
3. Buat issue di GitHub untuk tracking

---

**Setup Status**: ✅ COMPLETE - Ready untuk development!
