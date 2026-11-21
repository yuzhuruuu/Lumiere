-- =====================================================================
-- Migration 8: Kecualikan reservasi yang sudah lunas dari no-show otomatis.
-- Pelanggan yang sudah membayar penuh tidak dikenai DP hangus; meja tetap
-- terblokir sampai rentang waktu reservasinya berakhir (exclusion constraint).
-- =====================================================================

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
     AND NOT EXISTS (
       SELECT 1 FROM public.invoices i
        WHERE i.reservation_id = r.id
          AND i.payment_status = 'lunas'
     )
     AND (
       ((r.reservation_date + r.start_time) AT TIME ZONE 'Asia/Jakarta')
       + make_interval(mins => v_grace)
     ) < now();

  GET DIAGNOSTICS affected = ROW_COUNT;

  PERFORM set_config('app.status_note', '', true);
  RETURN affected;
END $$;

REVOKE ALL ON FUNCTION public.expire_no_show() FROM PUBLIC, anon, authenticated;
