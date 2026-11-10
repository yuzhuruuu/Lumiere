-- =====================================================================
-- SEED DATA — LUMIÈRE BAR & RESTO
-- Dataset demo untuk Supabase / PostgreSQL
--
-- Jalankan SETELAH seluruh migration database selesai:
-- 1) init_schema
-- 2) rls_policies
-- 3) storage
-- 4) auto_cancel_cron
--
-- Jalankan melalui Supabase SQL Editor atau koneksi database tepercaya
-- (postgres/service role), BUKAN melalui browser/client aplikasi.
--
-- Akun demo: password seluruh akun = LumiereDemo#2026
-- Dataset ini hanya untuk development/demo, jangan dipakai di produksi.
--
-- Catatan:
-- - restaurant_profile tepat 1 baris sesuai constraint.
-- - operating_hours tepat 7 baris (Minggu–Sabtu).
-- - 20+ data disediakan untuk tabel multi-record utama.
-- - reservation_status_logs dibuat otomatis oleh trigger.
-- - reservation_items.unit_price diisi trigger dari harga menu.
-- - invoice/order/payment dibuat langsung sebagai fixture demo; aplikasi
--   tetap harus memakai RPC dan aturan akses yang sudah dirancang.
-- =====================================================================

BEGIN;
SET LOCAL search_path TO public, extensions;

-- Dibutuhkan untuk hash password akun demo Supabase Auth.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- 0. TEMPORARY DATA USERS
-- 28 pelanggan + 2 staf + 1 admin = 31 akun/profile.
-- UUID deterministik membuat seed dapat dijalankan ulang.
-- ---------------------------------------------------------------------
CREATE TEMP TABLE _seed_users (
    id         uuid PRIMARY KEY,
    full_name  text NOT NULL,
    email      text NOT NULL UNIQUE,
    phone      text NOT NULL,
    role_name  text NOT NULL
) ON COMMIT DROP;

INSERT INTO _seed_users (id, full_name, email, phone, role_name)
SELECT
    ('10000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
    name,
    'pelanggan' || lpad(n::text, 2, '0') || '@lumiere.test',
    '08123456' || lpad(n::text, 4, '0'),
    'pelanggan'
FROM (VALUES
    (1,'Alya Putri'), (2,'Bima Pratama'), (3,'Citra Maharani'),
    (4,'Daffa Ramadhan'), (5,'Eka Saputra'), (6,'Farah Nabila'),
    (7,'Galih Wicaksono'), (8,'Hana Safitri'), (9,'Intan Permata'),
    (10,'Joko Santoso'), (11,'Keisya Amalia'), (12,'Luthfi Akbar'),
    (13,'Maya Anggraini'), (14,'Naufal Hidayat'), (15,'Olivia Azzahra'),
    (16,'Putra Aditya'), (17,'Qonita Rahma'), (18,'Raka Firmansyah'),
    (19,'Salsa Oktavia'), (20,'Tegar Maulana'), (21,'Ulya Khairunnisa'),
    (22,'Vino Alfarizi'), (23,'Wulan Puspita'), (24,'Yusuf Kurniawan'),
    (25,'Zahra Amelia'), (26,'Arif Nugroho'), (27,'Bella Anjani'),
    (28,'Candra Wijaya')
) AS customer_names(n, name);

INSERT INTO _seed_users (id, full_name, email, phone, role_name)
VALUES
('10000000-0000-4000-8000-000000000901','Andika Pratama','staf1@lumiere.test','081299990901','staf'),
('10000000-0000-4000-8000-000000000902','Sinta Maharani','staf2@lumiere.test','081299990902','staf'),
('10000000-0000-4000-8000-000000000999','Admin Lumiere','admin@lumiere.test','081299990999','admin');

-- ---------------------------------------------------------------------
-- 1. SUPABASE AUTH USERS + PROFILES
-- Trigger handle_new_user() akan membuat profiles otomatis.
-- Role staf/admin kemudian ditetapkan lewat koneksi SQL tepercaya.
-- ---------------------------------------------------------------------
INSERT INTO auth.users AS existing_user (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token,
    email_change, email_change_token_new, recovery_token
)
SELECT
    u.id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    u.email,
    crypt('LumiereDemo#2026', gen_salt('bf')),
    now(),
    jsonb_build_object('provider','email','providers',jsonb_build_array('email')),
    jsonb_build_object('full_name',u.full_name,'phone',u.phone),
    now(), now(), '', '', '', ''
FROM _seed_users u
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = COALESCE(existing_user.email_confirmed_at, now()),
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

-- Identitas email diperlukan agar akun demo dapat digunakan untuk login.
INSERT INTO auth.identities (
    user_id, identity_data, provider, provider_id, created_at, updated_at
)
SELECT
    u.id,
    jsonb_build_object(
        'sub', u.id::text,
        'email', u.email,
        'email_verified', true
    ),
    'email',
    u.email,
    now(),
    now()
FROM _seed_users u
ON CONFLICT (provider_id, provider) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    identity_data = EXCLUDED.identity_data,
    updated_at = now();

-- Pastikan profil ada dan role mengikuti daftar akun seed.
INSERT INTO public.profiles (id, full_name, email, phone, role, is_active)
SELECT
    id, full_name, email, phone, role_name::public.user_role, true
FROM _seed_users
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    is_active = true;

-- ---------------------------------------------------------------------
-- 2. RESTAURANT PROFILE
-- Satu baris saja sesuai constraint id = 1.
-- Alamat dan kontak di bawah adalah DATA DUMMY, ganti sebelum demo final.
-- pending_timeout_minutes = 0 menjaga reservasi dummy pending tidak
-- terhapus otomatis saat pg_cron berjalan.
-- ---------------------------------------------------------------------
INSERT INTO public.restaurant_profile (
    id, name, tagline, description, address, phone, email,
    min_order_amount, dp_percentage, tax_percentage,
    pending_timeout_minutes, updated_at
)
VALUES (
    1,
    'Lumière Bar & Resto',
    'A Refined Dining Experience',
    'Restoran dengan pilihan hidangan utama, pasta, dessert, kopi, dan minuman signature.',
    'Jl. Contoh No. 10, Semarang, Jawa Tengah (alamat dummy untuk pengujian)',
    '081234567890',
    'hello@lumiere.test',
    300000,
    50,
    10,
    0,
    now()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    description = EXCLUDED.description,
    address = EXCLUDED.address,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    min_order_amount = EXCLUDED.min_order_amount,
    dp_percentage = EXCLUDED.dp_percentage,
    tax_percentage = EXCLUDED.tax_percentage,
    pending_timeout_minutes = EXCLUDED.pending_timeout_minutes,
    updated_at = now();

-- ---------------------------------------------------------------------
-- 3. OPERATING HOURS
-- day_of_week: 0 Minggu, 1 Senin, ..., 6 Sabtu.
-- ---------------------------------------------------------------------
INSERT INTO public.operating_hours (day_of_week, open_time, close_time, is_closed)
VALUES
(0,'10:00','24:00',false),
(1,'10:00','24:00',false),
(2,'10:00','24:00',false),
(3,'10:00','24:00',false),
(4,'10:00','24:00',false),
(5,'10:00','24:00',false),
(6,'10:00','24:00',false)
ON CONFLICT (day_of_week) DO UPDATE SET
    open_time = EXCLUDED.open_time,
    close_time = EXCLUDED.close_time,
    is_closed = EXCLUDED.is_closed;

-- ---------------------------------------------------------------------
-- 4. MENU CATEGORIES (8 kategori)
-- ---------------------------------------------------------------------
INSERT INTO public.menu_categories (id, name, sort_order)
OVERRIDING SYSTEM VALUE
VALUES
(9001,'Main Course',1),
(9002,'Pasta & Rice',2),
(9003,'Appetizer',3),
(9004,'Dessert',4),
(9005,'Coffee',5),
(9006,'Non-Coffee',6),
(9007,'Signature Mocktail',7),
(9008,'Sharing & Sides',8)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;

-- ---------------------------------------------------------------------
-- 5. MENU ITEMS (32 menu)
-- photo_path sengaja NULL karena file foto belum diunggah ke Storage.
-- ---------------------------------------------------------------------
INSERT INTO public.menu_items (
    id, category_id, name, description, price, photo_path, is_available
)
OVERRIDING SYSTEM VALUE
VALUES
(9101,9001,'Wagyu Beef Steak','Steak daging sapi dengan saus khas Lumiere.',225000,NULL,true),
(9102,9001,'Grilled Salmon','Salmon panggang dengan sayuran dan saus lemon.',185000,NULL,true),
(9103,9001,'Chicken Parmigiana','Ayam crispy dengan saus tomat dan keju.',155000,NULL,true),
(9104,9001,'BBQ Beef Short Ribs','Iga sapi dengan saus barbeque.',210000,NULL,true),
(9105,9002,'Truffle Mushroom Pasta','Pasta krim jamur dengan aroma truffle.',165000,NULL,true),
(9106,9002,'Seafood Aglio Olio','Pasta dengan udang, cumi, dan bawang putih.',155000,NULL,true),
(9107,9002,'Chicken Teriyaki Rice','Nasi dengan ayam teriyaki dan sayuran.',125000,NULL,true),
(9108,9002,'Beef Bulgogi Rice','Nasi dengan irisan daging sapi bulgogi.',145000,NULL,true),
(9109,9003,'Calamari Rings','Cumi goreng tepung dengan saus tartar.',75000,NULL,true),
(9110,9003,'Crispy Chicken Wings','Sayap ayam dengan saus pilihan.',85000,NULL,true),
(9111,9003,'Tomato Bruschetta','Roti panggang dengan tomat dan herbs.',65000,NULL,true),
(9112,9003,'Creamy Mushroom Soup','Sup krim jamur hangat.',55000,NULL,true),
(9113,9004,'Chocolate Lava Cake','Kue cokelat dengan bagian tengah lumer.',65000,NULL,true),
(9114,9004,'Classic Tiramisu','Dessert kopi dengan krim mascarpone.',70000,NULL,true),
(9115,9004,'Creme Brulee','Custard lembut dengan lapisan karamel.',68000,NULL,true),
(9116,9004,'New York Cheesecake','Cheesecake klasik dengan saus buah.',62000,NULL,true),
(9117,9005,'Espresso','Kopi espresso single shot.',35000,NULL,true),
(9118,9005,'Cappuccino','Espresso dengan steamed milk dan foam.',42000,NULL,true),
(9119,9005,'Cafe Latte','Espresso dengan susu steamed.',45000,NULL,true),
(9120,9005,'Caramel Macchiato','Kopi susu dengan sentuhan karamel.',48000,NULL,true),
(9121,9006,'Matcha Latte','Minuman matcha dengan susu.',52000,NULL,true),
(9122,9006,'Lychee Tea','Teh dingin dengan rasa leci.',38000,NULL,true),
(9123,9006,'Iced Chocolate','Cokelat dingin dengan susu.',45000,NULL,true),
(9124,9006,'Fresh Orange Juice','Jus jeruk segar.',42000,NULL,true),
(9125,9007,'Lumiere Sunset','Mocktail buah dengan perpaduan rasa citrus.',65000,NULL,true),
(9126,9007,'Citrus Garden','Mocktail citrus dan mint.',62000,NULL,true),
(9127,9007,'Berry Bloom','Mocktail stroberi dan buah beri.',68000,NULL,true),
(9128,9007,'Tropical Spark','Mocktail nanas dan markisa.',60000,NULL,true),
(9129,9008,'Premium Cheese Board','Pilihan keju dan pelengkap untuk sharing.',195000,NULL,true),
(9130,9008,'Signature Sharing Platter','Platter pilihan untuk dinikmati bersama.',285000,NULL,true),
(9131,9008,'French Fries','Kentang goreng dengan bumbu ringan.',45000,NULL,true),
(9132,9008,'Onion Rings','Bawang bombai goreng tepung.',52000,NULL,true)
ON CONFLICT (id) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    photo_path = EXCLUDED.photo_path,
    is_available = EXCLUDED.is_available;

-- ---------------------------------------------------------------------
-- 6. DINING TABLES (20 meja)
-- ---------------------------------------------------------------------
INSERT INTO public.dining_tables (id, code, capacity, area, is_active)
OVERRIDING SYSTEM VALUE
VALUES
(9201,'T01',2,'Indoor',true),
(9202,'T02',2,'Indoor',true),
(9203,'T03',2,'Indoor',true),
(9204,'T04',2,'Indoor',true),
(9205,'T05',2,'Indoor',true),
(9206,'T06',2,'Indoor',true),
(9207,'T07',4,'Indoor',true),
(9208,'T08',4,'Indoor',true),
(9209,'T09',4,'Indoor',true),
(9210,'T10',4,'Indoor',true),
(9211,'T11',4,'Indoor',true),
(9212,'T12',4,'Indoor',true),
(9213,'T13',4,'Outdoor',true),
(9214,'O01',6,'Outdoor',true),
(9215,'O02',6,'Outdoor',true),
(9216,'O03',6,'Outdoor',true),
(9217,'O04',6,'Outdoor',true),
(9218,'VIP01',10,'VIP',true),
(9219,'VIP02',10,'VIP',true),
(9220,'VIP03',10,'VIP',true)
ON CONFLICT (id) DO UPDATE SET
    code = EXCLUDED.code,
    capacity = EXCLUDED.capacity,
    area = EXCLUDED.area,
    is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------
-- 7. RESERVATIONS (28 reservasi)
-- Distribusi akhir:
-- 4 menunggu_validasi, 2 ditolak, 4 dibatalkan, 2 tidak_hadir,
-- 4 dikonfirmasi, 5 check_in, 7 selesai.
-- Semua reservasi awal dibuat menunggu_validasi agar log status terbentuk
-- dan transisi status melewati trigger yang ditentukan di migration.
-- ---------------------------------------------------------------------
CREATE TEMP TABLE _seed_reservations (
    reservation_no integer PRIMARY KEY,
    id uuid NOT NULL UNIQUE,
    customer_id uuid NOT NULL,
    table_id integer NOT NULL,
    guest_count smallint NOT NULL,
    reservation_date date NOT NULL,
    start_time time NOT NULL
) ON COMMIT DROP;

INSERT INTO _seed_reservations (
    reservation_no, id, customer_id, table_id, guest_count, reservation_date, start_time
)
SELECT
    n,
    ('20000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
    ('10000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
    9200 + (((n - 1) % 20) + 1),
    CASE
        WHEN (((n - 1) % 20) + 1) BETWEEN 1 AND 6 THEN 2
        WHEN (((n - 1) % 20) + 1) BETWEEN 7 AND 13 THEN 4
        WHEN (((n - 1) % 20) + 1) BETWEEN 14 AND 17 THEN 6
        ELSE 8
    END,
    (now() AT TIME ZONE 'Asia/Jakarta')::date + ((n - 1) / 20),
    TIME '10:00' + (((n - 1) % 3) * INTERVAL '4 hours')
FROM generate_series(1,28) AS gs(n);

-- Hapus hanya fixture reservasi dengan UUID khusus seed ini agar file aman
-- dijalankan ulang tanpa menghapus data lain milik pengguna.
DELETE FROM public.payments
WHERE invoice_id IN (
    SELECT id FROM public.invoices
    WHERE reservation_id IN (SELECT id FROM _seed_reservations)
);
DELETE FROM public.invoices
WHERE reservation_id IN (SELECT id FROM _seed_reservations);
DELETE FROM public.orders
WHERE reservation_id IN (SELECT id FROM _seed_reservations);
DELETE FROM public.reservations
WHERE id IN (SELECT id FROM _seed_reservations);

-- Insert reservasi dalam status awal menunggu validasi.
INSERT INTO public.reservations (
    id, customer_id, contact_name, contact_phone, contact_email,
    reservation_date, start_time, duration_minutes, guest_count,
    table_id, status, notes
)
SELECT
    sr.id,
    sr.customer_id,
    u.full_name,
    u.phone,
    u.email,
    sr.reservation_date,
    sr.start_time,
    120,
    sr.guest_count,
    sr.table_id,
    'menunggu_validasi'::public.reservation_status,
    'Data dummy untuk pengujian sistem Lumiere.'
FROM _seed_reservations sr
JOIN _seed_users u ON u.id = sr.customer_id;

-- Detail pesanan: 3 item per reservasi. Kombinasi selalu melewati minimum
-- pembelian Rp300.000. Trigger mengambil unit_price langsung dari menu.
INSERT INTO public.reservation_items (reservation_id, menu_item_id, quantity, unit_price)
SELECT id, 9101 + ((reservation_no - 1) % 8), 2, 0
FROM _seed_reservations
UNION ALL
SELECT id, 9129 + ((reservation_no - 1) % 4), 1, 0
FROM _seed_reservations
UNION ALL
SELECT id, 9117 + ((reservation_no - 1) % 12), 1, 0
FROM _seed_reservations;

-- ---------------------------------------------------------------------
-- 8. ATRIBUT PETUGAS UNTUK validated_by / issued_by / recorded_by
-- SQL Editor menjalankan query dengan koneksi tepercaya. Set claim staf
-- agar log status menyimpan petugas yang melakukan transisi status.
-- ---------------------------------------------------------------------
SELECT set_config(
    'request.jwt.claim.sub',
    '10000000-0000-4000-8000-000000000901',
    true
);

-- Ditolak: 2 data dengan alasan penolakan.
UPDATE public.reservations
SET status = 'ditolak',
    validated_by = '10000000-0000-4000-8000-000000000901'::uuid,
    validated_at = now(),
    rejection_reason = CASE
        WHEN id = '20000000-0000-4000-8000-000000000005'::uuid
            THEN 'Meja dengan kapasitas sesuai tidak tersedia pada jadwal tersebut.'
        ELSE 'Reservasi tidak dapat dipenuhi karena kebutuhan operasional restoran.'
    END
WHERE id IN (
    '20000000-0000-4000-8000-000000000005'::uuid,
    '20000000-0000-4000-8000-000000000006'::uuid
);

-- Dibatalkan sebelum validasi: 2 data.
UPDATE public.reservations
SET status = 'dibatalkan',
    notes = 'Dibatalkan sebelum mendapat konfirmasi staf.'
WHERE id IN (
    '20000000-0000-4000-8000-000000000007'::uuid,
    '20000000-0000-4000-8000-000000000008'::uuid
);

-- Validasi awal bagi reservasi nomor 9–28.
UPDATE public.reservations
SET status = 'dikonfirmasi',
    validated_by = '10000000-0000-4000-8000-000000000901'::uuid,
    validated_at = now()
WHERE id IN (SELECT id FROM _seed_reservations WHERE reservation_no BETWEEN 9 AND 28);

-- ---------------------------------------------------------------------
-- 9. ORDERS + INVOICES (20 data masing-masing)
-- Invoice dihitung dari subtotal detail reservasi, pajak 10%, DP 50%.
-- Fixture dibuat langsung lewat koneksi SQL tepercaya. Aplikasi runtime
-- tetap menggunakan RPC generate_invoice() sesuai rancangan.
-- ---------------------------------------------------------------------
INSERT INTO public.orders (reservation_id, status, handled_by, notes)
SELECT
    sr.id,
    CASE
        WHEN sr.reservation_no BETWEEN 9 AND 12 THEN 'dibatalkan'::public.order_status
        WHEN sr.reservation_no BETWEEN 13 AND 16 THEN 'menunggu'::public.order_status
        WHEN sr.reservation_no BETWEEN 17 AND 18 THEN 'disiapkan'::public.order_status
        WHEN sr.reservation_no BETWEEN 19 AND 21 THEN 'disajikan'::public.order_status
        ELSE 'selesai'::public.order_status
    END,
    CASE WHEN sr.reservation_no % 2 = 0
         THEN '10000000-0000-4000-8000-000000000902'::uuid
         ELSE '10000000-0000-4000-8000-000000000901'::uuid END,
    'Status pesanan dummy untuk pengujian.'
FROM _seed_reservations sr
WHERE sr.reservation_no BETWEEN 9 AND 28;

INSERT INTO public.invoices (
    reservation_id, subtotal, tax_amount, total_amount, dp_amount, issued_by
)
SELECT
    r.id,
    totals.subtotal,
    round(totals.subtotal * 10 / 100, 2),
    totals.subtotal + round(totals.subtotal * 10 / 100, 2),
    round((totals.subtotal + round(totals.subtotal * 10 / 100, 2)) * 50 / 100, 2),
    '10000000-0000-4000-8000-000000000999'::uuid
FROM public.reservations r
JOIN _seed_reservations sr ON sr.id = r.id
JOIN LATERAL (
    SELECT COALESCE(SUM(ri.subtotal),0)::numeric(12,2) AS subtotal
    FROM public.reservation_items ri
    WHERE ri.reservation_id = r.id
) totals ON true
WHERE sr.reservation_no BETWEEN 9 AND 28;

-- Empat invoice untuk reservasi yang berakhir dibatalkan/tidak hadir.
UPDATE public.invoices
SET payment_status = 'dibatalkan'
WHERE reservation_id IN (
    SELECT id FROM _seed_reservations WHERE reservation_no BETWEEN 9 AND 12
);

-- ---------------------------------------------------------------------
-- 10. TRANSISI AKHIR RESERVASI
-- ---------------------------------------------------------------------
UPDATE public.reservations
SET status = 'dibatalkan',
    notes = 'Reservasi dibatalkan setelah sebelumnya dikonfirmasi.'
WHERE id IN (
    '20000000-0000-4000-8000-000000000009'::uuid,
    '20000000-0000-4000-8000-000000000010'::uuid
);

UPDATE public.reservations
SET status = 'tidak_hadir',
    notes = 'Pelanggan tidak hadir pada jadwal reservasi.'
WHERE id IN (
    '20000000-0000-4000-8000-000000000011'::uuid,
    '20000000-0000-4000-8000-000000000012'::uuid
);

UPDATE public.reservations
SET status = 'check_in',
    checked_in_at = now() - interval '30 minutes'
WHERE id IN (
    SELECT id FROM _seed_reservations WHERE reservation_no BETWEEN 17 AND 28
);

UPDATE public.reservations
SET status = 'selesai'
WHERE id IN (
    SELECT id FROM _seed_reservations WHERE reservation_no BETWEEN 22 AND 28
);

-- ---------------------------------------------------------------------
-- 11. PAYMENTS (22 catatan pembayaran)
-- - #13: DP parsial berhasil, tetapi belum mencapai nilai DP
-- - #14: pembayaran menunggu
-- - #15: pembayaran gagal
-- - #17–21: DP berhasil
-- - #22–28: DP + pelunasan (lunas)
-- - #16: tidak memiliki pembayaran (invoice belum dibayar)
-- ---------------------------------------------------------------------

-- Pembayaran DP parsial yang berhasil, tetapi belum mencapai nilai DP.
INSERT INTO public.payments (
    invoice_id, type, method, amount, status, reference_no,
    idempotency_key, paid_at, recorded_by
)
SELECT
    i.id,
    'dp'::public.payment_type,
    'transfer'::public.payment_method,
    round(i.dp_amount * 0.25, 2),
    'berhasil'::public.payment_record_status,
    'DEMO-PARTIAL-' || i.invoice_number,
    'seed-lumiere-partial-' || i.invoice_number,
    now() - interval '2 hours',
    '10000000-0000-4000-8000-000000000901'::uuid
FROM public.invoices i
JOIN _seed_reservations sr ON sr.id = i.reservation_id
WHERE sr.reservation_no = 13;

-- Pembayaran menunggu verifikasi.
INSERT INTO public.payments (
    invoice_id, type, method, amount, status, reference_no,
    idempotency_key, paid_at, recorded_by
)
SELECT
    i.id,
    'dp'::public.payment_type,
    'qris'::public.payment_method,
    round(i.dp_amount * 0.50, 2),
    'menunggu'::public.payment_record_status,
    'DEMO-PENDING-' || i.invoice_number,
    'seed-lumiere-pending-' || i.invoice_number,
    now() - interval '1 hour',
    '10000000-0000-4000-8000-000000000902'::uuid
FROM public.invoices i
JOIN _seed_reservations sr ON sr.id = i.reservation_id
WHERE sr.reservation_no = 14;

-- Pembayaran gagal.
INSERT INTO public.payments (
    invoice_id, type, method, amount, status, reference_no,
    idempotency_key, paid_at, recorded_by
)
SELECT
    i.id,
    'dp'::public.payment_type,
    'transfer'::public.payment_method,
    i.dp_amount,
    'gagal'::public.payment_record_status,
    'DEMO-FAILED-' || i.invoice_number,
    'seed-lumiere-failed-' || i.invoice_number,
    now() - interval '50 minutes',
    '10000000-0000-4000-8000-000000000902'::uuid
FROM public.invoices i
JOIN _seed_reservations sr ON sr.id = i.reservation_id
WHERE sr.reservation_no = 15;

-- Pembayaran DP penuh untuk nomor reservasi 17–28.
INSERT INTO public.payments (
    invoice_id, type, method, amount, status, reference_no,
    idempotency_key, paid_at, recorded_by
)
SELECT
    i.id,
    'dp'::public.payment_type,
    CASE (sr.reservation_no % 4)
        WHEN 0 THEN 'tunai'::public.payment_method
        WHEN 1 THEN 'transfer'::public.payment_method
        WHEN 2 THEN 'qris'::public.payment_method
        ELSE 'kartu_debit'::public.payment_method
    END,
    i.dp_amount,
    'berhasil'::public.payment_record_status,
    'DEMO-DP-' || i.invoice_number,
    'seed-lumiere-dp-' || i.invoice_number,
    now() - interval '3 hours',
    CASE WHEN sr.reservation_no % 2 = 0
         THEN '10000000-0000-4000-8000-000000000902'::uuid
         ELSE '10000000-0000-4000-8000-000000000901'::uuid END
FROM public.invoices i
JOIN _seed_reservations sr ON sr.id = i.reservation_id
WHERE sr.reservation_no BETWEEN 17 AND 28;

-- Pelunasan hanya untuk reservasi selesai (nomor 22–28).
INSERT INTO public.payments (
    invoice_id, type, method, amount, status, reference_no,
    idempotency_key, paid_at, recorded_by
)
SELECT
    i.id,
    'pelunasan'::public.payment_type,
    CASE (sr.reservation_no % 4)
        WHEN 0 THEN 'tunai'::public.payment_method
        WHEN 1 THEN 'transfer'::public.payment_method
        WHEN 2 THEN 'qris'::public.payment_method
        ELSE 'kartu_debit'::public.payment_method
    END,
    i.total_amount - i.dp_amount,
    'berhasil'::public.payment_record_status,
    'DEMO-SETTLEMENT-' || i.invoice_number,
    'seed-lumiere-settlement-' || i.invoice_number,
    now() - interval '30 minutes',
    CASE WHEN sr.reservation_no % 2 = 0
         THEN '10000000-0000-4000-8000-000000000902'::uuid
         ELSE '10000000-0000-4000-8000-000000000901'::uuid END
FROM public.invoices i
JOIN _seed_reservations sr ON sr.id = i.reservation_id
WHERE sr.reservation_no BETWEEN 22 AND 28;

-- Satu menu dibuat tidak tersedia sebagai contoh pengujian katalog.
-- Item tersebut tetap dapat muncul pada riwayat reservasi lama karena
-- reservation_items menyimpan snapshot harga saat transaksi dibuat.
UPDATE public.menu_items
SET is_available = false
WHERE id = 9132;

-- Identitas transaksi dikosongkan kembali; konteks ini hanya untuk seed.
SELECT set_config('request.jwt.claim.sub', '', true);

COMMIT;

-- ---------------------------------------------------------------------
-- PEMERIKSAAN HASIL SEED (jalankan terpisah setelah seed berhasil)
--
-- SELECT 'profiles' AS tabel, count(*) FROM public.profiles
-- UNION ALL SELECT 'menu_categories', count(*) FROM public.menu_categories
-- UNION ALL SELECT 'menu_items', count(*) FROM public.menu_items
-- UNION ALL SELECT 'dining_tables', count(*) FROM public.dining_tables
-- UNION ALL SELECT 'reservations', count(*) FROM public.reservations
-- UNION ALL SELECT 'reservation_items', count(*) FROM public.reservation_items
-- UNION ALL SELECT 'orders', count(*) FROM public.orders
-- UNION ALL SELECT 'invoices', count(*) FROM public.invoices
-- UNION ALL SELECT 'payments', count(*) FROM public.payments
-- UNION ALL SELECT 'reservation_status_logs', count(*) FROM public.reservation_status_logs;
--
-- Cek variasi status:
-- SELECT status, count(*) FROM public.reservations GROUP BY status ORDER BY status;
-- SELECT status, count(*) FROM public.orders GROUP BY status ORDER BY status;
-- SELECT payment_status, count(*) FROM public.invoices GROUP BY payment_status ORDER BY payment_status;
-- SELECT status, count(*) FROM public.payments GROUP BY status ORDER BY status;
--
-- Untuk mengaktifkan kembali auto-cancel sesuai aturan awal PRD:
-- UPDATE public.restaurant_profile SET pending_timeout_minutes = 30 WHERE id = 1;
-- ---------------------------------------------------------------------
