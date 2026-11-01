-- =====================================================================
-- Lumière Bar & Resto — Sistem Informasi Restoran dan Reservasi
-- Migration 1: skema inti, constraint, trigger, dan fungsi bisnis
-- Target: PostgreSQL 14+ (kompatibel dengan Supabase)
-- Catatan: bagian profiles memakai auth.users milik Supabase Auth.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------------------------------------------------------------------
-- 1. ENUM
-- ---------------------------------------------------------------------
CREATE TYPE user_role           AS ENUM ('pelanggan', 'staf', 'admin');
CREATE TYPE reservation_status  AS ENUM ('menunggu_validasi', 'dikonfirmasi', 'ditolak',
                                         'check_in', 'selesai', 'dibatalkan', 'tidak_hadir');
CREATE TYPE order_status        AS ENUM ('menunggu', 'disiapkan', 'disajikan', 'selesai', 'dibatalkan');
CREATE TYPE invoice_status      AS ENUM ('belum_dibayar', 'dp_dibayar', 'lunas', 'dibatalkan');
CREATE TYPE payment_type        AS ENUM ('dp', 'pelunasan');
CREATE TYPE payment_method      AS ENUM ('tunai', 'transfer', 'qris', 'kartu_debit');
CREATE TYPE payment_record_status AS ENUM ('menunggu', 'berhasil', 'gagal');

-- ---------------------------------------------------------------------
-- 2. FUNGSI UMUM
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- ---------------------------------------------------------------------
-- 3. PROFILES (1:1 dengan auth.users)
-- ---------------------------------------------------------------------
CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name   varchar(100) NOT NULL CHECK (char_length(btrim(full_name)) >= 2),
  email       varchar(255) NOT NULL UNIQUE
              CHECK (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  phone       varchar(20)  CHECK (phone ~ '^(\+62|62|0)8[0-9]{8,11}$'),
  role        user_role    NOT NULL DEFAULT 'pelanggan',
  is_active   boolean      NOT NULL DEFAULT true,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Profil dibuat otomatis saat pengguna mendaftar. Role SELALU 'pelanggan';
-- nilai role dari metadata yang dikirim client diabaikan.
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, phone, role)
  VALUES (
    NEW.id,
    -- nama dari form daftar; jika kosong/terlalu pendek, pakai bagian depan email, lalu 'Pengguna'
    CASE
      WHEN char_length(btrim(COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''))) >= 2
        THEN btrim(NEW.raw_user_meta_data ->> 'full_name')
      WHEN char_length(split_part(NEW.email, '@', 1)) >= 2
        THEN split_part(NEW.email, '@', 1)
      ELSE 'Pengguna'
    END,
    NEW.email,
    NULLIF(NEW.raw_user_meta_data ->> 'phone', ''),
    'pelanggan'
  );
  RETURN NEW;
END $$;

CREATE TRIGGER trg_on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Role hanya boleh diubah oleh admin / service_role (bukan lewat formulir profil biasa).
CREATE OR REPLACE FUNCTION protect_profile_role() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  caller_role user_role;
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    -- auth.uid() NULL = koneksi server tepercaya (service_role / migration)
    IF auth.uid() IS NOT NULL THEN
      SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
      IF caller_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Perubahan role/status akun hanya boleh dilakukan admin'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_profiles_protect_role BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_role();

-- ---------------------------------------------------------------------
-- 4. RESTAURANT_PROFILE (tepat 1 baris) + pengaturan bisnis
-- ---------------------------------------------------------------------
CREATE TABLE restaurant_profile (
  id                smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name              varchar(100)  NOT NULL,
  tagline           varchar(200),
  description       text,
  address           text          NOT NULL,
  latitude          numeric(9,6)  CHECK (latitude  BETWEEN -90  AND 90),
  longitude         numeric(9,6)  CHECK (longitude BETWEEN -180 AND 180),
  phone             varchar(20),
  email             varchar(255),
  logo_path         text,           -- path objek di Supabase Storage (bukan Base64)
  cover_photo_path  text,
  min_order_amount  numeric(12,2) NOT NULL DEFAULT 300000 CHECK (min_order_amount >= 0),
  dp_percentage     smallint      NOT NULL DEFAULT 50     CHECK (dp_percentage BETWEEN 0 AND 100),
  tax_percentage    numeric(5,2)  NOT NULL DEFAULT 10     CHECK (tax_percentage BETWEEN 0 AND 100),
  -- batas waktu validasi staf; lewat dari ini reservasi dibatalkan otomatis. 0 = dimatikan.
  pending_timeout_minutes smallint NOT NULL DEFAULT 30    CHECK (pending_timeout_minutes BETWEEN 0 AND 1440),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_restaurant_profile_updated BEFORE UPDATE ON restaurant_profile
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- 5. OPERATING_HOURS (7 baris, satu per hari; 0 = Minggu ... 6 = Sabtu)
-- ---------------------------------------------------------------------
CREATE TABLE operating_hours (
  id           smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  day_of_week  smallint NOT NULL UNIQUE CHECK (day_of_week BETWEEN 0 AND 6),
  open_time    time     NOT NULL,
  close_time   time     NOT NULL,           -- '24:00:00' = tengah malam
  is_closed    boolean  NOT NULL DEFAULT false,
  CHECK (is_closed OR open_time < close_time)
);

-- ---------------------------------------------------------------------
-- 6. MENU_CATEGORIES & MENU_ITEMS (1:N)
-- ---------------------------------------------------------------------
CREATE TABLE menu_categories (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        varchar(60) NOT NULL UNIQUE CHECK (char_length(btrim(name)) >= 2),
  sort_order  smallint    NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE menu_items (
  id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category_id   integer       NOT NULL REFERENCES menu_categories (id) ON DELETE RESTRICT,
  name          varchar(120)  NOT NULL CHECK (char_length(btrim(name)) >= 2),
  description   text,
  price         numeric(12,2) NOT NULL CHECK (price >= 0),
  photo_path    text,                       -- path objek di Supabase Storage
  is_available  boolean       NOT NULL DEFAULT true,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (category_id, name)
);
CREATE INDEX idx_menu_items_category ON menu_items (category_id);
CREATE INDEX idx_menu_items_name     ON menu_items (lower(name));
CREATE TRIGGER trg_menu_items_updated BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- 7. DINING_TABLES
-- ---------------------------------------------------------------------
CREATE TABLE dining_tables (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code        varchar(10) NOT NULL UNIQUE CHECK (char_length(btrim(code)) >= 1),
  capacity    smallint    NOT NULL CHECK (capacity BETWEEN 1 AND 50),
  area        varchar(40),                  -- mis. Indoor, Outdoor, VIP
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_dining_tables_updated BEFORE UPDATE ON dining_tables
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- 8. RESERVATIONS
-- ---------------------------------------------------------------------
CREATE SEQUENCE reservation_code_seq;

CREATE TABLE reservations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- isi barcode: dibuat otomatis oleh database, unik
  reservation_code  varchar(24) NOT NULL UNIQUE DEFAULT (
      'RSV-' || to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYMMDD') || '-' ||
      lpad(nextval('reservation_code_seq')::text, 5, '0')),
  customer_id       uuid         NOT NULL REFERENCES profiles (id) ON DELETE RESTRICT,
  contact_name      varchar(100) NOT NULL CHECK (char_length(btrim(contact_name)) >= 2),
  contact_phone     varchar(20)  NOT NULL CHECK (contact_phone ~ '^(\+62|62|0)8[0-9]{8,11}$'),
  contact_email     varchar(255) NOT NULL
                    CHECK (contact_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  reservation_date  date         NOT NULL,
  start_time        time         NOT NULL,
  duration_minutes  smallint     NOT NULL CHECK (duration_minutes BETWEEN 30 AND 240
                                             AND duration_minutes % 30 = 0),
  guest_count       smallint     NOT NULL CHECK (guest_count BETWEEN 1 AND 50),
  table_id          integer      NOT NULL REFERENCES dining_tables (id) ON DELETE RESTRICT,
  status            reservation_status NOT NULL DEFAULT 'menunggu_validasi',
  validated_by      uuid REFERENCES profiles (id) ON DELETE SET NULL,
  validated_at      timestamptz,
  checked_in_at     timestamptz,
  rejection_reason  text,
  notes             text,
  -- rentang waktu pemakaian meja, dihitung otomatis
  time_range        tsrange GENERATED ALWAYS AS (
      tsrange((reservation_date + start_time),
              (reservation_date + start_time + make_interval(mins => duration_minutes)),
              '[)')) STORED,
  created_at        timestamptz  NOT NULL DEFAULT now(),
  updated_at        timestamptz  NOT NULL DEFAULT now(),
  CHECK (status <> 'ditolak' OR rejection_reason IS NOT NULL),
  -- BENTURAN JADWAL: satu meja tidak boleh punya dua reservasi aktif yang waktunya tumpang tindih.
  -- Dijaga langsung oleh database sehingga aman dari race condition.
  CONSTRAINT no_double_booking EXCLUDE USING gist (table_id WITH =, time_range WITH &&)
    WHERE (status IN ('menunggu_validasi', 'dikonfirmasi', 'check_in'))
);
CREATE INDEX idx_reservations_customer ON reservations (customer_id, reservation_date DESC);
CREATE INDEX idx_reservations_date     ON reservations (reservation_date, start_time);
CREATE INDEX idx_reservations_status   ON reservations (status);
CREATE INDEX idx_reservations_table    ON reservations (table_id);
CREATE TRIGGER trg_reservations_updated BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Aturan bisnis yang tidak bisa dinyatakan dengan CHECK biasa (butuh tabel lain)
CREATE OR REPLACE FUNCTION check_reservation_rules() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  t   dining_tables%ROWTYPE;
  h   operating_hours%ROWTYPE;
  slot_start timestamp;
  slot_end   timestamp;
BEGIN
  SELECT * INTO t FROM dining_tables WHERE id = NEW.table_id;
  -- Perpindahan meja (UPDATE table_id) hanya untuk reservasi yang masih aktif.
  -- Validasi kapasitas, jam operasional, dan benturan jadwal di bawah tetap berlaku.
  IF TG_OP = 'UPDATE' AND NEW.table_id IS DISTINCT FROM OLD.table_id
     AND NEW.status NOT IN ('menunggu_validasi', 'dikonfirmasi', 'check_in') THEN
    RAISE EXCEPTION 'Meja hanya dapat dipindahkan untuk reservasi yang masih aktif'
      USING ERRCODE = '23514';
  END IF;
  IF NOT t.is_active THEN
    RAISE EXCEPTION 'Meja % sedang tidak aktif', t.code USING ERRCODE = '23514';
  END IF;
  IF NEW.guest_count > t.capacity THEN
    RAISE EXCEPTION 'Jumlah tamu (%) melebihi kapasitas meja % (%)', NEW.guest_count, t.code, t.capacity
      USING ERRCODE = '23514';
  END IF;

  SELECT * INTO h FROM operating_hours WHERE day_of_week = extract(dow FROM NEW.reservation_date)::smallint;
  IF NOT FOUND OR h.is_closed THEN
    RAISE EXCEPTION 'Restoran tutup pada tanggal tersebut' USING ERRCODE = '23514';
  END IF;

  slot_start := NEW.reservation_date + NEW.start_time;
  slot_end   := slot_start + make_interval(mins => NEW.duration_minutes);
  IF NEW.start_time < h.open_time OR slot_end > (NEW.reservation_date + h.close_time) THEN
    RAISE EXCEPTION 'Waktu reservasi di luar jam operasional (% - %)', h.open_time, h.close_time
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'INSERT' AND NEW.reservation_date < (now() AT TIME ZONE 'Asia/Jakarta')::date THEN
    RAISE EXCEPTION 'Tanggal reservasi tidak boleh di masa lalu' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_reservations_rules
  BEFORE INSERT OR UPDATE OF table_id, reservation_date, start_time, duration_minutes, guest_count
  ON reservations FOR EACH ROW EXECUTE FUNCTION check_reservation_rules();

-- Transisi status yang sah (mencegah lompat status sembarangan)
CREATE OR REPLACE FUNCTION check_reservation_transition() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NOT (
       (OLD.status = 'menunggu_validasi' AND NEW.status IN ('dikonfirmasi', 'ditolak', 'dibatalkan'))
    OR (OLD.status = 'dikonfirmasi'      AND NEW.status IN ('check_in', 'dibatalkan', 'tidak_hadir'))
    OR (OLD.status = 'check_in'          AND NEW.status = 'selesai')
  ) THEN
    RAISE EXCEPTION 'Transisi status reservasi % -> % tidak diizinkan', OLD.status, NEW.status
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_reservations_transition BEFORE UPDATE OF status ON reservations
  FOR EACH ROW EXECUTE FUNCTION check_reservation_transition();

-- ---------------------------------------------------------------------
-- 9. RESERVATION_STATUS_LOGS (riwayat perubahan status, otomatis)
-- ---------------------------------------------------------------------
CREATE TABLE reservation_status_logs (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reservation_id  uuid NOT NULL REFERENCES reservations (id) ON DELETE CASCADE,
  from_status     reservation_status,
  to_status       reservation_status NOT NULL,
  changed_by      uuid REFERENCES profiles (id) ON DELETE SET NULL,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_status_logs_reservation ON reservation_status_logs (reservation_id, created_at);

CREATE OR REPLACE FUNCTION log_reservation_status() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO reservation_status_logs (reservation_id, from_status, to_status, changed_by)
    VALUES (NEW.id, NULL, NEW.status, auth.uid());
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    -- catatan opsional lewat setting transaksi 'app.status_note' (dipakai pembatalan otomatis)
    INSERT INTO reservation_status_logs (reservation_id, from_status, to_status, changed_by, note)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(),
            NULLIF(current_setting('app.status_note', true), ''));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_reservations_log AFTER INSERT OR UPDATE OF status ON reservations
  FOR EACH ROW EXECUTE FUNCTION log_reservation_status();

-- ---------------------------------------------------------------------
-- 9b. PEMBATALAN OTOMATIS reservasi yang tidak divalidasi tepat waktu
-- Reservasi 'menunggu_validasi' lebih lama dari restaurant_profile.pending_timeout_minutes
-- (default 30 menit, 0 = dimatikan) menjadi 'dibatalkan' sehingga meja kembali bebas.
-- Dijalankan tiap menit oleh pg_cron (lihat migration 4); tidak dapat dipanggil pengguna.
-- Kondisi WHERE status = 'menunggu_validasi' membuat aman terhadap staf yang sedang memvalidasi:
-- jika staf menang lebih dulu, baris itu tidak ikut dibatalkan.
-- Mengembalikan jumlah reservasi yang dibatalkan.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION expire_pending_reservations() RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
  timeout_min integer;
  affected    integer;
BEGIN
  SELECT pending_timeout_minutes INTO timeout_min FROM restaurant_profile WHERE id = 1;
  IF COALESCE(timeout_min, 0) <= 0 THEN
    RETURN 0;
  END IF;

  PERFORM set_config('app.status_note',
    format('Dibatalkan otomatis: tidak divalidasi staf dalam %s menit', timeout_min), true);

  UPDATE reservations
     SET status = 'dibatalkan'
   WHERE status = 'menunggu_validasi'
     AND created_at < now() - make_interval(mins => timeout_min);
  GET DIAGNOSTICS affected = ROW_COUNT;

  PERFORM set_config('app.status_note', '', true);
  RETURN affected;
END $$;

-- ---------------------------------------------------------------------
-- 10. RESERVATION_ITEMS (junction: reservations N:M menu_items)
-- ---------------------------------------------------------------------
CREATE TABLE reservation_items (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reservation_id  uuid          NOT NULL REFERENCES reservations (id) ON DELETE CASCADE,
  menu_item_id    integer       NOT NULL REFERENCES menu_items (id) ON DELETE RESTRICT,
  quantity        smallint      NOT NULL CHECK (quantity BETWEEN 1 AND 99),
  unit_price      numeric(12,2) NOT NULL CHECK (unit_price >= 0),   -- snapshot harga saat dipesan
  subtotal        numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (reservation_id, menu_item_id)
);
CREATE INDEX idx_reservation_items_menu ON reservation_items (menu_item_id);

-- Harga selalu diambil dari database, bukan dari client.
CREATE OR REPLACE FUNCTION set_reservation_item_price() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  m menu_items%ROWTYPE;
BEGIN
  SELECT * INTO m FROM menu_items WHERE id = NEW.menu_item_id;
  IF NOT m.is_available THEN
    RAISE EXCEPTION 'Menu "%" sedang tidak tersedia', m.name USING ERRCODE = '23514';
  END IF;
  NEW.unit_price := m.price;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_reservation_items_price BEFORE INSERT ON reservation_items
  FOR EACH ROW EXECUTE FUNCTION set_reservation_item_price();

-- Minimal pembelian (default Rp300.000). Diperiksa saat COMMIT (deferred) sehingga
-- reservasi dan item-itemnya boleh diinsert dalam satu transaksi.
CREATE OR REPLACE FUNCTION check_min_order() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  total   numeric(12,2);
  minimum numeric(12,2);
BEGIN
  SELECT COALESCE(SUM(subtotal), 0) INTO total FROM reservation_items WHERE reservation_id = NEW.id;
  SELECT min_order_amount INTO minimum FROM restaurant_profile WHERE id = 1;
  IF total < COALESCE(minimum, 0) THEN
    RAISE EXCEPTION 'Total pesanan (%) kurang dari minimal pembelian (%)', total, minimum
      USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER trg_reservations_min_order
  AFTER INSERT ON reservations
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_min_order();

-- ---------------------------------------------------------------------
-- 11. ORDERS (status pesanan, 1:1 dengan reservasi)
-- ---------------------------------------------------------------------
CREATE TABLE orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id  uuid         NOT NULL UNIQUE REFERENCES reservations (id) ON DELETE CASCADE,
  status          order_status NOT NULL DEFAULT 'menunggu',
  handled_by      uuid REFERENCES profiles (id) ON DELETE SET NULL,
  notes           text,
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_status ON orders (status);
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- 12. INVOICES (tagihan, 1:1 dengan reservasi)
-- ---------------------------------------------------------------------
CREATE SEQUENCE invoice_number_seq;

CREATE TABLE invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number  varchar(24) NOT NULL UNIQUE DEFAULT (
      'INV-' || to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYMMDD') || '-' ||
      lpad(nextval('invoice_number_seq')::text, 5, '0')),
  reservation_id  uuid          NOT NULL UNIQUE REFERENCES reservations (id) ON DELETE RESTRICT,
  subtotal        numeric(12,2) NOT NULL CHECK (subtotal >= 0),
  tax_amount      numeric(12,2) NOT NULL CHECK (tax_amount >= 0),
  total_amount    numeric(12,2) NOT NULL CHECK (total_amount >= 0),
  dp_amount       numeric(12,2) NOT NULL CHECK (dp_amount >= 0),
  payment_status  invoice_status NOT NULL DEFAULT 'belum_dibayar',
  issued_by       uuid REFERENCES profiles (id) ON DELETE SET NULL,
  issued_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now(),
  CHECK (total_amount = subtotal + tax_amount),
  CHECK (dp_amount <= total_amount)
);
CREATE INDEX idx_invoices_status ON invoices (payment_status);
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- 13. PAYMENTS (invoice 1:N payments; DP lalu pelunasan)
-- ---------------------------------------------------------------------
CREATE TABLE payments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id       uuid NOT NULL REFERENCES invoices (id) ON DELETE RESTRICT,
  type             payment_type          NOT NULL,
  method           payment_method        NOT NULL,
  amount           numeric(12,2)         NOT NULL CHECK (amount > 0),
  status           payment_record_status NOT NULL DEFAULT 'berhasil',
  reference_no     varchar(100),
  idempotency_key  varchar(64) UNIQUE,   -- cegah pengiriman ganda (klik dua kali / retry)
  paid_at          timestamptz NOT NULL DEFAULT now(),
  recorded_by      uuid REFERENCES profiles (id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_invoice ON payments (invoice_id);

-- Setelah pembayaran tercatat: kunci invoice, tolak kelebihan bayar, perbarui status tagihan.
CREATE OR REPLACE FUNCTION sync_invoice_payment_status() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  inv  invoices%ROWTYPE;
  paid numeric(12,2);
BEGIN
  SELECT * INTO inv FROM invoices WHERE id = NEW.invoice_id FOR UPDATE;   -- serialisasi pembayaran paralel
  SELECT COALESCE(SUM(amount), 0) INTO paid
    FROM payments WHERE invoice_id = NEW.invoice_id AND status = 'berhasil';

  IF paid > inv.total_amount THEN
    RAISE EXCEPTION 'Total pembayaran (%) melebihi tagihan (%)', paid, inv.total_amount
      USING ERRCODE = '23514';
  END IF;

  UPDATE invoices SET payment_status =
      CASE WHEN paid >= inv.total_amount THEN 'lunas'::invoice_status
           WHEN paid >= inv.dp_amount AND inv.dp_amount > 0 THEN 'dp_dibayar'::invoice_status
           ELSE 'belum_dibayar'::invoice_status END
    WHERE id = NEW.invoice_id AND payment_status <> 'dibatalkan';
  RETURN NULL;
END $$;
CREATE TRIGGER trg_payments_sync AFTER INSERT OR UPDATE OF amount, status ON payments
  FOR EACH ROW EXECUTE FUNCTION sync_invoice_payment_status();

-- ---------------------------------------------------------------------
-- 14. FUNGSI generate_invoice
-- Menghitung tagihan dari item reservasi di database, bukan dari angka kiriman client.
-- Dipanggil staf/admin lewat sesi login mereka (supabase.rpc), jadi RLS tetap berlaku
-- dan service_role tidak diperlukan.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_invoice(p_reservation_id uuid)
RETURNS invoices
LANGUAGE plpgsql AS $$
DECLARE
  r      reservations%ROWTYPE;
  cfg    restaurant_profile%ROWTYPE;
  sub    numeric(12,2);
  tax    numeric(12,2);
  tot    numeric(12,2);
  result invoices;
BEGIN
  IF NOT is_staff_or_admin() THEN      -- didefinisikan di migration 2
    RAISE EXCEPTION 'Hanya staf atau admin yang boleh membuat tagihan' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO r FROM reservations WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reservasi tidak ditemukan' USING ERRCODE = 'P0002'; END IF;
  IF r.status NOT IN ('dikonfirmasi', 'check_in', 'selesai') THEN
    RAISE EXCEPTION 'Tagihan hanya dapat dibuat setelah reservasi divalidasi (status sekarang: %)', r.status
      USING ERRCODE = '23514';
  END IF;

  SELECT * INTO cfg FROM restaurant_profile WHERE id = 1;
  SELECT COALESCE(SUM(subtotal), 0) INTO sub FROM reservation_items WHERE reservation_id = p_reservation_id;
  tax := round(sub * cfg.tax_percentage / 100, 2);
  tot := sub + tax;

  INSERT INTO invoices (reservation_id, subtotal, tax_amount, total_amount, dp_amount, issued_by)
  VALUES (p_reservation_id, sub, tax, tot, round(tot * cfg.dp_percentage / 100, 2), auth.uid())
  RETURNING * INTO result;     -- UNIQUE(reservation_id) menolak tagihan ganda

  INSERT INTO orders (reservation_id) VALUES (p_reservation_id) ON CONFLICT (reservation_id) DO NOTHING;
  RETURN result;
END $$;

-- ---------------------------------------------------------------------
-- 15. FUNGSI create_reservation
-- Reservasi + daftar menu harus masuk dalam SATU transaksi, karena aturan minimal
-- pembelian dicek saat COMMIT. Dua panggilan insert terpisah dari supabase-js adalah
-- dua transaksi berbeda dan akan gagal. Satu panggilan rpc = satu transaksi.
-- p_items contoh: [{"menu_item_id": 1, "quantity": 2}, {"menu_item_id": 5, "quantity": 1}]
-- SECURITY INVOKER (default): RLS tetap berlaku atas nama pelanggan yang login.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_reservation(
  p_contact_name     varchar,
  p_contact_phone    varchar,
  p_contact_email    varchar,
  p_reservation_date date,
  p_start_time       time,
  p_duration_minutes integer,
  p_guest_count      integer,
  p_table_id         integer,
  p_items            jsonb,
  p_notes            text DEFAULT NULL
) RETURNS reservations
LANGUAGE plpgsql AS $$
DECLARE
  r reservations;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Anda harus login' USING ERRCODE = '28000';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Pilih minimal satu menu' USING ERRCODE = '23514';
  END IF;

  INSERT INTO reservations (customer_id, contact_name, contact_phone, contact_email,
                            reservation_date, start_time, duration_minutes, guest_count, table_id, notes)
  VALUES (auth.uid(), p_contact_name, p_contact_phone, p_contact_email,
          p_reservation_date, p_start_time, p_duration_minutes, p_guest_count, p_table_id, p_notes)
  RETURNING * INTO r;

  -- unit_price diisi ulang oleh trigger dari tabel menu_items; nilai 0 ini hanya pengisi.
  INSERT INTO reservation_items (reservation_id, menu_item_id, quantity, unit_price)
  SELECT r.id, (e ->> 'menu_item_id')::integer, (e ->> 'quantity')::smallint, 0
  FROM jsonb_array_elements(p_items) AS e;

  RETURN r;
END $$;
