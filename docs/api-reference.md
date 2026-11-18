# Dokumentasi REST API — Lumière Bar & Resto

Semua endpoint mengembalikan **JSON**. Autentikasi memakai **cookie sesi Supabase**
yang dibuat saat login di aplikasi, jadi request dari browser (halaman yang sama)
otomatis terautentikasi.

- Base URL lokal: `http://localhost:3000`
- Base URL produksi: `https://lumiere-barnresto.vercel.app`
- Format error: `{ "error": "pesan dalam bahasa Indonesia" }`
- Validasi gagal: `{ "error": "Data tidak valid", "details": { ... } }`

## Peran (role)

| Role | Hak akses |
|---|---|
| Anonim | Endpoint publik (restoran, menu, meja) |
| `pelanggan` | Reservasi sendiri, profil sendiri, batalkan reservasi sendiri |
| `staf` | Semua reservasi, check-in, invoice, pembayaran, status pesanan |
| `admin` | Semua akses staf + CRUD menu/meja/jam operasional + user + laporan |

Semua pemeriksaan role dilakukan **di server** (`lib/auth/require-role.js`).
Menyembunyikan tombol di UI saja tidak cukup.

---

## 1. Publik (tanpa login)

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/restaurant` | Profil restoran + 7 baris jam operasional |
| GET | `/api/menu/categories` | Daftar kategori menu |
| GET | `/api/menu/items` | Daftar menu (filter `category_id`, `search`, `available`) |
| GET | `/api/menu/items/[id]` | Detail satu menu + kategori |
| GET | `/api/tables` | Daftar meja aktif (filter `area`, `min_capacity`) |

Contoh:

```js
await fetch('/api/menu/items?search=steak').then((r) => r.json())
```

---

## 2. Pelanggan (login)

### Cek ketersediaan meja

`POST /api/reservations/check-availability`

```json
{
  "reservation_date": "2026-11-20",
  "start_time": "19:00",
  "duration_minutes": 120,
  "guest_count": 4
}
```

Response berisi `available`, daftar `tables`, dan `alternatives` (slot jam lain).

### Buat reservasi

`POST /api/reservations`

```json
{
  "table_id": 9201,
  "reservation_date": "2026-11-20",
  "start_time": "19:00",
  "duration_minutes": 120,
  "guest_count": 4,
  "contact_name": "Budi",
  "contact_phone": "081234567890",
  "contact_email": "budi@email.com",
  "notes": "Ulang tahun",
  "items": [{ "menu_item_id": 9101, "quantity": 2 }]
}
```

- Perhitungan total, minimum order, dan benturan jadwal dilakukan **database**
  lewat RPC `create_reservation(...)`.
- Error `23P01` → jadwal bentrok; `23514` → aturan reservasi/minimum order.

### Riwayat & detail

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/reservations` | Reservasi milik sendiri (staf/admin: semua) |
| GET | `/api/reservations/[id]` | Detail + item + invoice + pembayaran + riwayat status |
| PATCH | `/api/reservations/[id]/cancel` | Batalkan reservasi sendiri (`menunggu_validasi`/`dikonfirmasi`) |

Body pembatalan (opsional):

```json
{ "reason": "Acara keluarga dibatalkan" }
```

> Pembatalan tidak otomatis me-refund pembayaran. Refund diproses manual oleh staf.

---

## 3. Profil

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/profile` | Profil sendiri |
| PATCH | `/api/profile` | Ubah `full_name` / `phone` sendiri |

```json
{ "full_name": "Budi Santoso", "phone": "081234567890" }
```

`role` dan `is_active` **tidak bisa** diubah lewat endpoint ini.

---

## 4. Staf (`staf` / `admin`)

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/staff/reservations` | Semua reservasi; filter `status`, `date`, `search`, `limit`, `offset` |
| PATCH | `/api/staff/reservations/[id]/validate` | Setujui / tolak reservasi |
| PATCH | `/api/staff/reservations/[id]/reschedule` | Ubah tanggal/jam/durasi/tamu/meja sebelum check-in |
| PATCH | `/api/staff/reservations/[id]/check-in` | Check-in tamu / tandai tidak hadir |
| PATCH | `/api/staff/reservations/[id]/complete` | Selesaikan reservasi (`check_in → selesai`) |
| PATCH | `/api/staff/reservations/[id]/move-table` | Pindah meja |
| POST | `/api/staff/reservations/[id]/invoice` | Buat tagihan (RPC `generate_invoice`) |
| GET | `/api/staff/invoices` | Daftar tagihan; filter `payment_status`, `reservation_id`, `search` (nomor invoice) |
| GET | `/api/staff/invoices/[id]` | Detail tagihan + item + pembayaran |
| PATCH | `/api/staff/invoices/[id]/cancel` | Batalkan tagihan yang belum dibayar |
| GET/POST | `/api/staff/payments` | Lihat / catat pembayaran DP atau pelunasan |
| GET | `/api/staff/orders` | Daftar pesanan dapur; filter `status` |
| PATCH | `/api/staff/orders/[id]` | Ubah status pesanan |
| GET | `/api/staff/summary` | Ringkasan operasional hari ini |

### Validasi reservasi

```json
{ "action": "approve" }
```

```json
{ "action": "reject", "rejection_reason": "Meja penuh pada jam tersebut" }
```

### Check-in

```json
{ "action": "check_in" }
```

```json
{ "action": "no_show", "note": "Tamu tidak datang setelah 30 menit" }
```

### Pindah meja

```json
{ "table_id": 9208 }
```

Database memeriksa kapasitas, jam operasional, dan benturan jadwal.

### Catat pembayaran

`POST /api/staff/payments`

```json
{
  "invoice_id": "uuid-invoice",
  "type": "dp",
  "method": "transfer",
  "amount": 150000,
  "status": "berhasil",
  "reference_no": "TRX-12345",
  "idempotency_key": "dp-2026-11-18-001"
}
```

- `idempotency_key` **wajib** dan unik → mencegah pencatatan ganda.
- Status invoice (`belum_dibayar → dp_dibayar → lunas`) diperbarui trigger database.

### Status pesanan

```json
{ "status": "disiapkan", "notes": "Tanpa bawang" }
```

Transisi yang diizinkan: `menunggu → disiapkan → disajikan → selesai`
(dan `dibatalkan` dari ketiga status aktif).

---

## 5. Admin (`admin` saja)

### Menu

| Method | Path | Keterangan |
|---|---|---|
| GET/POST | `/api/admin/menu/categories` | Lihat / tambah kategori |
| PATCH/DELETE | `/api/admin/menu/categories/[id]` | Ubah / hapus kategori |
| GET/POST | `/api/admin/menu/items` | Lihat semua menu / tambah menu |
| PATCH/DELETE | `/api/admin/menu/items/[id]` | Ubah / hapus menu |
| POST | `/api/admin/menu/items/[id]/photo` | Upload foto (multipart, field `file`) |
| DELETE | `/api/admin/menu/items/[id]/photo` | Hapus foto |

Body menu:

```json
{
  "category_id": 9001,
  "name": "Wagyu Steak",
  "description": "Sirloin wagyu 200gr",
  "price": 250000,
  "is_available": true
}
```

Foto: `image/jpeg`, `image/png`, atau `image/webp`, maksimal **2 MB**
(bucket `restaurant-assets`).

```js
const fd = new FormData()
fd.append('file', fileInput.files[0])
await fetch('/api/admin/menu/items/9101/photo', { method: 'POST', body: fd })
```

### Meja & jam operasional

| Method | Path | Keterangan |
|---|---|---|
| GET/POST | `/api/admin/tables` | Lihat / tambah meja |
| PATCH/DELETE | `/api/admin/tables/[id]` | Ubah / hapus meja |
| GET/PUT | `/api/admin/operating-hours` | Lihat / simpan 7 hari sekaligus |

`PUT /api/admin/operating-hours` menerima **array 7 baris**:

```json
[
  { "day_of_week": 1, "open_time": "10:00", "close_time": "24:00", "is_closed": false }
]
```

### Profil restoran

`GET/PATCH /api/admin/restaurant`

```json
{
  "min_order_amount": 300000,
  "dp_percentage": 50,
  "tax_percentage": 10,
  "pending_timeout_minutes": 30
}
```

Nilai ini dibaca langsung oleh trigger database, jadi berlaku tanpa deploy ulang.

### Pengguna

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/admin/users` | Daftar pengguna; filter `role`, `search` |
| PATCH | `/api/admin/users/[id]` | Ubah `role` / `is_active` |

```json
{ "role": "staf", "is_active": true }
```

Pengaman: admin tidak bisa menurunkan/menonaktifkan akunnya sendiri, dan
sistem menolak jika tidak ada lagi admin aktif.

### Laporan

`GET /api/admin/reports/summary`

Berisi:
- `revenue`: hari ini, bulan ini, total, per tipe pembayaran
- `invoices`: jumlah & nominal per status
- `reservations`: total, hari ini, per status
- `top_menu`: 5 menu terlaris berdasarkan jumlah porsi

---

## Kode error yang ditangani

| Kode DB | Arti | Terjemahan API |
|---|---|---|
| `23505` | UNIQUE violation | Data sudah ada / pembayaran ganda |
| `23503` | FOREIGN KEY violation | Data masih dipakai / induk tidak ada |
| `23514` | CHECK / transisi status | Aturan bisnis dilanggar |
| `23P01` | EXCLUSION (bentrok jadwal) | Meja sudah dipakai pada jam itu |
| `42501` | RLS / izin | Anda tidak berhak melakukan aksi ini |
| `P0002` | Tidak ditemukan | Data tidak ditemukan |
| `PGRST116` | 0 baris | Data tidak ditemukan |

## Cara cepat menguji dari browser

1. Login sesuai role.
2. Buka DevTools → Console.
3. Jalankan `fetch` (cookie sesi otomatis terkirim).

```js
// cek role: pelanggan harus 403 di endpoint staf/admin
await fetch('/api/staff/reservations').then(async (r) => ({
  status: r.status,
  body: await r.json(),
}))
```
