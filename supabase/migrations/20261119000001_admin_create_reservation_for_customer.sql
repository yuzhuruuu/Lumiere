-- 20261119000001_admin_create_reservation_for_customer.sql
-- PRD 3.3: Admin boleh membuat reservasi. Sesuai penegasan produk, admin
-- membuat reservasi ATAS NAMA pelanggan yang sudah terdaftar.
--
-- Migration ini menambah RPC baru; create_reservation() lama tidak diubah
-- dan tetap dipakai pelanggan untuk reservasi atas nama dirinya sendiri.

CREATE OR REPLACE FUNCTION create_reservation_for_customer(
  p_customer_id      uuid,
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
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r reservations;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Anda harus login' USING ERRCODE = '28000';
  END IF;

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang boleh membuat reservasi untuk pelanggan'
      USING ERRCODE = '42501';
  END IF;

  IF p_customer_id IS NULL THEN
    RAISE EXCEPTION 'Pelanggan wajib dipilih' USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_customer_id AND role = 'pelanggan' AND is_active
  ) THEN
    RAISE EXCEPTION 'Pelanggan tidak ditemukan atau tidak aktif'
      USING ERRCODE = '23503';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Pilih minimal satu menu' USING ERRCODE = '23514';
  END IF;

  -- Trigger check_reservation_rules, constraint jam operasional, kapasitas,
  -- benturan jadwal, dan minimum order tetap berlaku seperti biasa.
  INSERT INTO reservations (
    customer_id, contact_name, contact_phone, contact_email,
    reservation_date, start_time, duration_minutes, guest_count, table_id, notes
  )
  VALUES (
    p_customer_id, p_contact_name, p_contact_phone, p_contact_email,
    p_reservation_date, p_start_time, p_duration_minutes, p_guest_count, p_table_id, p_notes
  )
  RETURNING * INTO r;

  INSERT INTO reservation_items (reservation_id, menu_item_id, quantity, unit_price)
  SELECT r.id, (e ->> 'menu_item_id')::integer, (e ->> 'quantity')::smallint, 0
  FROM jsonb_array_elements(p_items) AS e;

  RETURN r;
END $$;

REVOKE ALL ON FUNCTION create_reservation_for_customer(
  uuid, varchar, varchar, varchar, date, time, integer, integer, integer, jsonb, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_reservation_for_customer(
  uuid, varchar, varchar, varchar, date, time, integer, integer, integer, jsonb, text
) TO authenticated;
