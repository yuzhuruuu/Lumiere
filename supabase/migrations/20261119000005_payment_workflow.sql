-- =====================================================================
-- Migration 5 (rekonstruksi dari docs/database-design_revisi_payment_workflow_v2.md)
-- Konfigurasi rekening/QRIS, pilihan pembayaran, bukti pembayaran, dan RPC
-- pengajuan pembayaran. Dijalankan SEBELUM migration 6.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. KONFIGURASI PEMBAYARAN PADA restaurant_profile
-- ---------------------------------------------------------------------
ALTER TABLE public.restaurant_profile
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS bank_account_name text,
  ADD COLUMN IF NOT EXISTS qris_path text,
  ADD COLUMN IF NOT EXISTS available_payment_methods text[] NOT NULL
    DEFAULT ARRAY['tunai', 'transfer', 'qris', 'kartu_debit']::text[],
  ADD COLUMN IF NOT EXISTS payment_instructions text;

ALTER TABLE public.restaurant_profile
  DROP CONSTRAINT IF EXISTS restaurant_payment_methods_valid,
  ADD CONSTRAINT restaurant_payment_methods_valid
    CHECK (available_payment_methods <@ ARRAY['tunai', 'transfer', 'qris', 'kartu_debit']::text[]);

COMMENT ON COLUMN public.restaurant_profile.available_payment_methods IS
  'Metode pembayaran yang aktif; dipakai untuk memfilter pilihan di halaman pembayaran pelanggan.';

-- ---------------------------------------------------------------------
-- 2. KOLOM BARU PADA payments
-- type diubah dari enum menjadi text agar migration 6 bisa memakai
-- 'dp' | 'penuh' | 'pelunasan' dengan CHECK.
-- ---------------------------------------------------------------------
ALTER TABLE public.payments
  ALTER COLUMN type TYPE text USING type::text;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_type_valid,
  ADD CONSTRAINT payments_type_valid CHECK (type IN ('dp', 'penuh', 'pelunasan'));

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_choice text NOT NULL DEFAULT 'dp_50',
  ADD COLUMN IF NOT EXISTS proof_path text,
  ADD COLUMN IF NOT EXISTS selected_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_choice_valid,
  ADD CONSTRAINT payments_choice_valid CHECK (payment_choice IN ('dp_50', 'penuh', 'pelunasan'));

-- Pembayaran yang belum diverifikasi belum memiliki paid_at.
ALTER TABLE public.payments
  ALTER COLUMN paid_at DROP NOT NULL;

-- Backfill data lama.
UPDATE public.payments
   SET payment_choice = CASE
         WHEN type = 'penuh' THEN 'penuh'
         WHEN type = 'pelunasan' THEN 'pelunasan'
         ELSE 'dp_50'
       END,
       submitted_at = COALESCE(submitted_at, paid_at, now()),
       selected_by = COALESCE(selected_by, recorded_by)
 WHERE payment_choice IS NULL OR submitted_at IS NULL;

-- ---------------------------------------------------------------------
-- 3. BUCKET PRIVATE UNTUK BUKTI PEMBAYARAN
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS payment_proofs_insert_own ON storage.objects;
CREATE POLICY payment_proofs_insert_own ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS payment_proofs_select_own_or_staff ON storage.objects;
CREATE POLICY payment_proofs_select_own_or_staff ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_staff_or_admin()
    )
  );

-- ---------------------------------------------------------------------
-- 4. RPC PENGAJUAN PEMBAYARAN (versi awal; migration 6 menggantinya)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_payment_request(
  p_invoice_id      uuid,
  p_choice          text,
  p_method          public.payment_method,
  p_idempotency_key varchar(64)
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
  v_invoice public.invoices%ROWTYPE;
  v_payment_id uuid;
BEGIN
  SELECT i.* INTO v_invoice
    FROM public.invoices i
    JOIN public.reservations r ON r.id = i.reservation_id
   WHERE i.id = p_invoice_id AND r.customer_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice tidak ditemukan atau bukan milik pengguna ini.';
  END IF;

  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'Idempotency key wajib diisi.';
  END IF;

  SELECT id INTO v_payment_id FROM public.payments
   WHERE idempotency_key = p_idempotency_key AND invoice_id = p_invoice_id;
  IF FOUND THEN RETURN v_payment_id; END IF;

  INSERT INTO public.payments (
    invoice_id, type, payment_choice, method, amount, status,
    idempotency_key, selected_by, submitted_at
  )
  VALUES (
    p_invoice_id,
    CASE WHEN p_choice = 'pelunasan' THEN 'pelunasan' ELSE 'dp' END,
    p_choice,
    p_method,
    CASE WHEN p_choice = 'pelunasan' THEN v_invoice.total_amount - v_invoice.dp_amount
         ELSE v_invoice.dp_amount END,
    'menunggu',
    p_idempotency_key,
    auth.uid(),
    now()
  )
  RETURNING id INTO v_payment_id;

  RETURN v_payment_id;
END $$;

REVOKE ALL ON FUNCTION public.submit_payment_request(uuid, text, public.payment_method, varchar)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_payment_request(uuid, text, public.payment_method, varchar)
  TO authenticated;

-- ---------------------------------------------------------------------
-- 5. LAMPIRKAN BUKTI KE PENGAJUAN MILIK SENDIRI
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.attach_payment_proof(
  p_payment_id uuid,
  p_proof_path text
) RETURNS public.payments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
  pay public.payments;
BEGIN
  SELECT * INTO pay FROM public.payments
   WHERE id = p_payment_id AND selected_by = auth.uid() AND status = 'menunggu';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pengajuan pembayaran tidak ditemukan atau bukan milik Anda.';
  END IF;

  IF p_proof_path IS NULL
     OR (storage.foldername(p_proof_path))[1] IS DISTINCT FROM auth.uid()::text THEN
    RAISE EXCEPTION 'Path bukti tidak valid.';
  END IF;

  UPDATE public.payments SET proof_path = p_proof_path WHERE id = p_payment_id
   RETURNING * INTO pay;

  RETURN pay;
END $$;

REVOKE ALL ON FUNCTION public.attach_payment_proof(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attach_payment_proof(uuid, text) TO authenticated;
