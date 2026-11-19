-- =====================================================================
-- Migration 4: Jadwal pg_cron untuk pembatalan otomatis reservasi pending
-- Menjalankan public.expire_pending_reservations() setiap 1 menit.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lumiere-expire-pending-reservations') THEN
    PERFORM cron.unschedule('lumiere-expire-pending-reservations');
  END IF;
END $$;

SELECT cron.schedule(
  'lumiere-expire-pending-reservations',
  '* * * * *',
  $$SELECT public.expire_pending_reservations();$$
);
