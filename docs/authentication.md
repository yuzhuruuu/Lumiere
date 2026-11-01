# Dokumentasi Autentikasi

## File yang Dibuat

### 1. **lib/validations/auth.js**
Schema validasi Zod untuk autentikasi:
- `registerSchema`: Validasi form registrasi (nama minimal 2 karakter, telepon format Indonesia, email valid, password minimal 8 karakter)
- `loginSchema`: Validasi form login (email dan password)

### 2. **app/actions/auth.js**
Server Actions untuk autentikasi:
- `register()`: Mendaftarkan user baru dengan `supabase.auth.signUp()`, mengirim metadata (`full_name`, `phone`) ke trigger database
- `login()`: Login user, membaca role dari tabel `profiles`, redirect ke dashboard sesuai role
- `logout()`: Logout user dan redirect ke `/login`

**Penting:** 
- Tidak mengirim field `role` dari form (selalu default `pelanggan` dari trigger database)
- Menggunakan `getUser()` bukan `getSession()` untuk keputusan keamanan
- Error diterjemahkan ke bahasa Indonesia tanpa bocorkan detail internal

### 3. **app/register/page.js**
Halaman registrasi dengan fitur:
- Form: nama lengkap, nomor telepon, email, password
- Validasi client-side dan server-side
- Status loading saat submit (button disabled)
- Tampilkan error per field dan error umum
- Redirect ke `/login` setelah berhasil dengan pesan sukses

### 4. **app/login/page.js**
Halaman login dengan fitur:
- Form: email dan password
- Tampilkan pesan sukses dari registrasi (query param `?message=`)
- Status loading saat submit
- Error handling yang jelas
- Auto redirect ke dashboard sesuai role setelah login

### 5. **proxy.js**
Middleware Next.js 16 (menggunakan fungsi `proxy` bukan `middleware`):
- Refresh session Supabase di setiap request
- Proteksi `/dashboard/*` - redirect ke `/login` jika belum login
- Proteksi role-based:
  - `/dashboard/admin` - hanya admin
  - `/dashboard/staf` - hanya staf dan admin
  - `/dashboard/pelanggan` - semua role yang login
- Redirect ke dashboard jika sudah login dan akses `/login` atau `/register`

**Catatan Next.js 16:** File bernama `proxy.js` dengan export fungsi `proxy()`, bukan `middleware.js`.

### 6. **app/dashboard/pelanggan/page.js**
Dashboard untuk role pelanggan:
- Server Component yang cek auth dan role
- Hanya pelanggan yang bisa akses
- Menampilkan nama user dan role
- Tombol logout
- Placeholder untuk fitur reservasi dan riwayat

### 7. **app/dashboard/staf/page.js**
Dashboard untuk role staf dan admin:
- Cek role: hanya staf dan admin
- Placeholder untuk fitur validasi reservasi, check-in, manajemen pesanan

### 8. **app/dashboard/admin/page.js**
Dashboard untuk role admin saja:
- Cek role: hanya admin
- Placeholder untuk fitur CRUD menu, meja, jam operasional, manajemen user

### 9. **components/LogoutButton.js**
Komponen logout button:
- Client Component dengan form action
- Memanggil Server Action `logout()`

## Alur Autentikasi

### Registrasi
1. User isi form di `/register`
2. Validasi dengan Zod (client + server)
3. `supabase.auth.signUp()` dengan metadata `full_name` dan `phone`
4. Trigger database `handle_new_user` otomatis buat profil dengan role `pelanggan`
5. Redirect ke `/login` dengan pesan sukses

### Login
1. User isi form di `/login`
2. Validasi dengan Zod
3. `supabase.auth.signInWithPassword()`
4. Baca role dari tabel `profiles` dengan klien server biasa (bukan admin)
5. Redirect ke dashboard sesuai role:
   - Admin → `/dashboard/admin`
   - Staf → `/dashboard/staf`
   - Pelanggan → `/dashboard/pelanggan`

### Akses Dashboard
1. Proxy (middleware) cek session dengan `getUser()`
2. Jika belum login → redirect ke `/login`
3. Baca role dari `profiles`
4. Cek akses berdasarkan role:
   - Admin bisa akses semua dashboard
   - Staf bisa akses dashboard staf (dan pelanggan jika perlu)
   - Pelanggan hanya dashboard pelanggan
5. Jika role tidak sesuai → redirect ke dashboard yang sesuai

### Proteksi Role di Server Component
Setiap halaman dashboard:
1. Cek `getUser()` - jika null redirect ke `/login`
2. Baca `profiles` untuk ambil role
3. Validasi role sesuai halaman
4. Jika tidak sesuai → redirect ke dashboard yang benar

## Keamanan

### ✅ Yang Sudah Diterapkan
- Validasi 3 lapis: client (HTML5 + React), server (Zod), database (constraint + trigger)
- `getUser()` untuk keputusan keamanan (bukan `getSession()`)
- Role tidak bisa diubah dari client (trigger database melindungi)
- Error message ramah tanpa bocorkan detail internal
- Button disabled saat submit (cegah double submit)
- RLS aktif - user hanya baca/ubah profil sendiri
- Proteksi role di middleware dan server component

### 🔒 Arsitektur Keamanan
```
Client → Server Action (validasi Zod) → Supabase Auth → Database Trigger → Profiles Table
                                             ↓
                                          RLS Policy (user hanya akses data sendiri)
```

## Testing

### Test Registrasi
1. Buka `/register`
2. Coba submit form kosong → error validasi
3. Isi dengan data invalid (email salah, telepon salah) → error validasi
4. Isi dengan data valid → sukses, redirect ke `/login`
5. Cek di Supabase dashboard: user baru di Auth dan profil di `profiles` dengan role `pelanggan`

### Test Login
1. Buka `/login`
2. Login dengan email/password salah → error "Email atau password salah"
3. Login dengan akun pelanggan → redirect ke `/dashboard/pelanggan`
4. Logout dan login dengan akun staf → redirect ke `/dashboard/staf`
5. Logout dan login dengan akun admin → redirect ke `/dashboard/admin`

### Test Proteksi Dashboard
1. Akses `/dashboard/admin` tanpa login → redirect ke `/login`
2. Login sebagai pelanggan, akses `/dashboard/admin` → redirect ke `/dashboard/pelanggan`
3. Login sebagai pelanggan, akses `/dashboard/staf` → redirect ke `/dashboard/pelanggan`
4. Login sebagai staf, akses `/dashboard/admin` → redirect ke `/dashboard/staf`
5. Login sebagai admin, akses semua dashboard → berhasil

### Test Role dari Database
1. Login sebagai pelanggan
2. Coba ubah role di browser console/Postman → ditolak (trigger + RLS)
3. Verifikasi role tetap `pelanggan` di dashboard

## Troubleshooting

### "Email sudah terdaftar"
Email sudah dipakai user lain. Gunakan email berbeda atau login dengan email tersebut.

### "Profil tidak ditemukan"
Trigger database belum jalan atau error. Cek di SQL Editor:
```sql
SELECT * FROM profiles WHERE email = 'user@email.com';
```
Jika kosong, trigger `handle_new_user` tidak jalan. Periksa migration RLS sudah dijalankan.

### Redirect loop di `/login`
Session masih aktif tapi profil tidak ada. Logout dulu:
```sql
-- Di SQL Editor (sebagai admin)
DELETE FROM auth.users WHERE email = 'problem@email.com';
```

### Role tidak sesuai
Hanya admin atau service_role yang bisa ubah role:
```sql
-- Di SQL Editor
UPDATE profiles SET role = 'admin' WHERE email = 'user@email.com';
```

## Next Steps

Setelah autentikasi selesai:
1. Implementasi fitur pelanggan: reservasi, pilih menu, riwayat
2. Implementasi fitur staf: validasi reservasi, check-in, manajemen pesanan
3. Implementasi fitur admin: CRUD menu, meja, jam operasional
4. Testing end-to-end semua role
5. Deploy ke Vercel dengan environment variables

## Catatan Penting

- **Jangan pakai `supabaseAdmin`** untuk login atau baca role user
- **Field `role` tidak dikirim dari form** - selalu ditentukan database
- **Error internal tidak ditampilkan ke user** - hanya log di server
- **RLS policy aktif** - user hanya bisa baca profil sendiri (kecuali admin/staf)
- **Middleware refresh session** di setiap request yang match config
