-- ============================================================================
-- 009_add_location_to_products.sql
-- Add location_id foreign key to products table for location-scoped menu items
-- Enables multi-location menu management
-- ============================================================================

-- ============================================================================
-- ADD LOCATION_ID COLUMN TO PRODUCTS
-- Her ürün artık bir lokasyona ait olabilir
-- NULL = organization-level ürün (tüm lokasyonlarda geçerli)
-- NOT NULL = belirli bir lokasyona özel ürün
-- ============================================================================

-- Add the location_id column (nullable to support org-level products and migration)
ALTER TABLE products
ADD COLUMN location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

-- Comments
COMMENT ON COLUMN products.location_id IS 'Ürünün ait olduğu lokasyon. NULL = tüm lokasyonlarda geçerli (org-level ürün). Çoklu lokasyon menü yönetimi için kullanılır.';

-- ============================================================================
-- INDEXES
-- Lokasyon bazlı sorguları optimize etmek için
-- ============================================================================

-- Index for location-based product queries
CREATE INDEX idx_products_location_id ON products (location_id);

-- Composite index for location-scoped active products
CREATE INDEX idx_products_location_active ON products (location_id, is_active) WHERE is_active = true;

-- Composite index for organization + location queries
CREATE INDEX idx_products_org_location ON products (organization_id, location_id);

-- ============================================================================
-- HELPER FUNCTION: Get products for a specific location
-- Lokasyona özel ve organization-level ürünleri birlikte döndürür
-- ============================================================================

CREATE OR REPLACE FUNCTION get_products_for_location(p_location_id UUID)
RETURNS SETOF products AS $$
DECLARE
    v_org_id UUID;
BEGIN
    -- Lokasyonun organization_id'sini al
    SELECT organization_id INTO v_org_id
    FROM locations
    WHERE id = p_location_id;

    IF v_org_id IS NULL THEN
        RETURN;
    END IF;

    -- Lokasyona özel ve org-level ürünleri döndür
    RETURN QUERY
    SELECT *
    FROM products
    WHERE organization_id = v_org_id
      AND is_active = true
      AND (
          location_id = p_location_id  -- Lokasyona özel ürünler
          OR location_id IS NULL        -- Org-level ürünler (tüm lokasyonlarda geçerli)
      )
    ORDER BY sort_order, name;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_products_for_location IS 'Belirli bir lokasyon için tüm geçerli ürünleri döndürür. Lokasyona özel ürünler ve organization-level ürünler (location_id IS NULL) birlikte döner.';

-- ============================================================================
-- HELPER FUNCTION: Get products exclusively for a location (no org-level)
-- Sadece lokasyona özel ürünleri döndürür
-- ============================================================================

CREATE OR REPLACE FUNCTION get_location_specific_products(p_location_id UUID)
RETURNS SETOF products AS $$
    SELECT *
    FROM products
    WHERE location_id = p_location_id
      AND is_active = true
    ORDER BY sort_order, name;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_location_specific_products IS 'Sadece belirli bir lokasyona özel ürünleri döndürür. Org-level ürünler dahil değil.';

-- ============================================================================
-- HELPER FUNCTION: Get organization-level products (available at all locations)
-- Tüm lokasyonlarda geçerli olan ürünleri döndürür
-- ============================================================================

CREATE OR REPLACE FUNCTION get_org_level_products(p_organization_id UUID)
RETURNS SETOF products AS $$
    SELECT *
    FROM products
    WHERE organization_id = p_organization_id
      AND location_id IS NULL
      AND is_active = true
    ORDER BY sort_order, name;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_org_level_products IS 'Organization-level ürünleri döndürür. Bu ürünler tüm lokasyonlarda menüde görünür.';

-- ============================================================================
-- CONSTRAINT: Ensure location belongs to same organization as product
-- Ürün ve lokasyonun aynı organizasyona ait olduğunu garanti eder
-- ============================================================================

CREATE OR REPLACE FUNCTION check_product_location_org_match()
RETURNS TRIGGER AS $$
DECLARE
    v_location_org_id UUID;
BEGIN
    -- location_id NULL ise kontrol gerekmez
    IF NEW.location_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Lokasyonun organization_id'sini al
    SELECT organization_id INTO v_location_org_id
    FROM locations
    WHERE id = NEW.location_id;

    -- Lokasyon bulunamazsa hata
    IF v_location_org_id IS NULL THEN
        RAISE EXCEPTION 'Location with id % not found', NEW.location_id
            USING HINT = 'Ensure the location exists before assigning a product to it';
    END IF;

    -- Organization mismatch kontrolü
    IF v_location_org_id != NEW.organization_id THEN
        RAISE EXCEPTION 'Product organization_id (%) does not match location organization_id (%)',
            NEW.organization_id, v_location_org_id
            USING HINT = 'Product and location must belong to the same organization';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı products tablosuna bağla
CREATE TRIGGER trigger_check_product_location_org_match
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW
    WHEN (NEW.location_id IS NOT NULL)
    EXECUTE FUNCTION check_product_location_org_match();

COMMENT ON FUNCTION check_product_location_org_match IS 'Ürün ve lokasyonun aynı organizasyona ait olduğunu doğrular. Veri bütünlüğü için kritik.';
COMMENT ON TRIGGER trigger_check_product_location_org_match ON products IS 'Ürüne atanan lokasyonun aynı organizasyona ait olduğunu kontrol eder.';
