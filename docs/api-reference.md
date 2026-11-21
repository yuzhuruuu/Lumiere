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
Menyembunyikan tombol di UI saja tidak cukup. Akun dengan `is_active = false`
ditolak saat login, saat membuka dashboard, dan di semua endpoint API.

Reservasi memakai aturan transisi status dari database:
`menunggu_validasi → dikonfirmasi/ditolak/dibatalkan`,
`dikonfirmasi → check_in/tidak_hadir/dibatalkan`, `check_in → selesai`.

Status `tidak_hadir` juga bisa terjadi otomatis: reservasi `dikonfirmasi` yang
lewat 30 menit dari jam mulai (`no_show_grace_minutes`) ditandai tidak hadir;
DP hangus dan tidak ada refund.

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

Endpoint ini **wajib login** (pelanggan/staf/admin). Response memakai bentuk
berikut:

```json
{
  "is_open": true,
  "available_tables": [
    { "id": 9201, "code": "A01", "capacity": 4, "area": "Indoor" }
  ],
  "grouped_by_area": {
    "Indoor": [
      { "id": 9201, "code": "A01", "capacity": 4, "area": "Indoor" }
    ]
  },
  "total_available": 1,
  "operating_hours": { "open_time": "10:00", "close_time": "24:00" },
  "query": {
    "date": "2026-11-20",
    "start_time": "19:00",
    "end_time": "21:00",
    "ends_next_day": false,
    "duration_minutes": 120,
    "guest_count": 4
  }
}
```

Jika restoran tutup atau waktu di luar jam operasional, response tetap `200`
dengan `is_open: false`, daftar meja kosong, dan `message` yang menjelaskan
alasannya. Error `400` berarti input/tanggal/jam tidak valid atau sudah lewat;
`401` berarti belum login.

Route ini memakai query agregat server-side untuk melihat benturan jadwal
lintas pelanggan. Hanya `table_id`, `start_time`, dan `duration_minutes` yang
dibaca; tidak ada data kontak pelanggan yang dikembalikan.

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

Untuk admin, tambahkan `"customer_id": "uuid-profil-pelanggan"` ke body di atas.

- Role `pelanggan` membuat reservasi atas nama dirinya sendiri. Role `admin`
  boleh membuat reservasi **atas nama pelanggan terdaftar** sesuai PRD 3.3:
  kirim field `customer_id` (UUID profil pelanggan). Admin tanpa `customer_id`
  mendapat `400`; pelanggan yang mengirim `customer_id` juga ditolak.
- Perhitungan total, minimum order, dan benturan jadwal dilakukan **database**
  lewat RPC `create_reservation(...)` untuk pelanggan dan
  `create_reservation_for_customer(...)` untuk admin.
- Server juga melakukan preflight untuk pesan error yang ramah: tanggal/jam
  tidak valid, tanggal/jam sudah lewat, meja tidak aktif, kapasitas kurang,
  di luar jam operasional, menu tidak tersedia, dan minimum order. Database
  memeriksa ulang aturan yang sama, termasuk jam hari ini yang sudah lewat dan
  reschedule ke jam yang sudah lewat.
- Response `201` menyertakan reservasi, item yang benar-benar tersimpan, dan
  `bill` estimasi:

```json
{
  "message": "Reservasi berhasil dibuat",
  "reservation": {
    "id": "uuid",
    "reservation_code": "RSV-261118-00001",
    "status": "menunggu_validasi"
  },
  "items": [
    {
      "id": 1,
      "menu_item_id": 9101,
      "quantity": 2,
      "unit_price": 150000,
      "subtotal": 300000
    }
  ],
  "bill": {
    "source": "estimate",
    "subtotal": 300000,
    "tax_percentage": 10,
    "tax_amount": 30000,
    "total_amount": 330000,
    "dp_percentage": 50,
    "dp_amount": 165000
  }
}
```

- Harga item dan subtotal berasal dari trigger database, bukan dari client.
  Angka resmi tetap dihitung database saat `generate_invoice`; setelah invoice
  ada, detail reservasi memakai `bill.source: "invoice"`.
- Error `23P01` → jadwal bentrok (`409`); `23514` → aturan reservasi/minimum
  order (`422`); `42501`/`28000` → akses ditolak; input tidak valid → `400`
  dengan `details` per field.

### Riwayat & detail

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/reservations` | Reservasi milik sendiri (staf/admin: semua) |
| GET | `/api/reservations/[id]` | Detail + item + `bill` + invoice + pembayaran + riwayat status + `barcode_data` untuk check-in |
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
| PATCH | `/api/staff/reservations/[id]/validate` | Setujui/tolak; approve memakai `approve_reservation` (invoice + batas DP sekaligus) |
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

Aksi `approve` memanggil `approve_reservation(...)`: status berubah, invoice
diterbitkan, dan `dp_due_at` dipasang dalam satu transaksi. Response memuat
`invoice`. Endpoint lama `POST /api/staff/reservations/[id]/invoice` tetap ada
untuk data lama, tetapi tidak diperlukan pada alur baru.

### Ubah jadwal (reschedule)

`PATCH /api/staff/reservations/[id]/reschedule`

Body boleh sebagian:

```json
{
  "reservation_date": "2026-11-21",
  "start_time": "20:00",
  "duration_minutes": 120,
  "guest_count": 6,
  "table_id": 9208,
  "notes": "Diubah lewat telepon"
}
```

Hanya untuk status `menunggu_validasi` / `dikonfirmasi`. Database memeriksa jam
operasional, kapasitas, meja aktif, dan benturan jadwal.

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

### Tagihan (invoice)

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/staff/invoices?payment_status=belum_dibayar` | Daftar tagihan + sisa bayar |
| GET | `/api/staff/invoices/[id]` | Detail tagihan, item reservasi, dan pembayaran |
| PATCH | `/api/staff/invoices/[id]/cancel` | Batalkan tagihan yang belum dibayar |

Aturan pembatalan tagihan:
- Hanya tagihan `belum_dibayar` tanpa pembayaran berhasil/menunggu.
- Reservasi harus sudah `dibatalkan` atau `tidak_hadir`.
- Tagihan `dp_dibayar`/`lunas` tidak bisa dibatalkan lewat API (refund manual).

### Alur pembayaran PRD v0.4

| Method | Path | Keterangan |
|---|---|---|
| POST | `/api/payments/submit` | Pelanggan mengajukan DP/penuh/pelunasan transfer/QRIS + bukti (multipart) |
| PATCH | `/api/staff/payments/[id]/verify` | Staf menerima/menolak bukti (`terima`/`tolak` + alasan) |
| POST | `/api/staff/payments` | Staf mencatat tunai/debit/pelunasan di restoran (nominal dihitung DB) |
| GET | `/api/staff/refunds` | Antrean refund DP |
| POST | `/api/staff/refunds/[invoiceId]/settle` | Selesaikan refund atau tandai DP hangus |

`POST /api/payments/submit` menerima `invoice_id`, `choice` (`dp_50`/`penuh`/
`pelunasan`), `method` (`transfer`/`qris`), `idempotency_key`, dan file `proof`.
Nominal selalu dihitung database. Bukti diunggah ke bucket private
`payment-proofs/{user_id}/...` sebelum RPC dipanggil.

`POST /api/staff/payments` masih menerima payload lama (`type: dp|penuh|pelunasan`,
`method`, `idempotency_key`, opsional `amount`/`status`), tetapi `amount` dan
`status` diabaikan — nominal dan status ditentukan RPC
`record_payment_at_restaurant(...)`.

### Catat pembayaran (legacy/compability)

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
- Pembayaran ditolak jika invoice sudah `dibatalkan`.
- Daftar pembayaran: `GET /api/staff/payments?invoice_id=...&status=berhasil&date=2026-11-18&limit=50&offset=0`

### Status pesanan

```json
{ "status": "disiapkan", "notes": "Tanpa bawang" }
```

Transisi yang diizinkan: `menunggu → disiapkan → disajikan → selesai`
(dan `dibatalkan` dari ketiga status aktif).

### Ringkasan operasional

`GET /api/staff/summary`

Berisi angka siap pakai untuk dashboard staf:
- `reservations.pending_validation`, `reservations.today`, `reservations.currently_checked_in`
- `orders.waiting`, `orders.preparing`
- `invoices.unpaid`
- `revenue_today` (pembayaran berhasil hari ini, WIB)

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
