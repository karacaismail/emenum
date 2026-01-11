-- ============================================================================
-- 003_package_management.sql
-- Dynamic Package Management System
-- Tables: features, plans, plan_features, subscriptions, organization_feature_overrides
-- ============================================================================

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Feature type enum
-- boolean: Özellik açık/kapalı (örn: has_images, module_waiter_call)
-- limit: Sayısal limit (örn: limit_menu_items = 20, limit_categories = 3)
CREATE TYPE feature_type AS ENUM ('boolean', 'limit');

-- Subscription status enum
-- pending: Ödeme bekleniyor
-- active: Aktif abonelik
-- past_due: Ödeme gecikmiş ama hâlâ aktif
-- cancelled: Kullanıcı tarafından iptal edilmiş
-- expired: Süre dolmuş
CREATE TYPE subscription_status AS ENUM ('pending', 'active', 'past_due', 'cancelled', 'expired');

-- ============================================================================
-- FEATURES TABLE
-- Özellik kataloğu - Tüm mevcut özellikler burada tanımlanır
-- ============================================================================

CREATE TABLE features (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Feature identifier (unique key)
    key TEXT NOT NULL,

    -- Display info
    name TEXT NOT NULL,
    description TEXT,

    -- Feature type determines how value is interpreted
    feature_type feature_type NOT NULL DEFAULT 'boolean',

    -- Grouping (for admin UI organization)
    category TEXT,                          -- Kategori (modules, limits, ui_features vb.)

    -- Status & ordering
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT features_key_unique UNIQUE (key),
    CONSTRAINT features_key_format CHECK (key ~ '^[a-z][a-z0-9_]*$'),
    CONSTRAINT features_key_length CHECK (char_length(key) >= 2 AND char_length(key) <= 50),
    CONSTRAINT features_name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 100)
);

-- Indexes for features
CREATE INDEX idx_features_key ON features (key);
CREATE INDEX idx_features_type ON features (feature_type);
CREATE INDEX idx_features_category ON features (category);
CREATE INDEX idx_features_active ON features (is_active) WHERE is_active = true;
CREATE INDEX idx_features_sort_order ON features (sort_order);

-- Comments
COMMENT ON TABLE features IS 'Özellik kataloğu. Tüm platform özellikleri burada tanımlanır. Paket kontrolleri dinamik olarak bu tablodan yapılır.';
COMMENT ON COLUMN features.key IS 'Benzersiz özellik anahtarı. Kod içinde bu değer kullanılır. Örn: module_waiter_call, limit_menu_items';
COMMENT ON COLUMN features.name IS 'Kullanıcı arayüzünde gösterilecek özellik adı. Örn: "Garson Çağırma", "Menü Öğesi Limiti"';
COMMENT ON COLUMN features.description IS 'Özelliğin açıklaması. Upsell modal''larda gösterilir.';
COMMENT ON COLUMN features.feature_type IS 'boolean: Açık/kapalı, limit: Sayısal değer';
COMMENT ON COLUMN features.category IS 'Admin panelde gruplama için. Örn: modules, limits, ui_features';
COMMENT ON COLUMN features.is_active IS 'Devre dışı özellikler için false yapılır.';
COMMENT ON COLUMN features.sort_order IS 'Admin panelde gösterim sırası.';

-- ============================================================================
-- PLANS TABLE
-- Abonelik paketleri (Lite, Pro, Premium)
-- ============================================================================

CREATE TABLE plans (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Plan info
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,

    -- Pricing (TRY varsayılan)
    price_monthly DECIMAL(10, 2) NOT NULL DEFAULT 0,
    price_yearly DECIMAL(10, 2),
    currency currency_code NOT NULL DEFAULT 'TRY',

    -- Display settings
    is_featured BOOLEAN NOT NULL DEFAULT false,  -- Önerilen paket olarak vurgula
    badge_text TEXT,                             -- Rozet metni (En Popüler, En İyi Değer vb.)

    -- Status & ordering
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT plans_slug_unique UNIQUE (slug),
    CONSTRAINT plans_slug_format CHECK (slug ~ '^[a-z][a-z0-9-]*$'),
    CONSTRAINT plans_slug_length CHECK (char_length(slug) >= 2 AND char_length(slug) <= 30),
    CONSTRAINT plans_name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 50),
    CONSTRAINT plans_price_monthly_positive CHECK (price_monthly >= 0),
    CONSTRAINT plans_price_yearly_positive CHECK (price_yearly IS NULL OR price_yearly >= 0)
);

-- Indexes for plans
CREATE INDEX idx_plans_slug ON plans (slug);
CREATE INDEX idx_plans_active ON plans (is_active) WHERE is_active = true;
CREATE INDEX idx_plans_sort_order ON plans (sort_order);
CREATE INDEX idx_plans_featured ON plans (is_featured) WHERE is_featured = true;

-- Trigger for updated_at
CREATE TRIGGER trigger_plans_updated_at
    BEFORE UPDATE ON plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE plans IS 'Abonelik paketleri. Örn: Lite, Pro, Premium. Super Admin bu tabloyu yönetir.';
COMMENT ON COLUMN plans.slug IS 'URL-friendly paket tanımlayıcı. Örn: lite, pro, premium';
COMMENT ON COLUMN plans.price_monthly IS 'Aylık fiyat (TRY). 0 = ücretsiz paket.';
COMMENT ON COLUMN plans.price_yearly IS 'Yıllık fiyat (TRY). NULL = yıllık ödeme seçeneği yok.';
COMMENT ON COLUMN plans.is_featured IS 'true yapıldığında önerilen paket olarak vurgulanır.';
COMMENT ON COLUMN plans.badge_text IS 'Paket kartında görünecek rozet. Örn: En Popüler, Tasarruflu';
COMMENT ON COLUMN plans.sort_order IS 'Fiyatlandırma sayfasında gösterim sırası.';

-- ============================================================================
-- PLAN_FEATURES TABLE
-- Paket-özellik eşleştirmesi
-- Her paketin hangi özelliklere sahip olduğu ve limitleri
-- ============================================================================

CREATE TABLE plan_features (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign keys
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,

    -- Feature values
    -- boolean özellikler için: value_boolean = true/false
    -- limit özellikler için: value_limit = sayı (NULL = sınırsız)
    value_boolean BOOLEAN DEFAULT true,
    value_limit INTEGER,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints: Aynı plan'da aynı feature tekrar edemez
    CONSTRAINT plan_features_unique_mapping UNIQUE (plan_id, feature_id),
    CONSTRAINT plan_features_limit_positive CHECK (value_limit IS NULL OR value_limit >= 0)
);

-- Indexes for plan_features
CREATE INDEX idx_plan_features_plan_id ON plan_features (plan_id);
CREATE INDEX idx_plan_features_feature_id ON plan_features (feature_id);

-- Comments
COMMENT ON TABLE plan_features IS 'Paket-özellik eşleştirmesi. Her paketin hangi özelliklere sahip olduğunu tanımlar.';
COMMENT ON COLUMN plan_features.value_boolean IS 'Boolean özellikler için değer. true = aktif, false = pasif.';
COMMENT ON COLUMN plan_features.value_limit IS 'Limit özellikler için sayısal değer. NULL = sınırsız. Örn: 20 (max 20 ürün)';

-- ============================================================================
-- SUBSCRIPTIONS TABLE
-- İşletme abonelikleri
-- Her organizasyonun hangi pakete abone olduğu
-- ============================================================================

CREATE TABLE subscriptions (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign keys
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,

    -- Status
    status subscription_status NOT NULL DEFAULT 'pending',

    -- Dates
    started_at TIMESTAMPTZ,                -- Abonelik başlangıç tarihi
    expires_at TIMESTAMPTZ,                -- Abonelik bitiş tarihi (NULL = süresiz)
    cancelled_at TIMESTAMPTZ,              -- İptal tarihi

    -- Payment info (EFT için basit)
    payment_method TEXT,                   -- 'eft', 'credit_card', 'bank_transfer' vb.
    last_payment_at TIMESTAMPTZ,           -- Son ödeme tarihi
    next_payment_at TIMESTAMPTZ,           -- Sonraki ödeme tarihi

    -- Admin info
    notes TEXT,                            -- Admin notları
    activated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- Aktivasyonu yapan admin

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints: Bir organization'ın aynı anda tek aktif aboneliği olabilir
    -- (completed/cancelled olanlar hariç)
    CONSTRAINT subscriptions_expires_after_start CHECK (
        expires_at IS NULL OR started_at IS NULL OR expires_at > started_at
    )
);

-- Indexes for subscriptions
CREATE INDEX idx_subscriptions_organization_id ON subscriptions (organization_id);
CREATE INDEX idx_subscriptions_plan_id ON subscriptions (plan_id);
CREATE INDEX idx_subscriptions_status ON subscriptions (status);
CREATE INDEX idx_subscriptions_active ON subscriptions (organization_id, status)
    WHERE status IN ('active', 'past_due');
CREATE INDEX idx_subscriptions_expires_at ON subscriptions (expires_at)
    WHERE expires_at IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER trigger_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE subscriptions IS 'İşletme abonelikleri. Her organization bir plana abone olur. Super Admin manuel olarak aktive eder.';
COMMENT ON COLUMN subscriptions.status IS 'pending: Ödeme bekleniyor, active: Aktif, past_due: Ödeme gecikmiş, cancelled: İptal, expired: Süresi dolmuş';
COMMENT ON COLUMN subscriptions.started_at IS 'Aboneliğin aktif hale geldiği tarih. Super Admin tarafından ayarlanır.';
COMMENT ON COLUMN subscriptions.expires_at IS 'Abonelik bitiş tarihi. NULL = süresiz.';
COMMENT ON COLUMN subscriptions.cancelled_at IS 'Aboneliğin iptal edildiği tarih. NULL = iptal edilmemiş.';
COMMENT ON COLUMN subscriptions.payment_method IS 'Ödeme yöntemi. İlk sürümde sadece EFT destekleniyor.';
COMMENT ON COLUMN subscriptions.last_payment_at IS 'Son ödeme tarihi. Ödeme geçmişi takibi için.';
COMMENT ON COLUMN subscriptions.next_payment_at IS 'Sonraki beklenen ödeme tarihi. Otomatik yenilemeli abonelikler için.';
COMMENT ON COLUMN subscriptions.notes IS 'Admin için özel notlar. Örn: "3 ay ücretsiz deneme verildi"';
COMMENT ON COLUMN subscriptions.activated_by IS 'Aktivasyonu yapan Super Admin kullanıcısının ID''si.';

-- ============================================================================
-- ORGANIZATION_FEATURE_OVERRIDES TABLE
-- Organizasyon bazlı özel izin/yasak
-- Plan özelliklerini override edebilir (Super Admin tarafından)
-- ============================================================================

CREATE TABLE organization_feature_overrides (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign keys
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Feature key (feature tablosuna join için)
    feature_key TEXT NOT NULL,

    -- Override values
    override_value BOOLEAN NOT NULL DEFAULT true,  -- true = izin ver, false = kapat
    override_limit INTEGER,                        -- Limit override (NULL = boolean override)

    -- Audit info
    reason TEXT,                                   -- Neden override yapıldı
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,                        -- Override bitiş tarihi (NULL = süresiz)

    -- Constraints: Aynı organization'da aynı feature için tek override
    CONSTRAINT org_feature_overrides_unique UNIQUE (organization_id, feature_key),
    CONSTRAINT org_feature_overrides_limit_positive CHECK (override_limit IS NULL OR override_limit >= 0),
    CONSTRAINT org_feature_overrides_expires_future CHECK (
        expires_at IS NULL OR expires_at > created_at
    )
);

-- Indexes for organization_feature_overrides
CREATE INDEX idx_org_feature_overrides_org_id ON organization_feature_overrides (organization_id);
CREATE INDEX idx_org_feature_overrides_feature_key ON organization_feature_overrides (feature_key);
CREATE INDEX idx_org_feature_overrides_expires ON organization_feature_overrides (expires_at)
    WHERE expires_at IS NOT NULL;
CREATE INDEX idx_org_feature_overrides_active ON organization_feature_overrides (organization_id)
    WHERE expires_at IS NULL OR expires_at > NOW();

-- Comments
COMMENT ON TABLE organization_feature_overrides IS 'Organizasyon bazlı özel özellik izinleri. Plan özelliklerini override eder. Super Admin tarafından yönetilir.';
COMMENT ON COLUMN organization_feature_overrides.feature_key IS 'Override edilen özelliğin key değeri. features.key ile eşleşir.';
COMMENT ON COLUMN organization_feature_overrides.override_value IS 'true = Bu özelliği plandaki değerden bağımsız olarak AÇ, false = plandaki değerden bağımsız olarak KAPAT';
COMMENT ON COLUMN organization_feature_overrides.override_limit IS 'Limit override. Plan''daki limitten farklı bir limit vermek için.';
COMMENT ON COLUMN organization_feature_overrides.reason IS 'Override nedeni. Örn: "Özel anlaşma", "3 aylık ücretsiz deneme", "Partner müşteri"';
COMMENT ON COLUMN organization_feature_overrides.expires_at IS 'Override''ın bitiş tarihi. NULL = süresiz. Geçici izinler için kullanılır.';

-- ============================================================================
-- HELPER FUNCTION: Get organization's active subscription
-- ============================================================================

CREATE OR REPLACE FUNCTION get_active_subscription(p_organization_id UUID)
RETURNS TABLE (
    subscription_id UUID,
    plan_id UUID,
    plan_slug TEXT,
    status subscription_status,
    expires_at TIMESTAMPTZ
) AS $$
    SELECT
        s.id,
        s.plan_id,
        p.slug,
        s.status,
        s.expires_at
    FROM subscriptions s
    JOIN plans p ON p.id = s.plan_id
    WHERE s.organization_id = p_organization_id
      AND s.status IN ('active', 'past_due')
      AND (s.expires_at IS NULL OR s.expires_at > NOW())
    ORDER BY s.created_at DESC
    LIMIT 1;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_active_subscription IS 'Organizasyonun aktif aboneliğini döndürür. Birden fazla varsa en son oluşturulanı alır.';

-- ============================================================================
-- HELPER FUNCTION: Check if organization has feature
-- Override öncelikli kontrol yapar
-- ============================================================================

CREATE OR REPLACE FUNCTION has_feature(
    p_organization_id UUID,
    p_feature_key TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_override_record RECORD;
    v_plan_feature RECORD;
BEGIN
    -- 1. Önce override kontrol et
    SELECT override_value, override_limit, expires_at
    INTO v_override_record
    FROM organization_feature_overrides
    WHERE organization_id = p_organization_id
      AND feature_key = p_feature_key
      AND (expires_at IS NULL OR expires_at > NOW());

    IF FOUND THEN
        -- Override varsa, değerini döndür
        RETURN v_override_record.override_value;
    END IF;

    -- 2. Override yoksa, plan özelliğini kontrol et
    SELECT pf.value_boolean, pf.value_limit
    INTO v_plan_feature
    FROM subscriptions s
    JOIN plans p ON p.id = s.plan_id
    JOIN plan_features pf ON pf.plan_id = p.id
    JOIN features f ON f.id = pf.feature_id
    WHERE s.organization_id = p_organization_id
      AND s.status IN ('active', 'past_due')
      AND (s.expires_at IS NULL OR s.expires_at > NOW())
      AND f.key = p_feature_key;

    IF NOT FOUND THEN
        -- Özellik tanımlanmamış = izin yok
        RETURN false;
    END IF;

    -- Boolean özellik için value_boolean döndür
    RETURN COALESCE(v_plan_feature.value_boolean, false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION has_feature IS 'Organizasyonun belirtilen özelliğe sahip olup olmadığını kontrol eder. Override öncelikli.';

-- ============================================================================
-- HELPER FUNCTION: Get feature limit for organization
-- Limit tipi özellikler için değeri döndürür
-- ============================================================================

CREATE OR REPLACE FUNCTION get_feature_limit(
    p_organization_id UUID,
    p_feature_key TEXT
)
RETURNS INTEGER AS $$
DECLARE
    v_override_record RECORD;
    v_plan_feature RECORD;
BEGIN
    -- 1. Önce override kontrol et
    SELECT override_limit, expires_at
    INTO v_override_record
    FROM organization_feature_overrides
    WHERE organization_id = p_organization_id
      AND feature_key = p_feature_key
      AND (expires_at IS NULL OR expires_at > NOW());

    IF FOUND AND v_override_record.override_limit IS NOT NULL THEN
        -- Override limit varsa, değerini döndür
        RETURN v_override_record.override_limit;
    END IF;

    -- 2. Override yoksa, plan limitini kontrol et
    SELECT pf.value_limit
    INTO v_plan_feature
    FROM subscriptions s
    JOIN plans p ON p.id = s.plan_id
    JOIN plan_features pf ON pf.plan_id = p.id
    JOIN features f ON f.id = pf.feature_id
    WHERE s.organization_id = p_organization_id
      AND s.status IN ('active', 'past_due')
      AND (s.expires_at IS NULL OR s.expires_at > NOW())
      AND f.key = p_feature_key;

    IF NOT FOUND THEN
        -- Özellik tanımlanmamış = 0 limit
        RETURN 0;
    END IF;

    -- NULL = sınırsız, -1 olarak döndür (uygulama katmanında kontrol edilecek)
    RETURN COALESCE(v_plan_feature.value_limit, -1);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_feature_limit IS 'Organizasyonun belirtilen özellik için limitini döndürür. -1 = sınırsız, 0 = izin yok.';

-- ============================================================================
-- HELPER FUNCTION: Get all organization features (for caching)
-- Tüm özellikleri tek seferde döndürür
-- ============================================================================

CREATE OR REPLACE FUNCTION get_organization_features(p_organization_id UUID)
RETURNS TABLE (
    feature_key TEXT,
    feature_type feature_type,
    is_enabled BOOLEAN,
    limit_value INTEGER,
    source TEXT  -- 'override', 'plan', veya 'none'
) AS $$
BEGIN
    RETURN QUERY
    WITH active_plan AS (
        -- Organizasyonun aktif planını bul
        SELECT p.id as plan_id, p.slug as plan_slug
        FROM subscriptions s
        JOIN plans p ON p.id = s.plan_id
        WHERE s.organization_id = p_organization_id
          AND s.status IN ('active', 'past_due')
          AND (s.expires_at IS NULL OR s.expires_at > NOW())
        ORDER BY s.created_at DESC
        LIMIT 1
    ),
    plan_features_cte AS (
        -- Plan özelliklerini al
        SELECT
            f.key,
            f.feature_type,
            pf.value_boolean,
            pf.value_limit
        FROM active_plan ap
        JOIN plan_features pf ON pf.plan_id = ap.plan_id
        JOIN features f ON f.id = pf.feature_id
    ),
    overrides_cte AS (
        -- Override'ları al
        SELECT
            ofo.feature_key,
            ofo.override_value,
            ofo.override_limit
        FROM organization_feature_overrides ofo
        WHERE ofo.organization_id = p_organization_id
          AND (ofo.expires_at IS NULL OR ofo.expires_at > NOW())
    )
    -- Tüm features ile LEFT JOIN yaparak sonuç oluştur
    SELECT
        f.key as feature_key,
        f.feature_type,
        -- is_enabled: Override varsa override, yoksa plan, yoksa false
        COALESCE(
            oc.override_value,
            pfc.value_boolean,
            false
        ) as is_enabled,
        -- limit_value: Override varsa override, yoksa plan, yoksa 0
        COALESCE(
            oc.override_limit,
            pfc.value_limit,
            0
        ) as limit_value,
        -- source: Nereden geldiğini belirt
        CASE
            WHEN oc.feature_key IS NOT NULL THEN 'override'
            WHEN pfc.key IS NOT NULL THEN 'plan'
            ELSE 'none'
        END as source
    FROM features f
    LEFT JOIN plan_features_cte pfc ON pfc.key = f.key
    LEFT JOIN overrides_cte oc ON oc.feature_key = f.key;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_organization_features IS 'Organizasyonun tüm özelliklerini döndürür. Frontend caching için kullanılır.';

-- ============================================================================
-- TRIGGER: Ensure single active subscription per organization
-- Aynı anda birden fazla aktif abonelik olmasını engeller
-- ============================================================================

CREATE OR REPLACE FUNCTION ensure_single_active_subscription()
RETURNS TRIGGER AS $$
DECLARE
    existing_count INTEGER;
BEGIN
    -- Sadece active veya past_due durumlarında kontrol et
    IF NEW.status IN ('active', 'past_due') THEN
        SELECT COUNT(*)
        INTO existing_count
        FROM subscriptions
        WHERE organization_id = NEW.organization_id
          AND id != NEW.id
          AND status IN ('active', 'past_due')
          AND (expires_at IS NULL OR expires_at > NOW());

        IF existing_count > 0 THEN
            RAISE EXCEPTION 'Organization already has an active subscription. Please cancel or expire the existing subscription first.'
                USING HINT = 'Bir organizasyonun aynı anda tek aktif aboneliği olabilir.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_single_active_subscription
    BEFORE INSERT OR UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_active_subscription();

COMMENT ON FUNCTION ensure_single_active_subscription IS 'Bir organizasyonun aynı anda birden fazla aktif aboneliği olmasını engeller.';
