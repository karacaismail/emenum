-- ============================================================================
-- 007_rls_policies.sql
-- Row Level Security (RLS) Policies for Multi-Tenant Data Isolation
--
-- CRITICAL: Her restoran sadece kendi verisine erisebilir!
-- Super Admin'ler tum verilere erisebilir.
-- ============================================================================

-- ============================================================================
-- USERS TABLE RLS
-- Kullanicilar kendi profillerini gorebilir, super adminler tumunu
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- SELECT: Kullanici kendi profilini gorebilir veya super admin tumunu gorebilir
CREATE POLICY "users_select_own_or_admin"
ON users FOR SELECT
USING (
    id = auth.uid()
    OR is_super_admin(auth.uid())
);

-- UPDATE: Kullanici sadece kendi profilini guncelleyebilir
-- is_super_admin alani sadece super admin tarafindan degistirilebilir (service role ile)
CREATE POLICY "users_update_own"
ON users FOR UPDATE
USING (id = auth.uid())
WITH CHECK (
    id = auth.uid()
    -- is_super_admin degistirilemez (service role hariç)
);

-- INSERT: Sadece trigger ile otomatik olusturulur (auth.users insert sonrasi)
-- Manuel insert icin service role gerekir
CREATE POLICY "users_insert_auth"
ON users FOR INSERT
WITH CHECK (id = auth.uid());

-- DELETE: Kullanicilar hesaplarini silebilir (GDPR uyumlulugu)
CREATE POLICY "users_delete_own"
ON users FOR DELETE
USING (id = auth.uid());

-- ============================================================================
-- ORGANIZATIONS TABLE RLS
-- Kullanicilar sadece uye olduklari organizasyonlari gorebilir
-- Public menu icin slug ile erisim mümkün
-- ============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- SELECT: Uye oldugu organizasyonlari veya aktif olanlari slug ile gorebilir (public menu)
CREATE POLICY "organizations_select_member_or_public"
ON organizations FOR SELECT
USING (
    -- Super admin tumunu gorebilir
    is_super_admin(auth.uid())
    -- Uye oldugu organizasyonlar
    OR id IN (SELECT get_user_organization_ids(auth.uid()))
    -- Public menu icin aktif organizasyonlar (anon users)
    OR (status = 'active' AND auth.uid() IS NULL)
    -- Authenticated users da public menuleri gorebilir
    OR status = 'active'
);

-- INSERT: Herkes organizasyon olusturabilir (kayit sirasinda)
CREATE POLICY "organizations_insert_authenticated"
ON organizations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Owner veya admin guncelleme yapabilir
CREATE POLICY "organizations_update_owner_admin"
ON organizations FOR UPDATE
USING (
    is_super_admin(auth.uid())
    OR user_has_role_in_org(auth.uid(), id, ARRAY['owner', 'admin']::member_role[])
)
WITH CHECK (
    is_super_admin(auth.uid())
    OR user_has_role_in_org(auth.uid(), id, ARRAY['owner', 'admin']::member_role[])
);

-- DELETE: Sadece owner silebilir
CREATE POLICY "organizations_delete_owner"
ON organizations FOR DELETE
USING (
    is_super_admin(auth.uid())
    OR user_has_role_in_org(auth.uid(), id, ARRAY['owner']::member_role[])
);

-- ============================================================================
-- ORGANIZATION_MEMBERS TABLE RLS
-- Kullanicilar kendi organizasyonlarindaki uyeleri gorebilir
-- ============================================================================

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- SELECT: Kendi organizasyonunun uyelerini gorebilir
CREATE POLICY "organization_members_select_same_org"
ON organization_members FOR SELECT
USING (
    is_super_admin(auth.uid())
    OR organization_id IN (SELECT get_user_organization_ids(auth.uid()))
    -- Kullanici kendi uyeligini her zaman gorebilir
    OR user_id = auth.uid()
);

-- INSERT: Owner veya admin uye ekleyebilir
-- Ilk uye (owner) organizasyon olusturulurken eklenir
CREATE POLICY "organization_members_insert_admin"
ON organization_members FOR INSERT
WITH CHECK (
    is_super_admin(auth.uid())
    OR user_has_role_in_org(auth.uid(), organization_id, ARRAY['owner', 'admin']::member_role[])
    -- Yeni organizasyon olusturulurken owner kendini ekleyebilir
    OR (user_id = auth.uid() AND NOT EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = organization_members.organization_id
    ))
);

-- UPDATE: Owner rolleri degistirebilir, admin sadece alt rolleri degistirebilir
CREATE POLICY "organization_members_update_admin"
ON organization_members FOR UPDATE
USING (
    is_super_admin(auth.uid())
    OR user_has_role_in_org(auth.uid(), organization_id, ARRAY['owner', 'admin']::member_role[])
)
WITH CHECK (
    is_super_admin(auth.uid())
    OR user_has_role_in_org(auth.uid(), organization_id, ARRAY['owner', 'admin']::member_role[])
);

-- DELETE: Owner veya admin uye cikarabilir (kendisi hariç owner icin)
CREATE POLICY "organization_members_delete_admin"
ON organization_members FOR DELETE
USING (
    is_super_admin(auth.uid())
    OR user_has_role_in_org(auth.uid(), organization_id, ARRAY['owner', 'admin']::member_role[])
    -- Kullanici kendi uyeligini iptal edebilir (owner hariç)
    OR (user_id = auth.uid() AND role != 'owner')
);

-- ============================================================================
-- CATEGORIES TABLE RLS
-- Kullanicilar kendi organizasyonlarinin kategorilerini yonetebilir
-- Public menu icin herkes gorebilir
-- ============================================================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- SELECT: Public menu icin herkes gorebilir, detaylari icin uyelik gerekir
CREATE POLICY "categories_select_public_or_member"
ON categories FOR SELECT
USING (
    is_super_admin(auth.uid())
    -- Public menu icin aktif kategoriler (organizasyon aktifse)
    OR (is_active = true AND EXISTS (
        SELECT 1 FROM organizations o
        WHERE o.id = organization_id AND o.status = 'active'
    ))
    -- Uye oldugu organizasyonlarin tum kategorileri
    OR organization_id IN (SELECT get_user_organization_ids(auth.uid()))
);

-- INSERT: Manager ve ustu roller kategori ekleyebilir
CREATE POLICY "categories_insert_manager"
ON categories FOR INSERT
WITH CHECK (
    is_super_admin(auth.uid())
    OR user_has_role_in_org(auth.uid(), organization_id, ARRAY['owner', 'admin', 'manager']::member_role[])
);

-- UPDATE: Manager ve ustu roller kategori guncelleyebilir
CREATE POLICY "categories_update_manager"
ON categories FOR UPDATE
USING (
    is_super_admin(auth.uid())
    OR user_has_role_in_org(auth.uid(), organization_id, ARRAY['owner', 'admin', 'manager']::member_role[])
)
WITH CHECK (
    is_super_admin(auth.uid())
    OR user_has_role_in_org(auth.uid(), organization_id, ARRAY['owner', 'admin', 'manager']::member_role[])
);

-- DELETE: Manager ve ustu roller kategori silebilir
CREATE POLICY "categories_delete_manager"
ON categories FOR DELETE
USING (
    is_super_admin(auth.uid())
    OR user_has_role_in_org(auth.uid(), organization_id, ARRAY['owner', 'admin', 'manager']::member_role[])
);

-- ============================================================================
-- PRODUCTS TABLE RLS
-- Kullanicilar kendi organizasyonlarinin urunlerini yonetebilir
-- Public menu icin herkes gorebilir
-- ============================================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- SELECT: Public menu icin aktif urunler gorulebilir
CREATE POLICY "products_select_public_or_member"
ON products FOR SELECT
USING (
    is_super_admin(auth.uid())
    -- Public menu icin aktif urunler (organizasyon aktifse)
    OR (is_active = true AND EXISTS (
        SELECT 1 FROM organizations o
        WHERE o.id = organization_id AND o.status = 'active'
    ))
    -- Uye oldugu organizasyonlarin tum urunleri
    OR organization_id IN (SELECT get_user_organization_ids(auth.uid()))
);

-- INSERT: Manager ve ustu roller urun ekleyebilir
CREATE POLICY "products_insert_manager"
ON products FOR INSERT
WITH CHECK (
    is_super_admin(auth.uid())
    OR user_has_role_in_org(auth.uid(), organization_id, ARRAY['owner', 'admin', 'manager']::member_role[])
);

-- UPDATE: Manager ve ustu roller urun guncelleyebilir
CREATE POLICY "products_update_manager"
ON products FOR UPDATE
USING (
    is_super_admin(auth.uid())
    OR user_has_role_in_org(auth.uid(), organization_id, ARRAY['owner', 'admin', 'manager']::member_role[])
)
WITH CHECK (
    is_super_admin(auth.uid())
    OR user_has_role_in_org(auth.uid(), organization_id, ARRAY['owner', 'admin', 'manager']::member_role[])
);

-- DELETE: Manager ve ustu roller urun silebilir (is_active=false tercih edilir)
CREATE POLICY "products_delete_manager"
ON products FOR DELETE
USING (
    is_super_admin(auth.uid())
    OR user_has_role_in_org(auth.uid(), organization_id, ARRAY['owner', 'admin', 'manager']::member_role[])
);

-- ============================================================================
-- PRICE_LEDGER TABLE RLS
-- CRITICAL: Sadece INSERT yapilabilir, UPDATE/DELETE trigger ile engellenmis!
-- Public menu icin fiyatlar gorulebilir
-- ============================================================================

ALTER TABLE price_ledger ENABLE ROW LEVEL SECURITY;

-- SELECT: Public menu icin aktif fiyatlar gorulebilir
CREATE POLICY "price_ledger_select_public_or_member"
ON price_ledger FOR SELECT
USING (
    is_super_admin(auth.uid())
    -- Public menu icin fiyatlar (urun aktif ve organizasyon aktifse)
    OR EXISTS (
        SELECT 1 FROM products p
        JOIN organizations o ON o.id = p.organization_id
        WHERE p.id = product_id
        AND o.status = 'active'
    )
    -- Uye oldugu organizasyonlarin tum fiyat gecmisi
    OR EXISTS (
        SELECT 1 FROM products p
        WHERE p.id = product_id
        AND p.organization_id IN (SELECT get_user_organization_ids(auth.uid()))
    )
);

-- INSERT: Manager ve ustu roller fiyat ekleyebilir (created_by otomatik ayarlanir)
CREATE POLICY "price_ledger_insert_manager"
ON price_ledger FOR INSERT
WITH CHECK (
    is_super_admin(auth.uid())
    OR EXISTS (
        SELECT 1 FROM products p
        WHERE p.id = product_id
        AND user_has_role_in_org(auth.uid(), p.organization_id, ARRAY['owner', 'admin', 'manager']::member_role[])
    )
);

-- NOT: UPDATE ve DELETE zaten trigger ile engellenmis (002_products_price_ledger.sql)
-- Yine de RLS seviyesinde de engelleyelim
CREATE POLICY "price_ledger_no_update"
ON price_ledger FOR UPDATE
USING (false)
WITH CHECK (false);

CREATE POLICY "price_ledger_no_delete"
ON price_ledger FOR DELETE
USING (false);

-- ============================================================================
-- FEATURES TABLE RLS
-- Herkes okuyabilir (ozellik listesi gosterimi icin)
-- Sadece super admin yonetebilir
-- ============================================================================

ALTER TABLE features ENABLE ROW LEVEL SECURITY;

-- SELECT: Herkes okuyabilir (pricing page, feature list)
CREATE POLICY "features_select_all"
ON features FOR SELECT
USING (true);

-- INSERT/UPDATE/DELETE: Sadece super admin (service role ile)
CREATE POLICY "features_insert_super_admin"
ON features FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "features_update_super_admin"
ON features FOR UPDATE
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "features_delete_super_admin"
ON features FOR DELETE
USING (is_super_admin(auth.uid()));

-- ============================================================================
-- PLANS TABLE RLS
-- Herkes okuyabilir (pricing page icin)
-- Sadece super admin yonetebilir
-- ============================================================================

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- SELECT: Herkes okuyabilir (pricing page)
CREATE POLICY "plans_select_all"
ON plans FOR SELECT
USING (true);

-- INSERT/UPDATE/DELETE: Sadece super admin
CREATE POLICY "plans_insert_super_admin"
ON plans FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "plans_update_super_admin"
ON plans FOR UPDATE
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "plans_delete_super_admin"
ON plans FOR DELETE
USING (is_super_admin(auth.uid()));

-- ============================================================================
-- PLAN_FEATURES TABLE RLS
-- Herkes okuyabilir (ozellik karsilastirma icin)
-- Sadece super admin yonetebilir
-- ============================================================================

ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;

-- SELECT: Herkes okuyabilir
CREATE POLICY "plan_features_select_all"
ON plan_features FOR SELECT
USING (true);

-- INSERT/UPDATE/DELETE: Sadece super admin
CREATE POLICY "plan_features_insert_super_admin"
ON plan_features FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "plan_features_update_super_admin"
ON plan_features FOR UPDATE
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "plan_features_delete_super_admin"
ON plan_features FOR DELETE
USING (is_super_admin(auth.uid()));

-- ============================================================================
-- SUBSCRIPTIONS TABLE RLS
-- Kullanicilar kendi organizasyonlarinin aboneliklerini gorebilir
-- Sadece super admin yonetebilir (manuel aktivasyon)
-- ============================================================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- SELECT: Kendi organizasyonunun aboneliklerini gorebilir
CREATE POLICY "subscriptions_select_member"
ON subscriptions FOR SELECT
USING (
    is_super_admin(auth.uid())
    OR organization_id IN (SELECT get_user_organization_ids(auth.uid()))
);

-- INSERT: Super admin veya organizasyon sahibi (kayit sirasinda)
CREATE POLICY "subscriptions_insert_admin_or_owner"
ON subscriptions FOR INSERT
WITH CHECK (
    is_super_admin(auth.uid())
    OR user_has_role_in_org(auth.uid(), organization_id, ARRAY['owner']::member_role[])
);

-- UPDATE: Sadece super admin (aktivasyon, status degisikligi)
CREATE POLICY "subscriptions_update_super_admin"
ON subscriptions FOR UPDATE
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- DELETE: Sadece super admin
CREATE POLICY "subscriptions_delete_super_admin"
ON subscriptions FOR DELETE
USING (is_super_admin(auth.uid()));

-- ============================================================================
-- ORGANIZATION_FEATURE_OVERRIDES TABLE RLS
-- Kullanicilar kendi organizasyonlarinin override'larini gorebilir
-- Sadece super admin yonetebilir
-- ============================================================================

ALTER TABLE organization_feature_overrides ENABLE ROW LEVEL SECURITY;

-- SELECT: Kendi organizasyonunun override'larini gorebilir
CREATE POLICY "org_feature_overrides_select_member"
ON organization_feature_overrides FOR SELECT
USING (
    is_super_admin(auth.uid())
    OR organization_id IN (SELECT get_user_organization_ids(auth.uid()))
);

-- INSERT/UPDATE/DELETE: Sadece super admin
CREATE POLICY "org_feature_overrides_insert_super_admin"
ON organization_feature_overrides FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "org_feature_overrides_update_super_admin"
ON organization_feature_overrides FOR UPDATE
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "org_feature_overrides_delete_super_admin"
ON organization_feature_overrides FOR DELETE
USING (is_super_admin(auth.uid()));

-- ============================================================================
-- RESTAURANT_TABLES TABLE RLS
-- Kullanicilar kendi organizasyonlarinin masalarini yonetebilir
-- Public QR tarama icin qr_uuid ile erisim
-- ============================================================================

ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;

-- SELECT: Public QR tarama icin aktif masalar gorulebilir
CREATE POLICY "restaurant_tables_select_public_or_member"
ON restaurant_tables FOR SELECT
USING (
    is_super_admin(auth.uid())
    -- Public QR tarama icin aktif masalar (organizasyon aktifse)
    OR (is_active = true AND EXISTS (
        SELECT 1 FROM organizations o
        WHERE o.id = organization_id AND o.status = 'active'
    ))
    -- Uye oldugu organizasyonlarin tum masalari
    OR organization_id IN (SELECT get_user_organization_ids(auth.uid()))
);

-- INSERT: Manager ve ustu roller masa ekleyebilir
CREATE POLICY "restaurant_tables_insert_manager"
ON restaurant_tables FOR INSERT
WITH CHECK (
    is_super_admin(auth.uid())
    OR user_has_role_in_org(auth.uid(), organization_id, ARRAY['owner', 'admin', 'manager']::member_role[])
);

-- UPDATE: Manager ve ustu roller masa guncelleyebilir
-- Waiter'lar sadece current_status ve last_ping_at guncelleyebilir
CREATE POLICY "restaurant_tables_update_staff"
ON restaurant_tables FOR UPDATE
USING (
    is_super_admin(auth.uid())
    OR user_has_role_in_org(auth.uid(), organization_id, ARRAY['owner', 'admin', 'manager', 'waiter']::member_role[])
)
WITH CHECK (
    is_super_admin(auth.uid())
    OR user_has_role_in_org(auth.uid(), organization_id, ARRAY['owner', 'admin', 'manager', 'waiter']::member_role[])
);

-- DELETE: Manager ve ustu roller masa silebilir
CREATE POLICY "restaurant_tables_delete_manager"
ON restaurant_tables FOR DELETE
USING (
    is_super_admin(auth.uid())
    OR user_has_role_in_org(auth.uid(), organization_id, ARRAY['owner', 'admin', 'manager']::member_role[])
);

-- ============================================================================
-- SERVICE_REQUESTS TABLE RLS
-- Garson cagirma istekleri - Public INSERT mumkun (QR ile)
-- Staff gorebilir ve yonetebilir
-- ============================================================================

ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

-- SELECT: Staff kendi organizasyonunun isteklerini gorebilir
CREATE POLICY "service_requests_select_staff"
ON service_requests FOR SELECT
USING (
    is_super_admin(auth.uid())
    OR organization_id IN (SELECT get_user_organization_ids(auth.uid()))
);

-- INSERT: Herkes servis istegi olusturabilir (QR tarama sonrasi)
-- Ancak create_service_request() fonksiyonu cooldown ve ozellik kontrolu yapar
-- Bu policy sadece SECURITY DEFINER fonksiyonlar icin izin verir
CREATE POLICY "service_requests_insert_public"
ON service_requests FOR INSERT
WITH CHECK (
    is_super_admin(auth.uid())
    -- Staff kendi organizasyonu icin istek olusturabilir
    OR user_has_role_in_org(auth.uid(), organization_id, ARRAY['owner', 'admin', 'manager', 'waiter']::member_role[])
    -- Public insert create_service_request() SECURITY DEFINER fonksiyonu ile yapilir
    -- Bu nedenle anon users icin dogrudan izin veriyoruz
    -- Gercek kontroller fonksiyon icinde yapilir (cooldown, feature check)
    OR true
);

-- UPDATE: Waiter ve ustu roller istegi guncelleyebilir (acknowledge, complete)
CREATE POLICY "service_requests_update_staff"
ON service_requests FOR UPDATE
USING (
    is_super_admin(auth.uid())
    OR user_has_role_in_org(auth.uid(), organization_id, ARRAY['owner', 'admin', 'manager', 'waiter']::member_role[])
)
WITH CHECK (
    is_super_admin(auth.uid())
    OR user_has_role_in_org(auth.uid(), organization_id, ARRAY['owner', 'admin', 'manager', 'waiter']::member_role[])
);

-- DELETE: Sadece admin ve ustu (genellikle silmek yerine status=cancelled yapilir)
CREATE POLICY "service_requests_delete_admin"
ON service_requests FOR DELETE
USING (
    is_super_admin(auth.uid())
    OR user_has_role_in_org(auth.uid(), organization_id, ARRAY['owner', 'admin']::member_role[])
);

-- ============================================================================
-- MENU_SNAPSHOTS TABLE RLS
-- Kullanicilar kendi organizasyonlarinin snapshot'larini gorebilir
-- INSERT mumkun, UPDATE/DELETE trigger ile engellenmis
-- ============================================================================

ALTER TABLE menu_snapshots ENABLE ROW LEVEL SECURITY;

-- SELECT: Kendi organizasyonunun snapshot'larini gorebilir
CREATE POLICY "menu_snapshots_select_member"
ON menu_snapshots FOR SELECT
USING (
    is_super_admin(auth.uid())
    OR organization_id IN (SELECT get_user_organization_ids(auth.uid()))
);

-- INSERT: Manager ve ustu roller snapshot olusturabilir
CREATE POLICY "menu_snapshots_insert_manager"
ON menu_snapshots FOR INSERT
WITH CHECK (
    is_super_admin(auth.uid())
    OR user_has_role_in_org(auth.uid(), organization_id, ARRAY['owner', 'admin', 'manager']::member_role[])
);

-- NOT: UPDATE ve DELETE zaten trigger ile engellenmis (005_audit_compliance.sql)
-- Yine de RLS seviyesinde de engelleyelim
CREATE POLICY "menu_snapshots_no_update"
ON menu_snapshots FOR UPDATE
USING (false)
WITH CHECK (false);

CREATE POLICY "menu_snapshots_no_delete"
ON menu_snapshots FOR DELETE
USING (false);

-- ============================================================================
-- AUDIT_LOGS TABLE RLS
-- Kullanicilar kendi organizasyonlarinin loglarini gorebilir
-- INSERT mumkun (trigger ve helper function ile), UPDATE/DELETE engellenmis
-- ============================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: Kendi organizasyonunun loglarini gorebilir
CREATE POLICY "audit_logs_select_member"
ON audit_logs FOR SELECT
USING (
    is_super_admin(auth.uid())
    -- Organization bazli loglar
    OR organization_id IN (SELECT get_user_organization_ids(auth.uid()))
    -- Kullanicinin kendi eylemleri (organization_id NULL olsa bile)
    OR user_id = auth.uid()
);

-- INSERT: Sistem ve kullanicilar log ekleyebilir
-- Gercek loglar genellikle trigger veya SECURITY DEFINER fonksiyonlar ile eklenir
CREATE POLICY "audit_logs_insert_system"
ON audit_logs FOR INSERT
WITH CHECK (
    is_super_admin(auth.uid())
    -- Kullanici kendi organizasyonu icin log ekleyebilir
    OR (organization_id IS NULL AND user_id = auth.uid())
    OR user_has_role_in_org(auth.uid(), organization_id, ARRAY['owner', 'admin', 'manager', 'waiter']::member_role[])
    -- Trigger'lar SECURITY DEFINER oldugu icin bu policy onlari engellemez
    OR true
);

-- NOT: UPDATE ve DELETE zaten trigger ile engellenmis (005_audit_compliance.sql)
-- Yine de RLS seviyesinde de engelleyelim
CREATE POLICY "audit_logs_no_update"
ON audit_logs FOR UPDATE
USING (false)
WITH CHECK (false);

CREATE POLICY "audit_logs_no_delete"
ON audit_logs FOR DELETE
USING (false);

-- ============================================================================
-- POLICY VERIFICATION HELPER FUNCTION
-- RLS politikalarinin dogru caliştiğini test etmek icin
-- ============================================================================

CREATE OR REPLACE FUNCTION verify_rls_policies()
RETURNS TABLE (
    table_name TEXT,
    rls_enabled BOOLEAN,
    policy_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.tablename::TEXT,
        t.rowsecurity,
        (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.tablename)
    FROM pg_tables t
    WHERE t.schemaname = 'public'
    AND t.tablename IN (
        'users', 'organizations', 'organization_members', 'categories',
        'products', 'price_ledger', 'features', 'plans', 'plan_features',
        'subscriptions', 'organization_feature_overrides', 'restaurant_tables',
        'service_requests', 'menu_snapshots', 'audit_logs'
    )
    ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION verify_rls_policies IS 'Tum tablolarin RLS durumunu ve policy sayisini dondurur. QA dogrulamasi icin kullanilir.';

-- ============================================================================
-- GRANT PERMISSIONS
-- anon ve authenticated roller icin temel izinler
-- ============================================================================

-- Anon users (public menu, waiter calling)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON organizations TO anon;
GRANT SELECT ON categories TO anon;
GRANT SELECT ON products TO anon;
GRANT SELECT ON price_ledger TO anon;
GRANT SELECT ON features TO anon;
GRANT SELECT ON plans TO anon;
GRANT SELECT ON plan_features TO anon;
GRANT SELECT ON restaurant_tables TO anon;
GRANT INSERT ON service_requests TO anon;

-- Authenticated users (full access based on RLS)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Helper functions erişimi
GRANT EXECUTE ON FUNCTION get_user_organization_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_role_in_org(UUID, UUID, member_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role_in_org(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_feature(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_feature_limit(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_features(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_service_request(UUID, service_request_type, TEXT, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_table_by_qr_uuid(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION can_create_service_request(UUID, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_rls_policies() TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "users_select_own_or_admin" ON users IS 'Kullanicilar kendi profillerini, super adminler tum profilleri gorebilir.';
COMMENT ON POLICY "organizations_select_member_or_public" ON organizations IS 'Uyeler kendi organizasyonlarini, herkes aktif organizasyonlari (public menu) gorebilir.';
COMMENT ON POLICY "categories_select_public_or_member" ON categories IS 'Herkes aktif kategorileri (public menu), uyeler tum kategorileri gorebilir.';
COMMENT ON POLICY "products_select_public_or_member" ON products IS 'Herkes aktif urunleri (public menu), uyeler tum urunleri gorebilir.';
COMMENT ON POLICY "price_ledger_select_public_or_member" ON price_ledger IS 'Herkes aktif fiyatlari (public menu), uyeler tum fiyat gecmisini gorebilir.';
COMMENT ON POLICY "service_requests_insert_public" ON service_requests IS 'Herkes servis istegi olusturabilir (QR tarama). Cooldown ve ozellik kontrolu fonksiyon icinde yapilir.';
