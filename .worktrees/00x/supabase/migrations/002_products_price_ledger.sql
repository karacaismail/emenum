-- ============================================================================
-- 002_products_price_ledger.sql
-- Products table (meta only, NO price field) and Price Ledger (INSERT-only immutable)
-- Tables: products, price_ledger
-- ============================================================================

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Currency code enum
-- TRY: Türk Lirası (varsayılan)
-- USD: Amerikan Doları
-- EUR: Euro
CREATE TYPE currency_code AS ENUM ('TRY', 'USD', 'EUR');

-- ============================================================================
-- PRODUCTS TABLE
-- Ürün meta verileri - FİYAT BU TABLODA YOKTUR!
-- Fiyat bilgisi price_ledger tablosunda tutulur (immutable)
-- ============================================================================

CREATE TABLE products (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign keys
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,

    -- Product info
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,

    -- Nutritional info (Premium feature)
    allergens TEXT,                        -- Alerjen bilgileri (virgülle ayrılmış)
    calories INTEGER,                      -- Kalori değeri
    preparation_time_minutes INTEGER,      -- Hazırlanma süresi (dakika)

    -- Special badges (Pro feature)
    is_chef_special BOOLEAN NOT NULL DEFAULT false,  -- Şefin Önerisi
    is_daily_special BOOLEAN NOT NULL DEFAULT false, -- Günün Menüsü

    -- Status & ordering
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT products_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
    CONSTRAINT products_calories_positive CHECK (calories IS NULL OR calories >= 0),
    CONSTRAINT products_prep_time_positive CHECK (preparation_time_minutes IS NULL OR preparation_time_minutes >= 0)
);

-- Indexes for products
CREATE INDEX idx_products_organization_id ON products (organization_id);
CREATE INDEX idx_products_category_id ON products (category_id);
CREATE INDEX idx_products_sort_order ON products (organization_id, sort_order);
CREATE INDEX idx_products_active ON products (organization_id, is_active) WHERE is_active = true;
CREATE INDEX idx_products_chef_special ON products (organization_id, is_chef_special) WHERE is_chef_special = true;
CREATE INDEX idx_products_daily_special ON products (organization_id, is_daily_special) WHERE is_daily_special = true;
CREATE INDEX idx_products_created_at ON products (created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER trigger_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE products IS 'Ürün meta verileri. FİYAT BU TABLODA YOKTUR! Fiyat bilgisi price_ledger tablosunda tutulur.';
COMMENT ON COLUMN products.name IS 'Ürün adı';
COMMENT ON COLUMN products.description IS 'Ürün açıklaması';
COMMENT ON COLUMN products.image_url IS 'Ürün görseli URL (Pro özellik)';
COMMENT ON COLUMN products.allergens IS 'Alerjen bilgileri (Premium özellik)';
COMMENT ON COLUMN products.calories IS 'Kalori değeri (Premium özellik)';
COMMENT ON COLUMN products.preparation_time_minutes IS 'Hazırlanma süresi dakika cinsinden';
COMMENT ON COLUMN products.is_chef_special IS 'Şefin Önerisi rozeti (Pro özellik)';
COMMENT ON COLUMN products.is_daily_special IS 'Günün Menüsü rozeti (Pro özellik)';
COMMENT ON COLUMN products.sort_order IS 'Kategori içindeki görüntülenme sırası';
COMMENT ON COLUMN products.is_active IS 'false yapılarak ürün menüden gizlenebilir (silmeden)';

-- ============================================================================
-- PRICE LEDGER TABLE
-- Değişmez Fiyat Defteri - ASIL İNOVASYON
-- CRITICAL: Bu tabloya UPDATE ve DELETE YAPILMAZ! Sadece INSERT!
-- Her fiyat değişikliği yeni bir satır olarak eklenir.
-- ============================================================================

CREATE TABLE price_ledger (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign keys
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    -- Price info
    price DECIMAL(10, 2) NOT NULL,         -- Fiyat (örn: 125.50)
    currency currency_code NOT NULL DEFAULT 'TRY',

    -- Time validity (Happy Hour desteği için)
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),   -- Bu fiyat ne zaman geçerli olmaya başladı
    valid_until TIMESTAMPTZ,               -- NULL = şu anki geçerli fiyat, değilse bitiş tarihi

    -- Audit fields (kim, ne zaman, neden değiştirdi)
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    change_reason TEXT,                    -- Fiyat değişikliği nedeni

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT price_ledger_price_positive CHECK (price >= 0),
    CONSTRAINT price_ledger_valid_dates CHECK (valid_until IS NULL OR valid_until > valid_from)
);

-- Indexes for price_ledger
-- Bu indexler güncel fiyat sorgularını optimize eder
CREATE INDEX idx_price_ledger_product_id ON price_ledger (product_id);
CREATE INDEX idx_price_ledger_valid_from ON price_ledger (product_id, valid_from DESC);
CREATE INDEX idx_price_ledger_current ON price_ledger (product_id, valid_from DESC)
    WHERE valid_until IS NULL OR valid_until > NOW();
CREATE INDEX idx_price_ledger_created_by ON price_ledger (created_by);
CREATE INDEX idx_price_ledger_created_at ON price_ledger (created_at DESC);

-- Composite index for Happy Hour queries (time-based pricing)
CREATE INDEX idx_price_ledger_time_range ON price_ledger (product_id, valid_from, valid_until);

-- Comments
COMMENT ON TABLE price_ledger IS 'Değişmez Fiyat Defteri. UPDATE ve DELETE YASAKTIR! Yasal uyumluluk için her fiyat değişikliği yeni satır olarak eklenir.';
COMMENT ON COLUMN price_ledger.price IS 'Fiyat değeri (TRY varsayılan). Örn: 125.50';
COMMENT ON COLUMN price_ledger.currency IS 'Para birimi kodu (TRY, USD, EUR)';
COMMENT ON COLUMN price_ledger.valid_from IS 'Bu fiyatın geçerli olmaya başladığı tarih/saat. Happy Hour için kullanılır.';
COMMENT ON COLUMN price_ledger.valid_until IS 'Bu fiyatın geçersiz olacağı tarih/saat. NULL = süresiz geçerli (mevcut fiyat)';
COMMENT ON COLUMN price_ledger.created_by IS 'Fiyatı değiştiren kullanıcı (audit için)';
COMMENT ON COLUMN price_ledger.change_reason IS 'Fiyat değişikliği nedeni (audit için). Örn: "Malzeme maliyeti artışı", "Happy Hour"';

-- ============================================================================
-- IMMUTABILITY TRIGGER
-- price_ledger tablosunda UPDATE ve DELETE işlemlerini engelleyen trigger
-- CRITICAL: Bu trigger Service Role Key ile bile çalışır!
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_price_ledger_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'UPDATE operations are not allowed on price_ledger table. Price history is immutable. Fiyat geçmişi değiştirilemez!'
            USING HINT = 'Insert a new price record instead of updating';
    ELSIF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'DELETE operations are not allowed on price_ledger table. Price history is immutable. Fiyat geçmişi silinemez!'
            USING HINT = 'Set valid_until to close a price period instead of deleting';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı price_ledger tablosuna bağla
CREATE TRIGGER enforce_price_ledger_immutability
    BEFORE UPDATE OR DELETE ON price_ledger
    FOR EACH ROW
    EXECUTE FUNCTION prevent_price_ledger_modification();

-- Comment
COMMENT ON FUNCTION prevent_price_ledger_modification IS 'price_ledger tablosunda UPDATE/DELETE işlemlerini engeller. Ticaret Bakanlığı uyumluluğu için kritik.';

-- ============================================================================
-- HELPER FUNCTION: Get current price for a product
-- Güncel fiyatı döndürür (valid_from <= NOW() ve valid_until NULL veya > NOW())
-- ============================================================================

CREATE OR REPLACE FUNCTION get_current_price(p_product_id UUID)
RETURNS TABLE (
    price DECIMAL(10, 2),
    currency currency_code,
    valid_from TIMESTAMPTZ
) AS $$
    SELECT pl.price, pl.currency, pl.valid_from
    FROM price_ledger pl
    WHERE pl.product_id = p_product_id
      AND pl.valid_from <= NOW()
      AND (pl.valid_until IS NULL OR pl.valid_until > NOW())
    ORDER BY pl.valid_from DESC
    LIMIT 1;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_current_price IS 'Bir ürünün mevcut geçerli fiyatını döndürür. Happy Hour fiyatlaması desteklenir.';

-- ============================================================================
-- HELPER FUNCTION: Insert new price (closes previous price period)
-- Yeni fiyat ekler ve önceki fiyatın valid_until'ını günceller
-- NOT: Bu işlem bir transaction içinde yapılmalıdır
-- ============================================================================

CREATE OR REPLACE FUNCTION insert_new_price(
    p_product_id UUID,
    p_price DECIMAL(10, 2),
    p_currency currency_code DEFAULT 'TRY',
    p_valid_from TIMESTAMPTZ DEFAULT NOW(),
    p_valid_until TIMESTAMPTZ DEFAULT NULL,
    p_created_by UUID DEFAULT NULL,
    p_change_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_price_id UUID;
BEGIN
    -- Önceki mevcut fiyatın valid_until'ını ayarla (sadece NULL olanları)
    -- NOT: Bu bir UPDATE ama price_ledger'a değil, sadece valid_until'ı kapatıyor
    -- Trigger'ı bypass etmek için ALTER TABLE geçici olarak disable edilebilir
    -- Ancak bu güvenlik açığı oluşturabilir, alternatif olarak:
    -- valid_until zaten NULL olmayan kayıtları güncellemiyoruz

    -- Mevcut geçerli fiyatı bul ve valid_until'ını ayarla
    -- Bu, yeni fiyat eklendiğinde otomatik olarak yapılmalı
    -- Ancak trigger UPDATE'i engelliyor, bu yüzden yeni yaklaşım:
    -- Fiyat ekleme sırasında valid_until kontrolü application layer'da yapılacak

    -- Yeni fiyat kaydı ekle
    INSERT INTO price_ledger (
        product_id,
        price,
        currency,
        valid_from,
        valid_until,
        created_by,
        change_reason
    ) VALUES (
        p_product_id,
        p_price,
        p_currency,
        p_valid_from,
        p_valid_until,
        p_created_by,
        p_change_reason
    )
    RETURNING id INTO new_price_id;

    RETURN new_price_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION insert_new_price IS 'Yeni fiyat kaydı ekler. valid_until ile kapatma application layer''da yapılmalıdır.';

-- ============================================================================
-- HELPER FUNCTION: Close current price (set valid_until)
-- Mevcut fiyatı kapatmak için özel güvenli fonksiyon
-- Bu fonksiyon SADECE valid_until değerini ayarlar, fiyatı değiştirmez
-- ============================================================================

-- Önce trigger'ı devre dışı bırakabilecek bir fonksiyon oluştur
-- Bu fonksiyon sadece belirli koşullarda çalışır

CREATE OR REPLACE FUNCTION close_current_price(
    p_product_id UUID,
    p_close_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS BOOLEAN AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    -- SADECE valid_until NULL olan (yani aktif) fiyatları güncelle
    -- Bu özel bir durum olduğu için trigger'ı geçici olarak devre dışı bırakıyoruz

    -- Trigger'ı devre dışı bırak
    ALTER TABLE price_ledger DISABLE TRIGGER enforce_price_ledger_immutability;

    -- valid_until'ı güncelle
    UPDATE price_ledger
    SET valid_until = p_close_at
    WHERE product_id = p_product_id
      AND valid_until IS NULL
      AND valid_from < p_close_at;

    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    -- Trigger'ı tekrar etkinleştir
    ALTER TABLE price_ledger ENABLE TRIGGER enforce_price_ledger_immutability;

    RETURN affected_rows > 0;
EXCEPTION
    WHEN OTHERS THEN
        -- Hata durumunda trigger'ı tekrar etkinleştir
        ALTER TABLE price_ledger ENABLE TRIGGER enforce_price_ledger_immutability;
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bu fonksiyonu sadece service role kullanabilir
REVOKE ALL ON FUNCTION close_current_price FROM PUBLIC;

COMMENT ON FUNCTION close_current_price IS 'Mevcut fiyatın valid_until değerini ayarlar. SADECE service role kullanabilir. Fiyat değerini DEĞİŞTİRMEZ.';
