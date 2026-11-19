-- =====================================================================
-- Migration 3: Supabase Storage Bucket untuk aset publik restoran & menu
-- Bucket: restaurant-assets (publik baca, hanya admin tulis, maks 2MB)
-- =====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'restaurant-assets',
  'restaurant-assets',
  true,
  2097152, -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Semua pengunjung dapat melihat aset foto menu & restoran
DROP POLICY IF EXISTS "Public read restaurant assets" ON storage.objects;
CREATE POLICY "Public read restaurant assets"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'restaurant-assets');

-- Hanya admin yang boleh mengunggah, mengubah, dan menghapus aset
DROP POLICY IF EXISTS "Admin insert restaurant assets" ON storage.objects;
CREATE POLICY "Admin insert restaurant assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'restaurant-assets' AND public.is_admin());

DROP POLICY IF EXISTS "Admin update restaurant assets" ON storage.objects;
CREATE POLICY "Admin update restaurant assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'restaurant-assets' AND public.is_admin())
  WITH CHECK (bucket_id = 'restaurant-assets' AND public.is_admin());

DROP POLICY IF EXISTS "Admin delete restaurant assets" ON storage.objects;
CREATE POLICY "Admin delete restaurant assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'restaurant-assets' AND public.is_admin());
