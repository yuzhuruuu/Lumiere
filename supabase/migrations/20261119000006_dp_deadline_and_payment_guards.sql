-- =====================================================================
-- Migration 6: Batas bayar DP, pagar check-in/selesai, aturan pembatalan H-1,
--              DP hangus, pelacakan refund, dan verifikasi pembayaran lewat RPC
--
-- Jalankan SETELAH migration 1-5 (termasuk 20261119000005_payment_workflow.sql).
-- Keputusan tim yang diwujudkan di sini:
--   * Batas bayar DP 15 menit sejak reservasi disetujui (dp_deadline_minutes).
--   * DP hangus jika pelanggan tidak hadir.
--   * Pelanggan boleh membatalkan sampai H-1 (cancel_cutoff_days = 1); DP kembali.
--   * Info rekening/QRIS tampil di sisi pelanggan (data tetap dari restaurant_profile).
-- Tambahan rancangan:
--   * Timer 15 menit berhenti saat pelanggan mengirim bukti (menunggu verifikasi).
--   * Check-in butuh DP terverifikasi; "selesai" butuh tagihan lunas.
--   * Pesanan dapur baru dibuat saat check-in, bukan saat disetujui.
--   * Pelanggan hanya mengajukan transfer/QRIS; tunai/debit dicatat staf di restoran.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. KONFIGURASI (admin dapat mengubah tanpa deploy ulang)
-- ---------------------------------------------------------------------
ALTER TABLE public.restaurant_profile
  ADD COLUMN IF NOT EXISTS dp_deadline_minutes smallint NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS cancel_cutoff_days  smallint NOT NULL DEFAULT 1;

ALTER TABLE public.restaurant_profile
  DROP CONSTRAINT IF EXISTS restaurant_dp_deadline_valid,
  DROP CONSTRAINT IF EXISTS restaurant_cancel_cutoff_valid,
  ADD CONSTRAINT restaurant_dp_deadline_valid   CHECK (dp_deadline_minutes BETWEEN 0 AND 1440),
  ADD CONSTRAINT restaurant_cancel_cutoff_valid CHECK (cancel_cutoff_days  BETWEEN 0 AND 30);

COMMENT ON COLUMN public.restaurant_profile.dp_deadline_minutes IS
  'Batas bayar DP sejak reservasi disetujui (menit). 0 = tanpa batas.';
COMMENT ON COLUMN public.restaurant_profile.cancel_cutoff_days IS
  'Pelanggan boleh membatalkan online sampai H-n jika DP sudah dibayar. 1 = sampai H-1.';

-- ---------------------------------------------------------------------
-- 2. KOLOM BARU: batas bayar, DP hangus, dan refund (pada invoices)
-- ---------------------------------------------------------------------
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS dp_due_at       timestamptz,
  ADD COLUMN IF NOT EXISTS dp_forfeited_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_status   text NOT NULL DEFAULT 'tidak_ada',
  ADD COLUMN IF NOT EXISTS refund_amount   numeric(12,2),
  ADD COLUMN IF NOT EXISTS refund_note     text,
  ADD COLUMN IF NOT EXISTS refunded_at     timestamptz,
  ADD COLUMN IF NOT EXISTS refunded_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_refund_status_valid,
  ADD CONSTRAINT invoices_refund_status_valid
    CHECK (refund_status IN ('tidak_ada','menunggu_refund','sudah_refund'));

CREATE INDEX IF NOT EXISTS idx_invoices_dp_due
  ON public.invoices (dp_due_at)
  WHERE payment_status = 'belum_dibayar' AND dp_due_at IS NOT NULL;

-- ---------------------------------------------------------------------
-- 3. KOLOM BARU pada payments + pagar integritas
-- ---------------------------------------------------------------------
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS verification_note text,
  ADD COLUMN IF NOT EXISTS verified_by       uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Pembayaran berhasil wajib punya waktu bayar dan waktu verifikasi.
-- NOT VALID: data lama tidak diperiksa ulang, data baru wajib memenuhi.
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_success_has_timestamps,
  ADD CONSTRAINT payments_success_has_timestamps
    CHECK (status <> 'berhasil' OR (paid_at IS NOT NULL AND verified_at IS NOT NULL)) NOT VALID;

-- Pengisi otomatis: pembayaran yang menjadi "berhasil" selalu punya paid_at, verified_at, dan
-- verified_by. Menjaga kompatibilitas dengan kode lama yang langsung INSERT status berhasil
-- (halaman staf lama, /api/staff/payments, seed) tanpa mengisi kolom verifikasi.
CREATE OR REPLACE FUNCTION public.payments_fill_verification() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'berhasil' THEN
    NEW.paid_at     := COALESCE(NEW.paid_at, now());
    NEW.verified_at := COALESCE(NEW.verified_at, NEW.paid_at);
    NEW.verified_by := COALESCE(NEW.verified_by, NEW.recorded_by, auth.uid());
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_payments_fill_verification ON public.payments;
CREATE TRIGGER trg_payments_fill_verification
  BEFORE INSERT OR UPDATE OF status ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.payments_fill_verification();

-- Hanya satu pengajuan "menunggu" per invoice (aman dari klik ganda / request paralel).
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_one_pending_per_invoice
  ON public.payments (invoice_id) WHERE status = 'menunggu';

-- ---------------------------------------------------------------------
-- 4. HITUNG NOMINAL PEMBAYARAN (satu sumber kebenaran)
-- dp_50     : kekurangan DP (dp_amount - sudah dibayar)  -> hanya jika DP belum terpenuhi
-- penuh     : seluruh total                              -> hanya jika belum ada pembayaran
-- pelunasan : sisa tagihan                               -> hanya jika DP sudah terpenuhi
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.payment_amount_for(
  p_dp numeric, p_total numeric, p_paid numeric, p_choice text,
  OUT o_amount numeric, OUT o_type text
) LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_paid >= p_total THEN
    RAISE EXCEPTION 'Tagihan sudah lunas.' USING ERRCODE = '23514';
  END IF;

  IF p_choice = 'dp_50' THEN
    IF p_paid >= p_dp THEN
      RAISE EXCEPTION 'DP sudah terpenuhi. Gunakan pelunasan untuk sisa tagihan.' USING ERRCODE = '23514';
    END IF;
    o_amount := p_dp - p_paid;
    o_type := 'dp';
  ELSIF p_choice = 'penuh' THEN
    IF p_paid > 0 THEN
      RAISE EXCEPTION 'Pembayaran penuh hanya tersedia sebelum ada pembayaran yang diterima.' USING ERRCODE = '23514';
    END IF;
    o_amount := p_total;
    o_type := 'penuh';
  ELSIF p_choice = 'pelunasan' THEN
    IF p_paid < p_dp THEN
      RAISE EXCEPTION 'Pelunasan hanya tersedia setelah DP diterima.' USING ERRCODE = '23514';
    END IF;
    o_amount := p_total - p_paid;
    o_type := 'pelunasan';
  ELSE
    RAISE EXCEPTION 'Pilihan pembayaran tidak valid.' USING ERRCODE = '23514';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 5. generate_invoice: pasang batas bayar DP; pesanan dapur TIDAK lagi dibuat di sini
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_invoice(p_reservation_id uuid)
RETURNS public.invoices
LANGUAGE plpgsql AS $$
DECLARE
  r      public.reservations%ROWTYPE;
  cfg    public.restaurant_profile%ROWTYPE;
  sub    numeric(12,2);
  tax    numeric(12,2);
  tot    numeric(12,2);
  due    timestamptz;
  result public.invoices;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RAISE EXCEPTION 'Hanya staf atau admin yang boleh membuat tagihan' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO r FROM public.reservations WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reservasi tidak ditemukan' USING ERRCODE = 'P0002'; END IF;
  IF r.status NOT IN ('dikonfirmasi', 'check_in', 'selesai') THEN
    RAISE EXCEPTION 'Tagihan hanya dapat dibuat setelah reservasi divalidasi (status sekarang: %)', r.status
      USING ERRCODE = '23514';
  END IF;

  SELECT * INTO cfg FROM public.restaurant_profile WHERE id = 1;
  SELECT COALESCE(SUM(subtotal), 0) INTO sub FROM public.reservation_items WHERE reservation_id = p_reservation_id;
  tax := round(sub * cfg.tax_percentage / 100, 2);
  tot := sub + tax;

  -- Batas bayar DP hanya untuk reservasi yang baru disetujui, dan tidak melewati jam mulai.
  IF r.status = 'dikonfirmasi' AND cfg.dp_deadline_minutes > 0 THEN
    due := LEAST(
      now() + make_interval(mins => cfg.dp_deadline_minutes),
      ((r.reservation_date + r.start_time) AT TIME ZONE 'Asia/Jakarta')
    );
  END IF;

  INSERT INTO public.invoices (reservation_id, subtotal, tax_amount, total_amount, dp_amount, issued_by, dp_due_at)
  VALUES (p_reservation_id, sub, tax, tot, round(tot * cfg.dp_percentage / 100, 2), auth.uid(), due)
  RETURNING * INTO result;     -- UNIQUE(reservation_id) menolak tagihan ganda

  RETURN result;
END $$;

-- ---------------------------------------------------------------------
-- 6. approve_reservation: setujui + terbitkan tagihan dalam SATU transaksi
-- Menggantikan dua langkah terpisah di UI (update status lalu generate_invoice).
-- SECURITY INVOKER: RLS staf tetap berlaku.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_reservation(p_reservation_id uuid)
RETURNS public.invoices
LANGUAGE plpgsql AS $$
DECLARE
  r   public.reservations%ROWTYPE;
  inv public.invoices;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RAISE EXCEPTION 'Hanya staf atau admin yang boleh menyetujui reservasi' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO r FROM public.reservations WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reservasi tidak ditemukan' USING ERRCODE = 'P0002'; END IF;
  IF r.status <> 'menunggu_validasi' THEN
    RAISE EXCEPTION 'Reservasi berstatus % tidak dapat disetujui', r.status USING ERRCODE = '23514';
  END IF;

  UPDATE public.reservations
     SET status = 'dikonfirmasi', validated_by = auth.uid(), validated_at = now(), rejection_reason = NULL
   WHERE id = p_reservation_id;

  inv := public.generate_invoice(p_reservation_id);
  RETURN inv;
END $$;

REVOKE ALL ON FUNCTION public.approve_reservation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_reservation(uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- 7. PAGAR STATUS RESERVASI
-- check_in  : wajib DP terverifikasi (invoice dp_dibayar / lunas)
-- selesai   : wajib invoice lunas
-- dibatalkan oleh PELANGGAN :
--     - ditahan selama ada pembayaran menunggu verifikasi
--     - jika DP sudah dibayar, hanya sampai H-<cancel_cutoff_days> (zona WIB)
--     - jika belum ada uang masuk, boleh kapan saja
-- Koneksi SQL tepercaya (SQL Editor, migration, seed) dikecualikan.
-- SECURITY INVOKER agar current_user mencerminkan peran yang sebenarnya.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_reservation_payment_guards() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_inv    public.invoices%ROWTYPE;
  v_paid   numeric(12,2);
  v_cutoff smallint;
BEGIN
  IF current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_inv FROM public.invoices WHERE reservation_id = NEW.id;

  IF NEW.status = 'check_in' THEN
    IF NOT FOUND OR v_inv.payment_status NOT IN ('dp_dibayar', 'lunas') THEN
      RAISE EXCEPTION 'Check-in ditolak: DP belum diterima.' USING ERRCODE = '23514';
    END IF;

  ELSIF NEW.status = 'selesai' THEN
    IF NOT FOUND OR v_inv.payment_status <> 'lunas' THEN
      RAISE EXCEPTION 'Reservasi belum dapat diselesaikan: tagihan belum lunas.' USING ERRCODE = '23514';
    END IF;

  ELSIF NEW.status = 'dibatalkan'
        AND auth.uid() IS NOT NULL
        AND auth.uid() = OLD.customer_id
        AND NOT public.is_staff_or_admin() THEN
    IF FOUND THEN
      IF EXISTS (SELECT 1 FROM public.payments WHERE invoice_id = v_inv.id AND status = 'menunggu') THEN
        RAISE EXCEPTION 'Pembayaran Anda sedang diverifikasi. Pembatalan dapat dilakukan setelah verifikasi selesai.'
          USING ERRCODE = '23514';
      END IF;
      SELECT COALESCE(SUM(amount), 0) INTO v_paid
        FROM public.payments WHERE invoice_id = v_inv.id AND status = 'berhasil';
      SELECT cancel_cutoff_days INTO v_cutoff FROM public.restaurant_profile WHERE id = 1;
      IF v_paid > 0
         AND (now() AT TIME ZONE 'Asia/Jakarta')::date > (OLD.reservation_date - COALESCE(v_cutoff, 1)::int) THEN
        RAISE EXCEPTION 'Batas pembatalan online sudah lewat (maksimal H-%). Silakan hubungi restoran.',
          COALESCE(v_cutoff, 1) USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_reservations_z_payment_guards ON public.reservations;
-- Nama berawalan "z" agar berjalan SETELAH pemeriksaan transisi status (urut abjad).
CREATE TRIGGER trg_reservations_z_payment_guards
  BEFORE UPDATE OF status ON public.reservations
  FOR EACH ROW WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION public.check_reservation_payment_guards();

-- ---------------------------------------------------------------------
-- 8. EFEK UANG saat reservasi berakhir:
--   dibatalkan  + ada uang masuk -> refund_status = menunggu_refund (kembali ke pelanggan)
--   dibatalkan  + tidak ada uang -> tagihan ikut dibatalkan
--   tidak_hadir + ada uang masuk -> DP hangus (dp_forfeited_at), sisa tagihan tidak ditagih
-- SECURITY DEFINER: pelanggan yang membatalkan tidak punya hak ubah invoice.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_reservation_money_effects() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inv  public.invoices%ROWTYPE;
  v_paid numeric(12,2);
BEGIN
  SELECT * INTO v_inv FROM public.invoices WHERE reservation_id = NEW.id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
    FROM public.payments WHERE invoice_id = v_inv.id AND status = 'berhasil';

  IF NEW.status = 'dibatalkan' THEN
    IF v_paid > 0 THEN
      UPDATE public.invoices
         SET refund_status = 'menunggu_refund', refund_amount = v_paid
       WHERE id = v_inv.id AND refund_status = 'tidak_ada';
    ELSIF v_inv.payment_status = 'belum_dibayar'
          AND NOT EXISTS (SELECT 1 FROM public.payments WHERE invoice_id = v_inv.id AND status = 'menunggu') THEN
      UPDATE public.invoices SET payment_status = 'dibatalkan' WHERE id = v_inv.id;
    END IF;

  ELSIF NEW.status = 'tidak_hadir' THEN
    IF v_paid > 0 THEN
      UPDATE public.invoices
         SET dp_forfeited_at = COALESCE(dp_forfeited_at, now())
       WHERE id = v_inv.id;
    END IF;
  END IF;

  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_reservations_money_effects ON public.reservations;
CREATE TRIGGER trg_reservations_money_effects
  AFTER UPDATE OF status ON public.reservations
  FOR EACH ROW WHEN (NEW.status IN ('dibatalkan', 'tidak_hadir') AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.apply_reservation_money_effects();

-- ---------------------------------------------------------------------
-- 9. PESANAN DAPUR dibuat saat check-in (bukan saat disetujui)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_order_on_check_in() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.orders (reservation_id) VALUES (NEW.id) ON CONFLICT (reservation_id) DO NOTHING;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_reservations_order_on_check_in ON public.reservations;
CREATE TRIGGER trg_reservations_order_on_check_in
  AFTER UPDATE OF status ON public.reservations
  FOR EACH ROW WHEN (NEW.status = 'check_in' AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.create_order_on_check_in();

-- ---------------------------------------------------------------------
-- 10. PEMBATALAN OTOMATIS: DP tidak dibayar sebelum batas waktu
-- Tidak menyentuh invoice yang punya pembayaran "menunggu" (timer berhenti saat bukti
-- dikirim) maupun "berhasil". Dijalankan tiap menit oleh pg_cron.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expire_unpaid_dp() RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
  affected integer;
BEGIN
  PERFORM set_config('app.status_note',
    'Dibatalkan otomatis: DP tidak dibayar sebelum batas waktu', true);

  UPDATE public.reservations r
     SET status = 'dibatalkan'
   WHERE r.status = 'dikonfirmasi'
     AND EXISTS (
       SELECT 1 FROM public.invoices i
        WHERE i.reservation_id = r.id
          AND i.payment_status = 'belum_dibayar'
          AND i.dp_due_at IS NOT NULL
          AND i.dp_due_at < now()
          AND NOT EXISTS (
            SELECT 1 FROM public.payments p
             WHERE p.invoice_id = i.id AND p.status IN ('menunggu', 'berhasil')
          )
     );
  GET DIAGNOSTICS affected = ROW_COUNT;

  PERFORM set_config('app.status_note', '', true);
  RETURN affected;
END $$;

REVOKE ALL ON FUNCTION public.expire_unpaid_dp() FROM PUBLIC, anon, authenticated;

-- Menjadwalkan ulang dengan nama yang sama memperbarui jadwal lama. Perlu pg_cron (migration 4).
SELECT cron.schedule(
  'expire-unpaid-dp',
  '* * * * *',
  $$SELECT public.expire_unpaid_dp()$$
);

-- ---------------------------------------------------------------------
-- 11. PELANGGAN MENGAJUKAN PEMBAYARAN (menggantikan versi migration 5)
-- Perubahan: hanya transfer/QRIS; bukti wajib dan dikirim bersamaan (satu langkah);
-- nominal selalu dari database; pengajuan ulang dengan key sama mengembalikan data lama
-- (aman untuk klik ganda); tidak bisa lewat batas waktu DP.
-- Upload file ke bucket payment-proofs dilakukan DULU, lalu path-nya dikirim ke fungsi ini.
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.submit_payment_request(uuid, text, public.payment_method, varchar);

CREATE OR REPLACE FUNCTION public.submit_payment_request(
  p_invoice_id      uuid,
  p_choice          text,
  p_method          public.payment_method,
  p_idempotency_key varchar(64),
  p_proof_path      text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_invoice     public.invoices%ROWTYPE;
  v_reservation public.reservations%ROWTYPE;
  v_paid        numeric(12,2);
  v_amount      numeric(12,2);
  v_type        text;
  v_payment_id  uuid;
BEGIN
  SELECT i.* INTO v_invoice
    FROM public.invoices i
    JOIN public.reservations r ON r.id = i.reservation_id
   WHERE i.id = p_invoice_id AND r.customer_id = auth.uid()
   FOR UPDATE OF i;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice tidak ditemukan atau bukan milik pengguna ini.';
  END IF;

  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'Idempotency key wajib diisi.';
  END IF;

  -- Klik ganda / retry dengan key yang sama: kembalikan pengajuan yang sudah ada.
  SELECT id INTO v_payment_id FROM public.payments
   WHERE idempotency_key = p_idempotency_key AND invoice_id = p_invoice_id AND selected_by = auth.uid();
  IF FOUND THEN RETURN v_payment_id; END IF;

  SELECT * INTO v_reservation FROM public.reservations WHERE id = v_invoice.reservation_id;

  IF p_method NOT IN ('transfer', 'qris') THEN
    RAISE EXCEPTION 'Pembayaran tunai atau kartu debit dilakukan langsung di restoran dan dicatat oleh staf.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.restaurant_profile rp
     WHERE rp.id = 1 AND p_method::text = ANY (rp.available_payment_methods)
  ) THEN
    RAISE EXCEPTION 'Metode pembayaran sedang tidak tersedia.';
  END IF;

  IF p_proof_path IS NULL OR (storage.foldername(p_proof_path))[1] IS DISTINCT FROM auth.uid()::text THEN
    RAISE EXCEPTION 'Bukti pembayaran wajib diunggah untuk transfer/QRIS.';
  END IF;

  IF v_invoice.payment_status = 'dibatalkan'
     OR v_reservation.status NOT IN ('dikonfirmasi', 'check_in') THEN
    RAISE EXCEPTION 'Reservasi/invoice tidak dapat dibayar.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.payments WHERE invoice_id = p_invoice_id AND status = 'menunggu') THEN
    RAISE EXCEPTION 'Masih ada pengajuan pembayaran yang menunggu verifikasi.';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
    FROM public.payments WHERE invoice_id = p_invoice_id AND status = 'berhasil';

  -- Batas waktu DP (hanya relevan selama DP belum diterima).
  IF v_paid = 0 AND v_invoice.dp_due_at IS NOT NULL AND now() > v_invoice.dp_due_at THEN
    RAISE EXCEPTION 'Batas waktu pembayaran DP sudah lewat. Silakan buat reservasi baru.';
  END IF;

  SELECT o_amount, o_type INTO v_amount, v_type
    FROM public.payment_amount_for(v_invoice.dp_amount, v_invoice.total_amount, v_paid, p_choice);

  INSERT INTO public.payments (
    invoice_id, type, payment_choice, method, amount, status,
    idempotency_key, selected_by, submitted_at, proof_path, paid_at, verified_at, recorded_by
  ) VALUES (
    p_invoice_id, v_type, p_choice, p_method, v_amount, 'menunggu',
    p_idempotency_key, auth.uid(), now(), p_proof_path, NULL, NULL, NULL
  )
  RETURNING id INTO v_payment_id;

  RETURN v_payment_id;
END $$;

REVOKE ALL ON FUNCTION public.submit_payment_request(uuid, text, public.payment_method, varchar, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_payment_request(uuid, text, public.payment_method, varchar, text)
  TO authenticated;

-- ---------------------------------------------------------------------
-- 12. STAF MEMVERIFIKASI PEMBAYARAN (terima / tolak) secara atomik
-- terima: status berhasil + paid_at + verified_at + petugas terisi serentak.
-- tolak : alasan wajib (min 5 karakter, terlihat pelanggan); jika DP belum diterima,
--         pelanggan mendapat batas bayar baru sebesar dp_deadline_minutes.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_payment(
  p_payment_id uuid, p_decision text, p_note text DEFAULT NULL
) RETURNS public.payments
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  pay    public.payments%ROWTYPE;
  inv    public.invoices%ROWTYPE;
  res    public.reservations%ROWTYPE;
  cfg    public.restaurant_profile%ROWTYPE;
  v_paid numeric(12,2);
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RAISE EXCEPTION 'Hanya staf atau admin yang boleh memverifikasi pembayaran' USING ERRCODE = '42501';
  END IF;
  IF p_decision NOT IN ('terima', 'tolak') THEN
    RAISE EXCEPTION 'Keputusan harus "terima" atau "tolak"' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO pay FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pembayaran tidak ditemukan' USING ERRCODE = 'P0002'; END IF;
  IF pay.status <> 'menunggu' THEN
    RAISE EXCEPTION 'Pembayaran ini sudah diproses (status: %)', pay.status USING ERRCODE = '23514';
  END IF;

  SELECT * INTO inv FROM public.invoices WHERE id = pay.invoice_id FOR UPDATE;
  SELECT * INTO res FROM public.reservations WHERE id = inv.reservation_id;
  SELECT * INTO cfg FROM public.restaurant_profile WHERE id = 1;

  IF p_decision = 'terima' THEN
    UPDATE public.payments
       SET status = 'berhasil', paid_at = now(), verified_at = now(),
           verified_by = auth.uid(), recorded_by = auth.uid(),
           verification_note = NULLIF(btrim(p_note), '')
     WHERE id = p_payment_id
     RETURNING * INTO pay;

    -- Uang masuk setelah reservasi dibatalkan: tandai untuk dikembalikan.
    IF res.status = 'dibatalkan' THEN
      SELECT COALESCE(SUM(amount), 0) INTO v_paid
        FROM public.payments WHERE invoice_id = inv.id AND status = 'berhasil';
      UPDATE public.invoices
         SET refund_status = 'menunggu_refund', refund_amount = v_paid
       WHERE id = inv.id AND refund_status = 'tidak_ada';
    END IF;

  ELSE
    IF p_note IS NULL OR char_length(btrim(p_note)) < 5 THEN
      RAISE EXCEPTION 'Alasan penolakan wajib diisi (minimal 5 karakter)' USING ERRCODE = '23514';
    END IF;
    UPDATE public.payments
       SET status = 'gagal', verified_at = now(), verified_by = auth.uid(),
           verification_note = btrim(p_note)
     WHERE id = p_payment_id
     RETURNING * INTO pay;

    IF inv.payment_status = 'belum_dibayar' AND res.status = 'dikonfirmasi' AND cfg.dp_deadline_minutes > 0 THEN
      UPDATE public.invoices
         SET dp_due_at = LEAST(
               now() + make_interval(mins => cfg.dp_deadline_minutes),
               ((res.reservation_date + res.start_time) AT TIME ZONE 'Asia/Jakarta'))
       WHERE id = inv.id;
    END IF;
  END IF;

  RETURN pay;
END $$;

REVOKE ALL ON FUNCTION public.verify_payment(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_payment(uuid, text, text) TO authenticated;

-- ---------------------------------------------------------------------
-- 13. STAF MENCATAT PEMBAYARAN LANGSUNG DI RESTORAN (tunai, debit, QRIS/transfer di tempat)
-- Nominal dihitung database (tidak diketik bebas, mencegah salah ketik).
-- Hanya untuk reservasi dikonfirmasi/check_in.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_payment_at_restaurant(
  p_invoice_id      uuid,
  p_choice          text,
  p_method          public.payment_method,
  p_idempotency_key varchar(64),
  p_reference       text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  inv          public.invoices%ROWTYPE;
  res          public.reservations%ROWTYPE;
  v_paid       numeric(12,2);
  v_amount     numeric(12,2);
  v_type       text;
  v_payment_id uuid;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RAISE EXCEPTION 'Hanya staf atau admin yang boleh mencatat pembayaran' USING ERRCODE = '42501';
  END IF;
  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'Idempotency key wajib diisi.';
  END IF;

  SELECT * INTO inv FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice tidak ditemukan' USING ERRCODE = 'P0002'; END IF;

  SELECT id INTO v_payment_id FROM public.payments
   WHERE idempotency_key = p_idempotency_key AND invoice_id = p_invoice_id;
  IF FOUND THEN RETURN v_payment_id; END IF;

  SELECT * INTO res FROM public.reservations WHERE id = inv.reservation_id;
  IF inv.payment_status = 'dibatalkan' OR res.status NOT IN ('dikonfirmasi', 'check_in') THEN
    RAISE EXCEPTION 'Reservasi/invoice tidak dapat menerima pembayaran.' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.restaurant_profile rp
     WHERE rp.id = 1 AND p_method::text = ANY (rp.available_payment_methods)
  ) THEN
    RAISE EXCEPTION 'Metode pembayaran sedang tidak tersedia.' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (SELECT 1 FROM public.payments WHERE invoice_id = p_invoice_id AND status = 'menunggu') THEN
    RAISE EXCEPTION 'Masih ada pengajuan pembayaran pelanggan yang menunggu verifikasi.' USING ERRCODE = '23514';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
    FROM public.payments WHERE invoice_id = p_invoice_id AND status = 'berhasil';

  SELECT o_amount, o_type INTO v_amount, v_type
    FROM public.payment_amount_for(inv.dp_amount, inv.total_amount, v_paid, p_choice);

  INSERT INTO public.payments (
    invoice_id, type, payment_choice, method, amount, status, reference_no,
    idempotency_key, submitted_at, paid_at, verified_at, verified_by, recorded_by
  ) VALUES (
    p_invoice_id, v_type, p_choice, p_method, v_amount, 'berhasil', NULLIF(btrim(p_reference), ''),
    p_idempotency_key, now(), now(), now(), auth.uid(), auth.uid()
  )
  RETURNING id INTO v_payment_id;

  RETURN v_payment_id;
END $$;

REVOKE ALL ON FUNCTION public.record_payment_at_restaurant(uuid, text, public.payment_method, varchar, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_payment_at_restaurant(uuid, text, public.payment_method, varchar, text)
  TO authenticated;

-- ---------------------------------------------------------------------
-- 14. STAF MENYELESAIKAN REFUND / MENETAPKAN DP HANGUS
-- sudah_dikembalikan: uang sudah ditransfer balik (catatan/no. referensi wajib)
-- dp_hangus         : untuk pembatalan yang terlambat atas kebijakan restoran
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.settle_refund(
  p_invoice_id uuid, p_action text, p_note text
) RETURNS public.invoices
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  inv public.invoices%ROWTYPE;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RAISE EXCEPTION 'Hanya staf atau admin yang boleh memproses refund' USING ERRCODE = '42501';
  END IF;
  IF p_action NOT IN ('sudah_dikembalikan', 'dp_hangus') THEN
    RAISE EXCEPTION 'Aksi harus "sudah_dikembalikan" atau "dp_hangus"' USING ERRCODE = '23514';
  END IF;
  IF p_note IS NULL OR char_length(btrim(p_note)) < 3 THEN
    RAISE EXCEPTION 'Catatan wajib diisi (no. referensi atau alasan)' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO inv FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice tidak ditemukan' USING ERRCODE = 'P0002'; END IF;
  IF inv.refund_status <> 'menunggu_refund' THEN
    RAISE EXCEPTION 'Invoice ini tidak sedang menunggu refund' USING ERRCODE = '23514';
  END IF;

  IF p_action = 'sudah_dikembalikan' THEN
    UPDATE public.invoices
       SET refund_status = 'sudah_refund', refunded_at = now(), refunded_by = auth.uid(),
           refund_note = btrim(p_note)
     WHERE id = p_invoice_id RETURNING * INTO inv;
  ELSE
    UPDATE public.invoices
       SET refund_status = 'tidak_ada', refund_amount = NULL, dp_forfeited_at = now(),
           refund_note = btrim(p_note)
     WHERE id = p_invoice_id RETURNING * INTO inv;
  END IF;

  RETURN inv;
END $$;

REVOKE ALL ON FUNCTION public.settle_refund(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_refund(uuid, text, text) TO authenticated;

-- ---------------------------------------------------------------------
-- 15. BACKFILL tanda uang untuk data yang sudah ada.
-- Jalankan juga SETELAH seed (seed memindahkan status sebelum pembayaran dibuat):
--     SELECT public.backfill_money_flags();
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.backfill_money_flags() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.invoices i
     SET dp_forfeited_at = COALESCE(i.dp_forfeited_at, now())
    FROM public.reservations r
   WHERE r.id = i.reservation_id AND r.status = 'tidak_hadir'
     AND EXISTS (SELECT 1 FROM public.payments p WHERE p.invoice_id = i.id AND p.status = 'berhasil');

  UPDATE public.invoices i
     SET refund_status = 'menunggu_refund',
         refund_amount = (SELECT SUM(p.amount) FROM public.payments p WHERE p.invoice_id = i.id AND p.status = 'berhasil')
    FROM public.reservations r
   WHERE r.id = i.reservation_id AND r.status = 'dibatalkan' AND i.refund_status = 'tidak_ada'
     AND EXISTS (SELECT 1 FROM public.payments p WHERE p.invoice_id = i.id AND p.status = 'berhasil');
END $$;

REVOKE ALL ON FUNCTION public.backfill_money_flags() FROM PUBLIC, anon, authenticated;
SELECT public.backfill_money_flags();

-- ---------------------------------------------------------------------
-- 16. OPSIONAL (jalankan setelah UI staf memakai RPC di atas):
-- cabut hak tulis langsung staf pada payments agar semua perubahan lewat
-- verify_payment / record_payment_at_restaurant (nominal dan waktu tidak bisa diketik bebas).
-- ---------------------------------------------------------------------
-- DROP POLICY IF EXISTS payments_staff_write ON public.payments;
-- CREATE POLICY payments_staff_read ON public.payments FOR SELECT TO authenticated
--   USING (public.is_staff_or_admin());
