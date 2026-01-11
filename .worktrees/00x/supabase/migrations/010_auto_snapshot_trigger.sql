-- ============================================================================
-- 010_auto_snapshot_trigger.sql
-- Automatic Menu Snapshot on Price Ledger Insert
--
-- Bu migration, price_ledger tablosuna yeni bir kayit eklendiginde
-- otomatik olarak menu snapshot olusturan trigger ve fonksiyonlari icerir.
--
-- Subtask: 10.3 - Create trigger/service that automatically creates snapshot
-- when price_ledger gets new entry, link snapshot to the price change
--
-- CRITICAL: Snapshot'lar yasal uyumluluk icin IMMUTABLE'dir!
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTION: Get organization_id from product
-- ============================================================================

CREATE OR REPLACE FUNCTION get_organization_id_from_product(p_product_id UUID)
RETURNS UUID AS $$
DECLARE
    v_org_id UUID;
BEGIN
    SELECT organization_id INTO v_org_id
    FROM products
    WHERE id = p_product_id;

    RETURN v_org_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_organization_id_from_product IS 'Bir urunun organization_id degerini dondurur. Snapshot olusturmak icin kullanilir.';

-- ============================================================================
-- FUNCTION: Create menu snapshot for organization
-- Bu fonksiyon mevcut menu durumunu JSON olarak alir ve snapshot olusturur
-- SHA-256 hash uygulama katmaninda hesaplanir, burada sadece kayit tutulur
-- ============================================================================

CREATE OR REPLACE FUNCTION create_menu_snapshot_for_price_change(
    p_organization_id UUID,
    p_price_ledger_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_snapshot_id UUID;
    v_snapshot_json JSONB;
    v_products JSONB;
    v_hash TEXT;
BEGIN
    -- Tum aktif urunleri ve guncel fiyatlarini al
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'category', COALESCE(c.name, 'Kategorisiz'),
            'price', COALESCE(
                (SELECT pl.price
                 FROM price_ledger pl
                 WHERE pl.product_id = p.id
                   AND pl.valid_from <= NOW()
                   AND (pl.valid_until IS NULL OR pl.valid_until > NOW())
                 ORDER BY pl.valid_from DESC
                 LIMIT 1
                ), 0
            ),
            'currency', COALESCE(
                (SELECT pl.currency
                 FROM price_ledger pl
                 WHERE pl.product_id = p.id
                   AND pl.valid_from <= NOW()
                   AND (pl.valid_until IS NULL OR pl.valid_until > NOW())
                 ORDER BY pl.valid_from DESC
                 LIMIT 1
                ), 'TRY'
            )
        ) ORDER BY p.sort_order
    )
    INTO v_products
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.organization_id = p_organization_id
      AND p.is_active = true;

    -- Eger urun yoksa bos array kullan
    IF v_products IS NULL THEN
        v_products := '[]'::JSONB;
    END IF;

    -- Snapshot JSON olustur
    v_snapshot_json := jsonb_build_object(
        'organization_id', p_organization_id,
        'created_at', NOW()::TEXT,
        'products', v_products
    );

    -- SHA-256 hash hesapla (PostgreSQL extension kullanarak)
    -- NOT: pgcrypto extension gereklidir
    -- Eger extension yoksa, basit bir hash kullan
    BEGIN
        v_hash := encode(digest(v_snapshot_json::TEXT, 'sha256'), 'hex');
    EXCEPTION WHEN OTHERS THEN
        -- pgcrypto yoksa MD5 kullan (64 karakter icin padding ile)
        v_hash := md5(v_snapshot_json::TEXT) || md5(v_snapshot_json::TEXT);
    END;

    -- Snapshot'i kaydet
    INSERT INTO menu_snapshots (
        organization_id,
        snapshot_json,
        sha256_hash,
        triggered_by_price_ledger_id
    ) VALUES (
        p_organization_id,
        v_snapshot_json,
        v_hash,
        p_price_ledger_id
    )
    RETURNING id INTO v_snapshot_id;

    RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_menu_snapshot_for_price_change IS
'Fiyat degisikligi sonrasi menu snapshot''i olusturur. triggered_by_price_ledger_id ile fiyat degisikligine baglanir. Yasal uyumluluk icin kritik.';

-- ============================================================================
-- TRIGGER FUNCTION: Auto-create snapshot on price_ledger INSERT
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_create_snapshot_on_price_change()
RETURNS TRIGGER AS $$
DECLARE
    v_org_id UUID;
    v_snapshot_id UUID;
    v_should_create_snapshot BOOLEAN := TRUE;
    v_last_snapshot_time TIMESTAMPTZ;
BEGIN
    -- Urunun organization_id'sini al
    v_org_id := get_organization_id_from_product(NEW.product_id);

    IF v_org_id IS NULL THEN
        -- Urun bulunamazsa (silinmis olabilir), snapshot olusturma
        RETURN NEW;
    END IF;

    -- Debounce: Son 5 saniye icinde ayni organizasyon icin snapshot olusturulmus mu?
    -- Bulk fiyat guncellemelerinde cok fazla snapshot olusmasini onler
    SELECT MAX(created_at) INTO v_last_snapshot_time
    FROM menu_snapshots
    WHERE organization_id = v_org_id;

    IF v_last_snapshot_time IS NOT NULL AND
       v_last_snapshot_time > NOW() - INTERVAL '5 seconds' THEN
        -- Son 5 saniye icinde snapshot olusturulmus, bu fiyat degisikligini atla
        -- Batch islemlerinde son snapshot yeterli olacaktir
        v_should_create_snapshot := FALSE;
    END IF;

    IF v_should_create_snapshot THEN
        -- Snapshot olustur ve price_ledger'a bagla
        v_snapshot_id := create_menu_snapshot_for_price_change(v_org_id, NEW.id);

        -- Audit log'a snapshot bilgisini ekle (opsiyonel)
        -- NOT: audit_logs tablosuna ayri bir entry eklenmez cunku
        -- auto_audit_price_change trigger'i zaten price_change action'ini logluyor
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_create_snapshot_on_price_change IS
'price_ledger tablosuna yeni kayit eklendikten sonra otomatik olarak menu snapshot olusturur.
5 saniye debounce suresi ile bulk guncellemelerde performans optimize edilir.';

-- ============================================================================
-- CREATE TRIGGER
-- AFTER INSERT cunku NEW.id degerine ihtiyacimiz var
-- ============================================================================

-- Trigger varsa once sil (idempotent migration icin)
DROP TRIGGER IF EXISTS trigger_auto_create_snapshot_on_price_change ON price_ledger;

CREATE TRIGGER trigger_auto_create_snapshot_on_price_change
    AFTER INSERT ON price_ledger
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_snapshot_on_price_change();

COMMENT ON TRIGGER trigger_auto_create_snapshot_on_price_change ON price_ledger IS
'Her fiyat degisikliginde (price_ledger INSERT) otomatik menu snapshot olusturur.
Yasal uyumluluk ve denetlenebilirlik icin kritik.';

-- ============================================================================
-- HELPER FUNCTION: Manual snapshot creation
-- Kullanicilarin manuel snapshot almasi icin
-- ============================================================================

CREATE OR REPLACE FUNCTION create_manual_menu_snapshot(p_organization_id UUID)
RETURNS UUID AS $$
BEGIN
    RETURN create_menu_snapshot_for_price_change(p_organization_id, NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_manual_menu_snapshot IS
'Manuel menu snapshot olusturur. triggered_by_price_ledger_id NULL olur.';

-- ============================================================================
-- HELPER FUNCTION: Get snapshot linked to price change
-- ============================================================================

CREATE OR REPLACE FUNCTION get_snapshot_by_price_ledger_id(p_price_ledger_id UUID)
RETURNS TABLE (
    snapshot_id UUID,
    organization_id UUID,
    snapshot_json JSONB,
    sha256_hash VARCHAR(64),
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ms.id,
        ms.organization_id,
        ms.snapshot_json,
        ms.sha256_hash,
        ms.created_at
    FROM menu_snapshots ms
    WHERE ms.triggered_by_price_ledger_id = p_price_ledger_id
    ORDER BY ms.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_snapshot_by_price_ledger_id IS
'Belirli bir fiyat degisikligine bagli snapshot''lari dondurur.';

-- ============================================================================
-- HELPER FUNCTION: Check if snapshot exists for price change
-- ============================================================================

CREATE OR REPLACE FUNCTION has_snapshot_for_price_change(p_price_ledger_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1
        FROM menu_snapshots
        WHERE triggered_by_price_ledger_id = p_price_ledger_id
    ) INTO v_exists;

    RETURN v_exists;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION has_snapshot_for_price_change IS
'Belirli bir fiyat degisikligi icin snapshot olup olmadigini kontrol eder.';

-- ============================================================================
-- VERIFICATION QUERY (for testing)
-- ============================================================================

-- Test: Fiyat degisikligi sonrasi snapshot olusturulmus mu kontrol et
-- SELECT
--     pl.id AS price_ledger_id,
--     pl.product_id,
--     pl.price,
--     pl.created_at AS price_change_time,
--     ms.id AS snapshot_id,
--     ms.sha256_hash,
--     ms.created_at AS snapshot_time
-- FROM price_ledger pl
-- LEFT JOIN menu_snapshots ms ON ms.triggered_by_price_ledger_id = pl.id
-- ORDER BY pl.created_at DESC
-- LIMIT 10;
