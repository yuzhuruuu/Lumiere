# Panduan Backend: Next.js + Supabase

Untuk backend developer pemula di tim Lumière Bar & Resto.

## 1. Gambaran besar: di mana "backend"-nya?

```
Browser (React)  ──►  Next.js di Vercel  ──►  Supabase
 halaman, form         Route Handlers /        Auth (login)
                       Server Actions          Database (PostgreSQL + RLS)
                       = KODE BACKEND KITA     Storage (foto)
```

- **Supabase** menyediakan database, login, dan penyimpanan foto. Kamu tidak membuat server database sendiri.
- **Backend kita** adalah kode di Next.js yang berjalan di server (Route Handlers di `app/api/...` atau Server Actions). Tugasnya: memeriksa siapa yang meminta, memvalidasi input, lalu memerintahkan Supabase.
- **Database juga menjaga aturan** (constraint, trigger, RLS). Jadi ada beberapa lapis pengaman: frontend → backend Next.js → database. Jangan mengandalkan satu lapis saja.

## 2. Pertanyaanmu: bikin di local dulu atau langsung online?

**Rekomendasi untuk tim kita: langsung pakai satu project Supabase online (cloud), tanpa Supabase lokal.**

| | Supabase cloud (disarankan) | Supabase lokal (Docker) |
|---|---|---|
| Setup | Daftar, klik "New project", selesai | Install Docker + Supabase CLI, berat di laptop |
| Dipakai tim 3 orang | Semua tersambung ke database yang sama | Tiap orang punya database sendiri yang bisa berbeda |
| Vercel | Langsung tersambung | Tidak bisa dipakai Vercel |
| Risiko | Data dev tercampur jika ceroboh | Lebih aman bereksperimen |

Karena tim pemula, deadline 28 November, dan Vercel butuh database online, cloud lebih sederhana. Syaratnya satu disiplin: **hanya kamu (backend) yang mengubah struktur database**, dan setiap perubahan ditulis sebagai file migration di repo (lihat bagian 8). Kalau nanti sudah nyaman, Supabase lokal bisa ditambahkan; migration yang sama tetap bisa dipakai.

## 3. Langkah setup (sekali saja)

### 3.1 Buat project Supabase
1. Daftar di supabase.com (bisa login dengan akun GitHub), lalu **New project**.
2. Nama: `lumiere-resto`. Region: yang terdekat dengan Indonesia (Singapore).
3. Buat **Database Password** yang kuat, **simpan di password manager**. Jangan dikirim ke grup chat atau ditaruh di repo.
4. Tunggu 1-2 menit sampai project siap.

### 3.2 Jalankan migration
1. Buka **SQL Editor** → New query.
2. Salin isi `supabase/migrations/20261031000001_init_schema.sql` → **Run**.
3. Ulangi untuk `...000002_rls_policies.sql`, `...000003_storage.sql`, lalu `...000004_auto_cancel_cron.sql`. **Urutannya harus begitu.**
4. Periksa di **Table Editor**: 12 tabel muncul. Di **Storage**: bucket `restaurant-assets` ada. Di SQL Editor, jalankan `SELECT * FROM cron.job;` dan pastikan ada jadwal `expire-pending-reservations`.

Jika ada error merah, jangan lanjut ke file berikutnya. Salin pesan errornya lalu tanyakan. Khusus file 4: kalau `CREATE EXTENSION pg_cron` gagal, aktifkan "pg_cron" di **Database → Extensions**, lalu jalankan ulang file itu.

`supabase/seed.sql` (data contoh) **bukan migration**: jalankan terakhir, setelah keempat file di atas, dan hanya sekali. File ini belum dibuat.

Catatan: reservasi `menunggu_validasi` yang tidak divalidasi staf dalam 30 menit akan dibatalkan otomatis. Saat menguji lewat aplikasi, validasi dulu dengan akun staf, atau set `UPDATE restaurant_profile SET pending_timeout_minutes = 0;` selama pengembangan supaya data uji tidak hilang sendiri.

### 3.3 Pengaturan Auth untuk tahap pengembangan
Di **Authentication** → pengaturan provider Email:
- Matikan **Confirm email** selama pengembangan, supaya akun uji bisa langsung dipakai tanpa kotak masuk email asli. Nyalakan lagi kalau dosen memintanya.
- Di **URL Configuration**: Site URL `http://localhost:3000`. Setelah deploy, tambahkan URL Vercel ke daftar Redirect URLs.

### 3.4 Ambil kunci API
Di **Project Settings** → **API** (atau **API Keys**) kamu akan menemukan:

| Kunci | Nama lain | Boleh di browser? |
|---|---|---|
| Project URL | | Ya |
| `anon` key | *publishable key* | Ya (aman karena dibatasi RLS) |
| `service_role` key | *secret key* | **TIDAK PERNAH.** Hanya di server |

Nama di dashboard bisa berbeda tergantung versi tampilan; `anon` = publishable, `service_role` = secret.

### 3.5 Sambungkan ke Next.js

```bash
npm install @supabase/supabase-js @supabase/ssr zod server-only
```

Buat `.env.local` (file ini **tidak boleh di-commit**; pastikan ada di `.gitignore`):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # tanpa awalan NEXT_PUBLIC_, hanya terbaca di server
```

Buat juga `.env.example` berisi nama variabel yang sama dengan nilai kosong, lalu commit file itu supaya teman satu tim tahu apa yang harus diisi. Di Vercel, isi ketiga variabel yang sama di **Project Settings → Environment Variables**.

Aturan nama: variabel berawalan `NEXT_PUBLIC_` ikut terkirim ke browser. Jangan pernah memberi awalan itu pada secret key.

Tiga "klien" Supabase yang dipakai:

```js
// lib/supabase/client.js   → dipakai di komponen browser ("use client")
import { createBrowserClient } from '@supabase/ssr'
export const createClient = () =>
  createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
```

```js
// lib/supabase/server.js   → dipakai di Route Handler / Server Action / Server Component.
// Bertindak sebagai pengguna yang sedang login (membaca cookie sesi), jadi RLS berlaku.
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )
}
```

```js
// lib/supabase/admin.js    → HANYA untuk tugas khusus (mis. membuat akun uji). Melewati RLS!
import 'server-only'   // build akan gagal jika file ini ikut terimpor ke kode browser
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)
```

Selain tiga file itu, kamu perlu `middleware.js` yang menyegarkan sesi dan mengarahkan pengunjung tanpa login dari halaman dashboard ke `/login`. Minta AI agent-mu membuatnya mengikuti dokumentasi resmi "Supabase Auth with Next.js (SSR)", karena detailnya berubah antarversi.

### 3.6 Buat akun uji untuk tiap role
1. Daftar tiga akun lewat halaman daftar aplikasi, atau lewat **Authentication → Users → Add user**: `pelanggan@...`, `staf@...`, `admin@...` (email fiktif).
2. Semua akun otomatis berperan `pelanggan`. Naikkan role di **SQL Editor** (dijalankan sebagai pemilik database, jadi diizinkan):

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'admin@contoh.test';
UPDATE profiles SET role = 'staf'  WHERE email = 'staf@contoh.test';
```

Inilah satu-satunya cara menaikkan role pertama kali; setelah ada admin, admin bisa mengubahnya dari aplikasi.

## 4. Pola kode yang benar

### 4.1 Template Route Handler yang aman
Setiap endpoint mengikuti urutan yang sama: **login → role → validasi input → eksekusi → kembalikan hasil rapi**.

```js
// app/api/reservations/route.js
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  contactName: z.string().trim().min(2).max(100),
  contactPhone: z.string().regex(/^(\+62|62|0)8[0-9]{8,11}$/, 'Nomor telepon tidak valid'),
  contactEmail: z.string().email(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationMinutes: z.number().int().min(30).max(240).multipleOf(30),
  guestCount: z.number().int().min(1).max(50),
  tableId: z.number().int().positive(),
  items: z.array(z.object({
    menu_item_id: z.number().int().positive(),
    quantity: z.number().int().min(1).max(99),
  })).min(1),
})

export async function POST(request) {
  const supabase = await createClient()

  // 1. Login?  getUser() memverifikasi token ke server Auth (jangan pakai getSession() untuk keputusan keamanan)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Silakan login terlebih dahulu' }, { status: 401 })

  // 2. Validasi input (jangan percaya apa pun dari client)
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Data tidak valid', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const d = parsed.data

  // 3. Eksekusi: satu transaksi di database. customer_id diambil dari sesi, bukan dari body.
  const { data, error } = await supabase.rpc('create_reservation', {
    p_contact_name: d.contactName, p_contact_phone: d.contactPhone, p_contact_email: d.contactEmail,
    p_reservation_date: d.date, p_start_time: d.startTime, p_duration_minutes: d.durationMinutes,
    p_guest_count: d.guestCount, p_table_id: d.tableId, p_items: d.items,
  })

  // 4. Terjemahkan error database menjadi pesan yang ramah
  if (error) {
    if (error.code === '23P01') return NextResponse.json({ error: 'Meja sudah dipesan pada jam tersebut' }, { status: 409 })
    if (error.code === '23514') return NextResponse.json({ error: error.message }, { status: 422 })
    console.error('create_reservation gagal', error)               // detail hanya di log server
    return NextResponse.json({ error: 'Terjadi kesalahan, coba lagi' }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
```

Kode error PostgreSQL yang sering muncul: `23505` unique dilanggar (data ganda), `23503` foreign key salah, `23502` kolom wajib kosong, `23514` CHECK/aturan bisnis dilanggar, `23P01` benturan jadwal meja, `42501` tidak punya hak akses.

### 4.2 Aturan kapan memakai klien yang mana
- Default: **klien server biasa** (`lib/supabase/server.js`). Query berjalan sebagai pengguna itu, RLS ikut menjaga.
- `supabaseAdmin` hanya untuk hal yang memang melewati RLS dan tidak bisa dilakukan sebagai pengguna biasa (misalnya skrip pembuat akun uji). Setiap kali kamu mengetik `supabaseAdmin`, tanya diri sendiri: "Apakah aku sudah memeriksa siapa pemintanya?"
- Jangan menaruh logika harga/total/status di client. Hitung di server atau database.

## 5. Aturan main backend yang baik (ringkas)

1. **Jangan percaya client.** Role, harga, total, status, dan `customer_id` selalu ditentukan server/database. Body request hanya berisi data yang memang diisi pengguna.
2. **Cek login dan kepemilikan di server** pada setiap endpoint, bukan hanya menyembunyikan tombol di UI.
3. **Validasi di tiga lapis:** frontend (pesan ramah), backend (Zod), database (constraint). Kamu harus bisa mendemonstrasikan bahwa tiap lapis menolak data tidak valid secara mandiri, misalnya dengan mengirim request langsung lewat Postman/curl tanpa melewati form.
4. **Satu aksi bisnis = satu transaksi.** Kalau beberapa langkah harus berhasil bersama (seperti reservasi + item), bungkus dalam satu fungsi database.
5. **Biarkan database menolak data yang buruk, lalu terjemahkan errornya.** Jangan membuat "cek dulu baru insert" di kode (rawan race condition); coba insert dan tangani error `23P01`/`23505`.
6. **Jangan bocorkan detail internal ke pengguna.** Pesan error umum ke client, detail lengkap hanya di `console.error` (log Vercel).
7. **Secret tidak boleh masuk Git.** Sebelum commit, cek `git status`; `.env.local` tidak boleh muncul.
8. **Pagination** untuk daftar panjang: `.range(from, to)` di Supabase, plus `.order(...)`. Ambil kolom yang perlu saja (`.select('id, name')`), bukan semuanya.
9. **Setiap perubahan skema = file migration baru**, bukan klik-klik di dashboard (bagian 8).

## 6. Hal yang sering bikin bingung

- **Query mengembalikan data kosong padahal datanya ada** → hampir selalu RLS: pengguna itu memang tidak berhak melihatnya, atau belum login. RLS tidak menampilkan error, hanya hasil kosong. Uji dengan akun yang benar.
- **`error.code` kosong atau pesannya aneh** → cetak seluruh `error` di log server.
- **Perubahan dari satu akun tidak terlihat di akun lain** → itu RLS yang bekerja dengan benar. Bukan bug.
- **Tanggal dan zona waktu:** database menyimpan `date` dan `time` tanpa zona (jam lokal restoran); kolom `created_at` bertipe `timestamptz`. Tampilkan dalam WIB di UI.
- **Barcode:** isi barcode adalah `reservation_code` (misalnya `RSV-261031-00001`). Gambarnya dibuat di frontend dengan library barcode/QR; tidak perlu disimpan di database.

## 7. Cara menguji (bukti untuk dosen)

| Uji | Cara |
|---|---|
| Validasi frontend | Kosongkan form, isi harga negatif, tanggal lampau |
| Validasi backend | Kirim `POST /api/reservations` langsung dengan Postman, isi dengan data jelek |
| Constraint database | Jalankan INSERT jelek di SQL Editor (lihat contoh di bawah) |
| Autentikasi | Buka `/dashboard` tanpa login → diarahkan ke `/login` |
| Otorisasi / IDOR | Login pelanggan A, ganti ID reservasi di URL dengan milik B → tidak muncul |
| Role | Pelanggan membuka halaman admin → ditolak; pelanggan mencoba `UPDATE profiles SET role='admin'` → ditolak |
| Benturan jadwal | Dua akun memesan meja dan jam yang sama → yang kedua ditolak |
| Data bertahan | Refresh, logout-login, buka dari perangkat lain → data tetap ada |

Contoh uji constraint di SQL Editor:
```sql
INSERT INTO menu_items (category_id, name, price) VALUES (1, 'Uji', -5000);  -- harus ditolak (CHECK)
```

## 8. Alur kerja migration untuk tim

- Struktur database dianggap "dikunci" setelah disepakati PM dan anggota lain. Perubahan setelahnya masuk sebagai **file baru**, jangan mengedit file lama yang sudah dijalankan: `supabase/migrations/20261105000001_tambah_kolom_x.sql`.
- Urutan kerja: tulis SQL di file → jalankan di SQL Editor → commit file ke Git. Dengan begitu repo selalu bisa membangun ulang database dari nol (syarat dokumentasi dari dosen).
- Jangan mengubah tabel lewat Table Editor dashboard tanpa menuliskannya ke migration; teman yang membangun ulang database akan mendapat hasil berbeda.
- Opsional nanti: Supabase CLI (`supabase link`, `supabase db push`) menjalankan semua migration otomatis. Untuk tahap awal, SQL Editor sudah cukup.

## 9. Urutan kerja backend ke depan

1. Setup project Supabase + jalankan 3 migration + akun uji (bagian 3).
2. Sambungkan Next.js ke Supabase, buat tiga klien dan middleware.
3. Auth: halaman daftar/login/logout, proteksi dashboard, redirect berdasarkan role.
4. Endpoint publik (baca): profil restoran, menu, meja, jam operasional.
5. Alur reservasi pelanggan: cek ketersediaan meja, `create_reservation`, riwayat, barcode.
6. Staf: jadwal, validasi, check-in, ganti meja, status pesanan.
7. Tagihan dan pembayaran: `generate_invoice`, catat DP dan pelunasan.
8. Admin: CRUD menu (+ unggah foto ke Storage), meja, jam operasional, rekap transaksi.
9. Seed data (min. 5 per tabel, semua status), deploy ke Vercel, uji di URL Vercel.
