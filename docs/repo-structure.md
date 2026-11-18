# Struktur Repo & Pembagian Frontend/Backend

Dokumen ini menjelaskan struktur repo Lumière dan batas pekerjaan tim frontend
dan backend.

---

## 1. Kesimpulan

Repo ini adalah **satu aplikasi Next.js full-stack**, bukan *monorepo* dalam arti
teknis (belum memakai npm workspaces / Turborepo).

- **Frontend**: halaman React di `app/` (kecuali `app/api`), `components/`, CSS.
- **Backend**: `app/api/`, `app/actions/`, `lib/`, `supabase/`, `proxy.js`.
- **Shared**: `docs/`, `package.json`, konfigurasi root.

Untuk proyek ini (Next.js + Supabase, tim 3 orang), struktur ini **sudah benar
dan disarankan**. Frontend dan backend tetap bisa dikerjakan paralel karena
dipisahkan oleh folder, bukan oleh repo/aplikasi berbeda.

---

## 2. Peta folder dan pemiliknya

| Path | Pemilik | Isi |
|---|---|---|
| `app/page.js`, `app/layout.js`, `app/globals.css` | Frontend | Halaman utama & layout |
| `app/login/`, `app/register/` | Frontend | Halaman autentikasi |
| `app/dashboard/pelanggan/` | Frontend | Dashboard pelanggan |
| `app/dashboard/staf/` | Frontend | Dashboard staf |
| `app/dashboard/admin/` | Frontend | Dashboard admin |
| `app/check-seed/`, `app/test-koneksi/` | Frontend/Backend | Halaman bantu pengujian |
| `components/` | Frontend | Komponen React reusable |
| `app/api/**` | Backend | Seluruh REST API |
| `app/actions/auth.js` | Backend | Server Actions register/login/logout |
| `lib/supabase/` | Backend | Client Supabase (browser/server/admin) |
| `lib/auth/` | Backend | Helper otorisasi & role |
| `lib/validations/` | Backend | Schema Zod |
| `lib/utils/` | Backend | Helper tanggal, tagihan, pencarian |
| `supabase/` | Backend/Database | Migration SQL & seed |
| `proxy.js` | Backend | Refresh sesi & proteksi route |
| `docs/` | Shared | Dokumentasi tim |
| `package.json`, `next.config.js`, `jsconfig.json` | Shared | Konfigurasi aplikasi |

**Aturan kerja:**

1. Frontend **tidak** mengubah file backend (`app/api`, `lib/supabase`,
   `supabase/`, `proxy.js`) tanpa koordinasi.
2. Backend **tidak** mengubah halaman/komponen frontend tanpa koordinasi.
3. Jika kontrak API berubah, backend wajib memperbarui
   `docs/api-reference.md` dan memberi tahu frontend.
4. Gunakan branch fitur + Pull Request sesuai `docs/git-workflow.md`.

---

## 3. Kenapa tidak dipisah `frontend/` dan `backend/`?

Next.js App Router memang menggabungkan halaman dan API dalam satu aplikasi:

- Satu kali deploy (Vercel) untuk frontend + backend.
- Cookie sesi Supabase otomatis same-origin — tidak perlu CORS.
- Tidak ada duplikasi tipe/schema dan konfigurasi environment.
- Lebih sederhana untuk tim yang baru belajar.

Struktur `app/api/...` sudah menjadi pemisah backend yang jelas tanpa perlu
folder `backend/` terpisah.

---

## 4. Jika memang meminta monorepo sebenarnya

Monorepo teknis dipakai jika frontend dan backend adalah **aplikasi terpisah**
(misalnya frontend Vite/React, backend Express/Nest) atau perlu deploy terpisah.
Bentuknya seperti:

```
lumiere/
├── apps/
│   ├── web/          # frontend
│   └── api/          # backend
├── packages/
│   └── shared/       # tipe, validasi, konstanta bersama
├── package.json      # npm workspaces
└── turbo.json        # opsional
```

Konsekuensinya:

- Perlu konfigurasi npm workspaces / Turborepo.
- Environment variable dan build pipeline terpisah.
- Perlu CORS dan strategi autentikasi lintas domain.
- Dua deployment (frontend dan backend).
- Setup lebih rumit untuk tim pemula.

**Rekomendasi:** tetap gunakan struktur satu aplikasi Next.js saat ini kecuali
ada ketentuan tertulis dari dosen/PM yang mewajibkan monorepo terpisah.

---

## 5. Alur deploy

- Vercel membaca root repo → build seluruh aplikasi Next.js.
- API tersedia di domain yang sama: `/api/...`.
- Supabase menangani Auth, Database, dan Storage.
- Tidak ada server backend terpisah yang perlu di-deploy.