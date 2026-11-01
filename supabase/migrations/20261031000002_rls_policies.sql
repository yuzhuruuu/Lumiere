-- =====================================================================
-- Migration 2: Row Level Security (RLS), grant, dan indeks pendukung
-- Catatan: backend Next.js yang memakai service_role melewati RLS, jadi
-- pemeriksaan hak akses di server TETAP wajib. RLS adalah lapis kedua.
-- =====================================================================

-- Helper: role pengguna yang sedang login. SECURITY DEFINER agar tidak rekursif pada tabel profiles.
CREATE OR REPLACE FUNCTION current_user_role() RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM profiles WHERE id = auth.uid() AND is_active
$$;

CREATE OR REPLACE FUNCTION is_staff_or_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(current_user_role() IN ('staf', 'admin'), false)
$$;

CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(current_user_role() = 'admin', false)
$$;

CREATE OR REPLACE FUNCTION owns_reservation(p_reservation_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM reservations WHERE id = p_reservation_id AND customer_id = auth.uid())
$$;

-- Aktifkan RLS di semua tabel
ALTER TABLE profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_profile      ENABLE ROW LEVEL SECURITY;
ALTER TABLE operating_hours         ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE dining_tables           ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices                ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments                ENABLE ROW LEVEL SECURITY;

-- ---------------- profiles ----------------
CREATE POLICY profiles_select ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR is_staff_or_admin());
-- Pengguna boleh mengubah profilnya sendiri; perubahan role/is_active diblok trigger protect_profile_role.
CREATE POLICY profiles_update_own ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY profiles_admin_all ON profiles FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- ---------------- katalog publik: baca untuk semua, tulis hanya admin ----------------
CREATE POLICY restaurant_profile_read  ON restaurant_profile FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY restaurant_profile_admin ON restaurant_profile FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY operating_hours_read  ON operating_hours FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY operating_hours_admin ON operating_hours FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY menu_categories_read  ON menu_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY menu_categories_admin ON menu_categories FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY menu_items_read  ON menu_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY menu_items_admin ON menu_items FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY dining_tables_read  ON dining_tables FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY dining_tables_admin ON dining_tables FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ---------------- reservations ----------------
CREATE POLICY reservations_select ON reservations FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR is_staff_or_admin());

-- Pelanggan hanya boleh membuat reservasi atas namanya sendiri dengan status awal.
CREATE POLICY reservations_insert_own ON reservations FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid() AND status = 'menunggu_validasi' AND current_user_role() = 'pelanggan');

-- Pelanggan hanya boleh membatalkan reservasinya sendiri (menunggu / dikonfirmasi).
CREATE POLICY reservations_cancel_own ON reservations FOR UPDATE TO authenticated
  USING (customer_id = auth.uid() AND status IN ('menunggu_validasi', 'dikonfirmasi'))
  WITH CHECK (customer_id = auth.uid() AND status = 'dibatalkan');

CREATE POLICY reservations_staff_update ON reservations FOR UPDATE TO authenticated
  USING (is_staff_or_admin()) WITH CHECK (is_staff_or_admin());
-- Tidak ada policy DELETE: reservasi tidak pernah dihapus, hanya diubah statusnya.

-- ---------------- reservation_items ----------------
CREATE POLICY reservation_items_select ON reservation_items FOR SELECT TO authenticated
  USING (owns_reservation(reservation_id) OR is_staff_or_admin());
CREATE POLICY reservation_items_insert_own ON reservation_items FOR INSERT TO authenticated
  WITH CHECK (
    owns_reservation(reservation_id)
    AND EXISTS (SELECT 1 FROM reservations r
                WHERE r.id = reservation_id AND r.status = 'menunggu_validasi')
  );
CREATE POLICY reservation_items_admin ON reservation_items FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- ---------------- reservation_status_logs ----------------
CREATE POLICY status_logs_select ON reservation_status_logs FOR SELECT TO authenticated
  USING (owns_reservation(reservation_id) OR is_staff_or_admin());
-- Insert hanya lewat trigger (SECURITY DEFINER); tidak ada policy tulis untuk pengguna.

-- ---------------- orders ----------------
CREATE POLICY orders_select ON orders FOR SELECT TO authenticated
  USING (owns_reservation(reservation_id) OR is_staff_or_admin());
CREATE POLICY orders_staff_write ON orders FOR ALL TO authenticated
  USING (is_staff_or_admin()) WITH CHECK (is_staff_or_admin());

-- ---------------- invoices ----------------
CREATE POLICY invoices_select ON invoices FOR SELECT TO authenticated
  USING (owns_reservation(reservation_id) OR is_staff_or_admin());
CREATE POLICY invoices_staff_write ON invoices FOR ALL TO authenticated
  USING (is_staff_or_admin()) WITH CHECK (is_staff_or_admin());

-- ---------------- payments ----------------
CREATE POLICY payments_select ON payments FOR SELECT TO authenticated
  USING (
    is_staff_or_admin()
    OR EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id AND owns_reservation(i.reservation_id))
  );
CREATE POLICY payments_staff_write ON payments FOR ALL TO authenticated
  USING (is_staff_or_admin()) WITH CHECK (is_staff_or_admin());

-- ---------------- hak tabel dasar ----------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON restaurant_profile, operating_hours, menu_categories, menu_items, dining_tables TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ---------------- hak eksekusi fungsi bisnis ----------------
-- Supabase memberi EXECUTE ke anon/authenticated secara default, jadi dicabut eksplisit.
-- Hanya pengguna login yang boleh memanggil; pemeriksaan role dilakukan di dalam fungsi.
REVOKE ALL ON FUNCTION create_reservation(varchar, varchar, varchar, date, time, integer, integer, integer, jsonb, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_reservation(varchar, varchar, varchar, date, time, integer, integer, integer, jsonb, text)
  TO authenticated;
REVOKE ALL ON FUNCTION generate_invoice(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION generate_invoice(uuid) TO authenticated;

-- Pembatalan otomatis hanya dijalankan oleh pg_cron (peran postgres), bukan oleh pengguna aplikasi.
REVOKE ALL ON FUNCTION expire_pending_reservations() FROM PUBLIC, anon, authenticated;
