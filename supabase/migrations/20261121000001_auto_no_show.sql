-- =====================================================================
-- Migration 7: No-show otomatis
-- Reservasi berstatus 'dikonfirmasi' yang belum check-in dan sudah lewat
-- 30 menit dari jam mulai otomatis menjadi 'tidak_hadir'.
-- DP yang sudah diterima hangus (dp_forfeited_at), tidak ada refund.
-- =====================================================================

-- Batas toleransi bisa diatur admin lewat restaurant_profile.
ALTER TABLE public.restaurant_profile
  ADD COLUMN IF NOT EXISTS no_show_grace_minutes smallint NOT NULL DEFAULT 30;

ALTER TABLE public.restaurant_profile
  DROP CONSTRAINT IF EXISTS restaurant_no_show_grace_valid,
  ADD CONSTRAINT restaurant_no_show_grace_valid
    CHECK (no_show_grace_minutes BETWEEN 0 AND 1440);

COMMENT ON COLUMN public.restaurant_profile.no_show_grace_minutes IS
  'Toleransi keterlambatan sebelum reservasi ditandai tidak hadir (menit). Default 30.';

-- ---------------------------------------------------------------------
-- Fungsi yang dipanggil pg_cron tiap menit.
-- Dijalankan sebagai peran tepercaya (postgres), sehingga pagar status
-- aplikasi tidak memblokir transisi dikonfirmasi -> tidak_hadir.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expire_no_show() RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
  v_grace   smallint;
  v_note    text;
  affected  integer;
BEGIN
  SELECT no_show_grace_minutes INTO v_grace
    FROM public.restaurant_profile WHERE id = 1;

  v_grace := COALESCE(v_grace, 30);
  v_note := 'Tidak hadir otomatis: melewati batas ' || v_grace ||
            ' menit setelah jam mulai';

  PERFORM set_config('app.status_note', v_note, true);

  UPDATE public.reservations r
     SET status = 'tidak_hadir'
   WHERE r.status = 'dikonfirmasi'
     AND (
       ((r.reservation_date + r.start_time) AT TIME ZONE 'Asia/Jakarta')
       + make_interval(mins => v_grace)
     ) < now();

  GET DIAGNOSTICS affected = ROW_COUNT;

  PERFORM set_config('app.status_note', '', true);
  RETURN affected;
END $$;

REVOKE ALL ON FUNCTION public.expire_no_show() FROM PUBLIC, anon, authenticated;

-- Nama berbeda dari cron lama; menjadwalkan ulang aman jika sudah ada.
SELECT cron.schedule(
  'expire-no-show',
  '* * * * *',
  $$SELECT public.expire_no_show()$$
);
