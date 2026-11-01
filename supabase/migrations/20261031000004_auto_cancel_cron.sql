-- =====================================================================
-- Migration 4: jadwal pembatalan otomatis reservasi yang tidak divalidasi (pg_cron)
-- Hanya berjalan di Supabase. Fungsi expire_pending_reservations() sendiri ada di migration 1.
--
-- Jika baris CREATE EXTENSION gagal: buka Dashboard -> Database -> Extensions,
-- aktifkan "pg_cron", lalu jalankan ulang file ini.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Menjadwalkan ulang dengan nama yang sama akan memperbarui jadwal lama, bukan menggandakannya.
SELECT cron.schedule(
  'expire-pending-reservations',
  '* * * * *',                                   -- setiap menit
  $$SELECT public.expire_pending_reservations()$$
);

-- Cara memeriksa dan mematikan:
--   SELECT * FROM cron.job;                                          -- daftar jadwal
--   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;  -- riwayat eksekusi
--   SELECT cron.unschedule('expire-pending-reservations');           -- hentikan
-- Atau cukup set restaurant_profile.pending_timeout_minutes = 0 untuk menonaktifkan pembatalan.
