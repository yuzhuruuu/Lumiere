# Koneksi Supabase - Setup Documentation

## File yang Dibuat

### 1. `lib/supabase/client.js`
Klien Supabase untuk **browser** (Client Components).
- Dipakai di komponen dengan `"use client"`
- Menggunakan `createBrowserClient` dari `@supabase/ssr`
- Membaca cookie session dari browser
- RLS berlaku sesuai user yang login

**Kapan dipakai:** Di komponen interaktif yang butuh real-time updates atau dijalankan di browser.

### 2. `lib/supabase/server.js`
Klien Supabase untuk **server** (Server Components, Route Handlers, Server Actions).
- Menggunakan `createServerClient` dari `@supabase/ssr`
- Membaca cookie session dari server dengan `await cookies()`
- Bertindak sebagai user yang sedang login
- RLS berlaku - hanya bisa akses data sesuai permission user
- **Next.js 16**: `cookies()` bersifat async, jadi harus pakai `await`

**Kapan dipakai:** Default untuk semua operasi database di server (paling sering dipakai).

### 3. `lib/supabase/admin.js`
Klien Supabase **Admin** - MELEWATI RLS!
- Menggunakan `SUPABASE_SERVICE_ROLE_KEY` (secret key)
- **HANYA** untuk operasi khusus: update role, buat akun test, dll
- File ini menggunakan `'server-only'` - akan error jika diimport di kode browser
- Tidak membaca session user - bekerja sebagai superuser

**PENTING:** 
- Jangan pakai untuk operasi normal user
- Selalu cek authentication & authorization manual sebelum pakai
- Secret key TIDAK BOLEH masuk Git atau terkirim ke browser

### 4. `.env.example`
Template environment variables dengan nilai kosong.
- Di-commit ke Git sebagai dokumentasi
- Anggota tim copy ke `.env.local` dan isi dengan nilai sebenarnya
- Berisi: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

### 5. `app/test-koneksi/page.js`
Halaman test koneksi ke Supabase.
- Server Component yang membaca tabel `menu_categories`
- Menampilkan status koneksi dan jumlah data
- Jika tabel kosong: tampilkan "Belum ada data" (bukan error)
- Akses di: http://localhost:3000/test-koneksi

### 6. `jsconfig.json`
Konfigurasi path alias untuk JavaScript.
- Mengatur `@/*` sebagai alias untuk root directory
- Memungkinkan import seperti `@/lib/supabase/server`

## Test Koneksi

1. Pastikan file `.env.local` sudah dibuat dan diisi dengan nilai dari Supabase dashboard
2. Jalankan dev server: `npm run dev`
3. Buka browser: http://localhost:3000/test-koneksi
4. Harusnya muncul "✅ Terhubung ke Supabase"

**Jika tabel kosong:** Itu normal! Tabel `menu_categories` mungkin belum ada data. Halaman akan menampilkan "Belum ada data" dan tetap menunjukkan koneksi berhasil.

**Jika error:** Periksa:
- Environment variables sudah benar di `.env.local`
- Migration sudah dijalankan di Supabase SQL Editor
- URL dan API keys sesuai dengan project Supabase

## Aturan Penting

### Environment Variables
- ✅ `NEXT_PUBLIC_*` - Boleh dikirim ke browser
- ❌ `SUPABASE_SERVICE_ROLE_KEY` - HANYA di server, JANGAN kirim ke browser
- ❌ `.env.local` - JANGAN commit ke Git (sudah ada di .gitignore)
- ✅ `.env.example` - Boleh commit (tanpa nilai)

### Pilih Klien yang Tepat
```js
// Default: gunakan server client
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()

// Di Client Component: gunakan browser client
'use client'
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// Admin operation (jarang): gunakan admin client
import { supabaseAdmin } from '@/lib/supabase/admin'
// PASTIKAN sudah cek auth/authorization dulu!
```

### RLS (Row Level Security)
- Server client (`lib/supabase/server.js`) → RLS berlaku
- Browser client (`lib/supabase/client.js`) → RLS berlaku
- Admin client (`lib/supabase/admin.js`) → RLS TIDAK berlaku (bypass semua)

Jadi hampir selalu pakai server/browser client. Admin client hanya untuk kasus khusus.

## Next Steps

Setelah koneksi berhasil:
1. Buat middleware untuk refresh session dan proteksi routes
2. Buat halaman login/register
3. Buat endpoint API untuk operasi CRUD
4. Implementasi fitur sesuai database design

Lihat `docs/panduan-supabase-nextjs.md` untuk detail lebih lanjut.
