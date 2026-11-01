-- =====================================================================
-- Migration 3: Supabase Storage untuk foto menu dan foto restoran
-- Hanya berjalan di Supabase (schema "storage" disediakan Supabase).
-- Bucket publik: foto katalog boleh dilihat siapa saja. Hanya admin yang boleh
-- mengunggah, mengganti, atau menghapus. Tabel hanya menyimpan PATH berkas
-- (contoh: "menu/steak-wagyu.webp"), bukan Base64.
-- Pembatasan ukuran dan tipe berkas diterapkan oleh bucket, di samping validasi di backend.
-- =====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('restaurant-assets', 'restaurant-assets', true, 2097152,
        ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "restaurant_assets_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'restaurant-assets');

CREATE POLICY "restaurant_assets_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'restaurant-assets' AND public.is_admin());

CREATE POLICY "restaurant_assets_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'restaurant-assets' AND public.is_admin())
  WITH CHECK (bucket_id = 'restaurant-assets' AND public.is_admin());

CREATE POLICY "restaurant_assets_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'restaurant-assets' AND public.is_admin());
