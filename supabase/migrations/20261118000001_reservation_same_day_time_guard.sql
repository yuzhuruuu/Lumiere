-- 20261118000001_reservation_same_day_time_guard.sql
-- Tutup celah validasi jam pada RPC create_reservation:
-- reservasi untuk HARI INI yang jam mulainya sudah lewat harus ditolak
-- database, bukan hanya di route API.
--
-- Migration ini hanya mengganti fungsi trigger yang sudah ada. Migration
-- 20261031000001_init_schema.sql tidak diubah.

CREATE OR REPLACE FUNCTION check_reservation_rules() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  t             dining_tables%ROWTYPE;
  h             operating_hours%ROWTYPE;
  slot_start    timestamp;
  slot_end      timestamp;
  v_today       date;
  v_now_time    time;
  v_check_time  boolean := false;
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

  SELECT * INTO h FROM operating_hours
  WHERE day_of_week = extract(dow FROM NEW.reservation_date)::smallint;

  IF NOT FOUND OR h.is_closed THEN
    RAISE EXCEPTION 'Restoran tutup pada tanggal tersebut' USING ERRCODE = '23514';
  END IF;

  slot_start := NEW.reservation_date + NEW.start_time;
  slot_end   := slot_start + make_interval(mins => NEW.duration_minutes);

  IF NEW.start_time < h.open_time OR slot_end > (NEW.reservation_date + h.close_time) THEN
    RAISE EXCEPTION 'Waktu reservasi di luar jam operasional (% - %)', h.open_time, h.close_time
      USING ERRCODE = '23514';
  END IF;

  -- Tanggal/jam harus diperiksa saat INSERT dan saat jadwal diubah lewat
  -- UPDATE (misalnya staf reschedule). Perpindahan meja saja tidak dihitung
  -- sebagai perubahan jadwal supaya reservasi yang sedang berjalan tetap
  -- bisa dipindahkan.
  IF TG_OP = 'INSERT' THEN
    v_check_time := true;
  ELSIF TG_OP = 'UPDATE' AND (
    NEW.reservation_date IS DISTINCT FROM OLD.reservation_date OR
    NEW.start_time IS DISTINCT FROM OLD.start_time
  ) THEN
    v_check_time := true;
  END IF;

  IF v_check_time THEN
    v_today := (now() AT TIME ZONE 'Asia/Jakarta')::date;
    v_now_time := (now() AT TIME ZONE 'Asia/Jakarta')::time;

    IF NEW.reservation_date < v_today THEN
      RAISE EXCEPTION 'Tanggal reservasi tidak boleh di masa lalu'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.reservation_date = v_today AND NEW.start_time <= v_now_time THEN
      RAISE EXCEPTION 'Waktu reservasi hari ini sudah lewat'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END $$;
