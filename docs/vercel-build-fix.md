# Fix: Vercel Build Errors

## Masalah

Deployment Vercel gagal di tahap `npm run build` dengan 2 masalah:

### 1. useSearchParams Error
```
⨯ useSearchParams() should be wrapped in a suspense boundary at page "/login"
```

**Penyebab:**
- Next.js 16 melakukan prerendering untuk semua halaman di production build
- `useSearchParams()` adalah dynamic API yang membaca URL di client-side
- Saat prerendering, Next.js tidak tahu nilai searchParams dan memerlukan Suspense boundary untuk handling fallback

**Dampak:**
- Build gagal saat generate static pages untuk `/login`
- Error muncul di production build, tidak di development mode

### 2. Top-level Supabase Admin Client (Potensial)
```js
// lib/supabase/admin.js (SEBELUM)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  ...
)
```

**Penyebab:**
- Client dibuat di top-level module saat file diimport
- Jika diimport di halaman yang di-prerender, environment variables harus ada saat build time
- Vercel production build tidak memiliki `.env.local` - environment variables baru diload saat runtime

**Risiko:**
- Jika halaman yang menggunakan admin client di-prerender, build akan crash dengan error "Your project's URL and Key are required"
- Meskipun belum ada halaman yang pakai, ini bisa jadi landmine untuk future development

## Solusi

### 1. Wrap useSearchParams dengan Suspense

**File:** `app/login/page.js`

**Perubahan:**
```js
// SEBELUM: useSearchParams langsung di component utama
export default function LoginPage() {
  const searchParams = useSearchParams()
  const successMessage = searchParams.get('message')
  // ...
}

// SESUDAH: Extract ke component terpisah dan wrap dengan Suspense
function SuccessMessage() {
  const searchParams = useSearchParams()
  const successMessage = searchParams.get('message')
  
  if (!successMessage) return null
  return <div>{successMessage}</div>
}

function LoginForm() {
  // Form logic tanpa useSearchParams
  return (
    <>
      <Suspense fallback={null}>
        <SuccessMessage />
      </Suspense>
      {/* rest of form */}
    </>
  )
}

export default function LoginPage() {
  return <div><LoginForm /></div>
}
```

**Kenapa ini fix masalahnya:**
- Suspense boundary memberi tahu Next.js bahwa `SuccessMessage` component butuh client-side data
- Saat prerendering, Next.js skip component di dalam Suspense dan render fallback (`null`)
- Setelah hydration di browser, component di-render dengan searchParams yang sebenarnya
- Halaman bisa di-prerender tanpa error, dan tetap berfungsi dengan baik di client

### 2. Lazy-load Admin Client dengan Function

**File:** `lib/supabase/admin.js`

**Perubahan:**
```js
// SEBELUM: Top-level export
export const supabaseAdmin = createClient(...)

// SESUDAH: Lazy-loaded function
let adminClient = null

export function getSupabaseAdmin() {
  // Validasi environment variables dengan error message yang jelas
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL tidak ditemukan...')
  }
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY tidak ditemukan...')
  }
  
  // Lazy initialization - hanya buat saat dipanggil
  if (!adminClient) {
    adminClient = createClient(...)
  }
  
  return adminClient
}
```

**Kenapa ini fix masalahnya:**
- Client hanya dibuat saat fungsi `getSupabaseAdmin()` dipanggil, bukan saat import
- Environment variables hanya dicek saat runtime, tidak saat build time
- Build bisa sukses tanpa `SUPABASE_SERVICE_ROLE_KEY` karena belum ada kode yang memanggil fungsi ini
- Error message yang jelas membantu debugging jika ada masalah di production

**Cara pakai (untuk future development):**
```js
// SEBELUM
import { supabaseAdmin } from '@/lib/supabase/admin'
const { data } = await supabaseAdmin.from('profiles').select()

// SESUDAH
import { getSupabaseAdmin } from '@/lib/supabase/admin'
const admin = getSupabaseAdmin()
const { data } = await admin.from('profiles').select()
```

## Verifikasi

### Test Build Lokal
```bash
# Tanpa environment variables (simulasi Vercel build)
$env:NEXT_PUBLIC_SUPABASE_URL=""; $env:NEXT_PUBLIC_SUPABASE_ANON_KEY=""; $env:SUPABASE_SERVICE_ROLE_KEY=""; npm run build
✓ Build sukses

# Dengan environment variables (normal)
npm run build
✓ Build sukses
```

### Test Lint
```bash
npx eslint .
✓ No errors
```

### Checklist
- ✅ Build sukses tanpa environment variables
- ✅ Build sukses dengan environment variables
- ✅ ESLint clean
- ✅ useSearchParams wrapped in Suspense
- ✅ Admin client lazy-loaded dengan error handling
- ✅ Tidak ada secrets di code atau commit
- ✅ Branch `fix/vercel-build` pushed ke GitHub

## Deployment ke Vercel

1. Merge PR dari branch `fix/vercel-build` ke `main`
2. Vercel akan auto-deploy dari `main`
3. Build seharusnya sukses karena:
   - `/login` page bisa di-prerender dengan Suspense boundary
   - Admin client tidak dipanggil saat build time
   - Environment variables akan diload saat runtime

4. Setelah deploy, pastikan environment variables sudah diset di Vercel:
   - Project Settings → Environment Variables
   - Add `NEXT_PUBLIC_SUPABASE_URL`
   - Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Add `SUPABASE_SERVICE_ROLE_KEY`
   - Apply ke Production, Preview, dan Development

## Best Practices untuk Future Development

### 1. Dynamic APIs di Client Components
Selalu wrap dengan Suspense jika component bisa di-prerender:
- `useSearchParams()`
- `usePathname()` (kadang-kadang)
- Dynamic data fetching

```js
function MyDynamicComponent() {
  const searchParams = useSearchParams()
  // ...
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MyDynamicComponent />
    </Suspense>
  )
}
```

### 2. Server-side Clients yang Butuh Env Vars
Gunakan lazy initialization untuk client yang butuh secrets:

```js
// ❌ BAD: Top-level initialization
export const client = createClient(process.env.SECRET_KEY)

// ✅ GOOD: Lazy function
export function getClient() {
  if (!process.env.SECRET_KEY) {
    throw new Error('SECRET_KEY required')
  }
  return createClient(process.env.SECRET_KEY)
}
```

### 3. Test Build Tanpa Env Vars
Sebelum push ke production, selalu test:
```bash
# Clear env vars dan build
npm run build
```

Jika build gagal tanpa env vars, ada masalah yang perlu diperbaiki.

## References

- [Next.js: Missing Suspense Boundary](https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout)
- [Next.js: useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params)
- [Vercel: Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
