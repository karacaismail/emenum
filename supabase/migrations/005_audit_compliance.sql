-- ============================================================================
-- 005_audit_compliance.sql
-- Audit & Compliance System
-- Tables: menu_snapshots, audit_logs
--
-- CRITICAL: Bu tablolar yasal uyumluluk icin IMMUTABLE olmalidir!
-- UPDATE ve DELETE islemleri trigger ile engellenir.
-- ============================================================================

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Audit action types
-- Tum kayda deger eylemler bu enum ile kategorize edilir
CREATE TYPE audit_action AS ENUM (
    'create',           -- Yeni kayit olusturma
    'update',           -- Kayit guncelleme
    'delete',           -- Kayit silme
    'login',            -- Kullanici girisi
    'logout',           -- Kullanici cikisi
    'price_change',     -- Fiyat degisikligi (price_ledger INSERT)
    'activation',       -- Hesap aktivasyonu
    'suspension'        -- Hesap askiya alma
);

-- ============================================================================
-- MENU_SNAPSHOTS TABLE
-- Menu durumunun anlik goruntusu ve SHA-256 hash'i
-- Her fiyat degisikliginde menuunun tam durumu kaydedilir
-- ============================================================================

CREATE TABLE menu_snapshots (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Organization reference
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Snapshot data (JSON format)
    -- Icerik: organization_id, created_at, products[]
    -- Her product: { id, name, category, price, currency }
    snapshot_json JSONB NOT NULL,

    -- SHA-256 hash of snapshot_json (64 karakter hex)
    -- Snapshot'in degismedigini dogrulamak icin kullanilir
    sha256_hash VARCHAR(64) NOT NULL,

    -- Bu snapshot'i tetikleyen fiyat degisikligi (opsiyonel)
    -- NULL olabilir cunku manuel snapshot da alinabilir
    triggered_by_price_ledger_id UUID REFERENCES price_ledger(id) ON DELETE SET NULL,

    -- Immutable timestamp - asla degismez
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT menu_snapshots_hash_format CHECK (sha256_hash ~ '^[a-f0-9]{64}$'),
    CONSTRAINT menu_snapshots_json_not_empty CHECK (jsonb_typeof(snapshot_json) = 'object')
);

-- Indexes for menu_snapshots
CREATE INDEX idx_menu_snapshots_organization_id ON menu_snapshots (organization_id);
CREATE INDEX idx_menu_snapshots_created_at ON menu_snapshots (created_at DESC);
CREATE INDEX idx_menu_snapshots_hash ON menu_snapshots (sha256_hash);
CREATE INDEX idx_menu_snapshots_trigger ON menu_snapshots (triggered_by_price_ledger_id)
    WHERE triggered_by_price_ledger_id IS NOT NULL;

-- Composite index for common query pattern (org + time range)
CREATE INDEX idx_menu_snapshots_org_time ON menu_snapshots (organization_id, created_at DESC);

-- Comments for menu_snapshots
COMMENT ON TABLE menu_snapshots IS 'Menu durumunun anlik goruntusu. Her fiyat degisikliginde olusturulur. Yasal uyumluluk icin degistirilemez (immutable). SHA-256 hash ile butunluk dogrulanabilir.';
COMMENT ON COLUMN menu_snapshots.id IS 'Benzersiz snapshot ID''si.';
COMMENT ON COLUMN menu_snapshots.organization_id IS 'Snapshot''in ait oldugu isletme.';
COMMENT ON COLUMN menu_snapshots.snapshot_json IS 'Menu durumunun JSON formati. Icerik: { organization_id, created_at, products: [{ id, name, category, price, currency }] }';
COMMENT ON COLUMN menu_snapshots.sha256_hash IS 'snapshot_json''in SHA-256 hash''i (64 karakter hex). Verinin degismedigini dogrulamak icin kullanilir.';
COMMENT ON COLUMN menu_snapshots.triggered_by_price_ledger_id IS 'Bu snapshot''i tetikleyen fiyat degisikligi. Manuel snapshot''larda NULL.';
COMMENT ON COLUMN menu_snapshots.created_at IS 'Snapshot olusturma zamani. Asla degistirilemez.';

-- ============================================================================
-- AUDIT_LOGS TABLE
-- Tum sistem eylemlerinin kaydi
-- Guvenlik, uyumluluk ve hata ayiklama icin kritik
-- ============================================================================

CREATE TABLE audit_logs (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Context references (nullable - sistem eylemleri icin)
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Action details
    action audit_action NOT NULL,
    entity_type VARCHAR(100) NOT NULL,      -- Etkilenen varlik tipi: 'product', 'price_ledger', 'organization', vb.
    entity_id UUID,                          -- Etkilenen kaydin ID'si (varsa)

    -- Change tracking (JSON format)
    old_value JSONB,                         -- Degisiklik oncesi deger
    new_value JSONB,                         -- Degisiklik sonrasi deger

    -- Request context
    ip_address INET,                         -- Istek yapan IP adresi
    user_agent TEXT,                         -- Tarayici/client bilgisi

    -- Immutable timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT audit_logs_entity_type_not_empty CHECK (char_length(entity_type) >= 1),
    CONSTRAINT audit_logs_entity_type_format CHECK (entity_type ~ '^[a-z_]+$')
);

-- Indexes for audit_logs
CREATE INDEX idx_audit_logs_organization_id ON audit_logs (organization_id)
    WHERE organization_id IS NOT NULL;
CREATE INDEX idx_audit_logs_user_id ON audit_logs (user_id)
    WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_action ON audit_logs (action);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs (entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs (entity_id)
    WHERE entity_id IS NOT NULL;
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);

-- Composite indexes for common query patterns
CREATE INDEX idx_audit_logs_org_action_time ON audit_logs (organization_id, action, created_at DESC)
    WHERE organization_id IS NOT NULL;
CREATE INDEX idx_audit_logs_user_action_time ON audit_logs (user_id, action, created_at DESC)
    WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_entity_time ON audit_logs (entity_type, entity_id, created_at DESC)
    WHERE entity_id IS NOT NULL;

-- Comments for audit_logs
COMMENT ON TABLE audit_logs IS 'Tum sistem eylemlerinin degistirilemez kaydi. Guvenlik denetimi, yasal uyumluluk ve hata ayiklama icin kullanilir.';
COMMENT ON COLUMN audit_logs.id IS 'Benzersiz audit log ID''si.';
COMMENT ON COLUMN audit_logs.organization_id IS 'Eylemin yapildigi isletme. Sistem islemleri icin NULL olabilir.';
COMMENT ON COLUMN audit_logs.user_id IS 'Eylemi yapan kullanici. Sistem islemleri icin NULL olabilir.';
COMMENT ON COLUMN audit_logs.action IS 'Eylem tipi: create, update, delete, login, logout, price_change, activation, suspension';
COMMENT ON COLUMN audit_logs.entity_type IS 'Etkilenen varlik tipi. Ornegin: product, price_ledger, organization, user, subscription';
COMMENT ON COLUMN audit_logs.entity_id IS 'Etkilenen kaydin UUID''si. Genel islemler icin NULL olabilir.';
COMMENT ON COLUMN audit_logs.old_value IS 'Degisiklik oncesi deger (JSON). create islemleri icin NULL.';
COMMENT ON COLUMN audit_logs.new_value IS 'Degisiklik sonrasi deger (JSON). delete islemleri icin NULL.';
COMMENT ON COLUMN audit_logs.ip_address IS 'Istegi yapan IP adresi. GDPR uyumlulugu icin maskelenebilir.';
COMMENT ON COLUMN audit_logs.user_agent IS 'Tarayici/client bilgisi. Guvenlik analizi icin kullanilir.';
COMMENT ON COLUMN audit_logs.created_at IS 'Log olusturma zamani. Asla degistirilemez.';

-- ============================================================================
-- IMMUTABILITY TRIGGERS
-- Bu tablolara UPDATE ve DELETE yapmak yasal uyumlulugu bozar!
-- Service Role Key kullansa bile engellenmelidir.
-- ============================================================================

-- Menu snapshots immutability trigger
CREATE OR REPLACE FUNCTION prevent_menu_snapshots_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'UPDATE operations are not allowed on menu_snapshots table. Menu snapshots are immutable for legal compliance.'
            USING HINT = 'Menu snapshot''lari yasal uyumluluk icin degistirilemez. Yeni bir snapshot olusturun.';
    ELSIF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'DELETE operations are not allowed on menu_snapshots table. Menu snapshots are immutable for legal compliance.'
            USING HINT = 'Menu snapshot''lari yasal uyumluluk icin silinemez.';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_menu_snapshots_immutability
    BEFORE UPDATE OR DELETE ON menu_snapshots
    FOR EACH ROW
    EXECUTE FUNCTION prevent_menu_snapshots_modification();

COMMENT ON FUNCTION prevent_menu_snapshots_modification IS 'Menu snapshot''larinin degistirilmesini veya silinmesini engeller. Yasal uyumluluk icin kritik.';

-- Audit logs immutability trigger
CREATE OR REPLACE FUNCTION prevent_audit_logs_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'UPDATE operations are not allowed on audit_logs table. Audit logs are immutable for security compliance.'
            USING HINT = 'Audit log''lari guvenlik uyumlulugu icin degistirilemez.';
    ELSIF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'DELETE operations are not allowed on audit_logs table. Audit logs are immutable for security compliance.'
            USING HINT = 'Audit log''lari guvenlik uyumlulugu icin silinemez.';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_audit_logs_immutability
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_logs_modification();

COMMENT ON FUNCTION prevent_audit_logs_modification IS 'Audit log''larinin degistirilmesini veya silinmesini engeller. Guvenlik uyumlulugu icin kritik.';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Insert audit log entry
-- Kullanim kolayligi icin wrapper fonksiyon
CREATE OR REPLACE FUNCTION insert_audit_log(
    p_organization_id UUID,
    p_user_id UUID,
    p_action audit_action,
    p_entity_type VARCHAR(100),
    p_entity_id UUID DEFAULT NULL,
    p_old_value JSONB DEFAULT NULL,
    p_new_value JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO audit_logs (
        organization_id,
        user_id,
        action,
        entity_type,
        entity_id,
        old_value,
        new_value,
        ip_address,
        user_agent
    ) VALUES (
        p_organization_id,
        p_user_id,
        p_action,
        p_entity_type,
        p_entity_id,
        p_old_value,
        p_new_value,
        p_ip_address,
        p_user_agent
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION insert_audit_log IS 'Audit log kaydı olusturur. Wrapper fonksiyon olarak parametre sadelestirilmesi saglar.';

-- Function: Get latest menu snapshot for organization
CREATE OR REPLACE FUNCTION get_latest_menu_snapshot(p_organization_id UUID)
RETURNS TABLE (
    snapshot_id UUID,
    snapshot_json JSONB,
    sha256_hash VARCHAR(64),
    created_at TIMESTAMPTZ
) AS $$
    SELECT
        id,
        snapshot_json,
        sha256_hash,
        created_at
    FROM menu_snapshots
    WHERE organization_id = p_organization_id
    ORDER BY created_at DESC
    LIMIT 1;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_latest_menu_snapshot IS 'Organizasyonun en son menu snapshot''ini dondurur.';

-- Function: Verify menu snapshot hash
-- Snapshot'in degistirilip degistirilmedigini dogrular
-- NOT: Gercek SHA-256 hesaplama uygulama katmaninda yapilir
-- Bu fonksiyon sadece hash formatini dogrular
CREATE OR REPLACE FUNCTION verify_snapshot_hash_format(p_hash VARCHAR(64))
RETURNS BOOLEAN AS $$
BEGIN
    -- SHA-256 hash 64 karakter hex olmali
    RETURN p_hash ~ '^[a-f0-9]{64}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION verify_snapshot_hash_format IS 'SHA-256 hash formatinin gecerli olup olmadigini kontrol eder. Gercek hash dogrulamasi uygulama katmaninda yapilmalidir.';

-- Function: Get audit logs for entity
CREATE OR REPLACE FUNCTION get_entity_audit_logs(
    p_entity_type VARCHAR(100),
    p_entity_id UUID,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    log_id UUID,
    organization_id UUID,
    user_id UUID,
    action audit_action,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ
) AS $$
    SELECT
        id,
        organization_id,
        user_id,
        action,
        old_value,
        new_value,
        ip_address,
        created_at
    FROM audit_logs
    WHERE entity_type = p_entity_type
      AND entity_id = p_entity_id
    ORDER BY created_at DESC
    LIMIT p_limit;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_entity_audit_logs IS 'Belirli bir varligin tum audit log''larini dondurur.';

-- Function: Get organization audit summary
-- Dashboard icin ozet bilgi
CREATE OR REPLACE FUNCTION get_organization_audit_summary(
    p_organization_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    action audit_action,
    count BIGINT,
    last_occurrence TIMESTAMPTZ
) AS $$
    SELECT
        action,
        COUNT(*) as count,
        MAX(created_at) as last_occurrence
    FROM audit_logs
    WHERE organization_id = p_organization_id
      AND created_at > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY action
    ORDER BY count DESC;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_organization_audit_summary IS 'Organizasyonun audit log ozetini dondurur. Dashboard ve raporlama icin kullanilir.';

-- ============================================================================
-- AUTOMATIC AUDIT LOGGING TRIGGER FOR PRICE LEDGER
-- Fiyat degisikliklerini otomatik olarak audit_logs'a kaydeder
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_audit_price_change()
RETURNS TRIGGER AS $$
DECLARE
    v_product RECORD;
    v_org_id UUID;
BEGIN
    -- Urunun organization_id'sini al
    SELECT p.organization_id, p.name
    INTO v_product
    FROM products p
    WHERE p.id = NEW.product_id;

    IF FOUND THEN
        v_org_id := v_product.organization_id;

        -- Audit log olustur
        INSERT INTO audit_logs (
            organization_id,
            user_id,
            action,
            entity_type,
            entity_id,
            new_value
        ) VALUES (
            v_org_id,
            NEW.created_by,
            'price_change',
            'price_ledger',
            NEW.id,
            jsonb_build_object(
                'product_id', NEW.product_id,
                'product_name', v_product.name,
                'price', NEW.price,
                'currency', NEW.currency,
                'valid_from', NEW.valid_from,
                'valid_until', NEW.valid_until,
                'change_reason', NEW.change_reason
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_auto_audit_price_change
    AFTER INSERT ON price_ledger
    FOR EACH ROW
    EXECUTE FUNCTION auto_audit_price_change();

COMMENT ON FUNCTION auto_audit_price_change IS 'Fiyat degisikliklerini otomatik olarak audit_logs tablosuna kaydeder.';

-- ============================================================================
-- SNAPSHOT COUNT HELPER
-- Organizasyonun snapshot sayisini hizli sorgulama
-- ============================================================================

CREATE OR REPLACE FUNCTION get_snapshot_count(p_organization_id UUID)
RETURNS BIGINT AS $$
    SELECT COUNT(*)
    FROM menu_snapshots
    WHERE organization_id = p_organization_id;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_snapshot_count IS 'Organizasyonun toplam menu snapshot sayisini dondurur.';
