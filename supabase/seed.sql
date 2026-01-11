-- ============================================================================
-- seed.sql
-- Initial Seed Data for OzaMenu Platform
-- Features catalog, Plans (Lite, Pro, Premium), and Feature mappings
-- ============================================================================
--
-- Bu dosya Supabase'e ilk veri yüklemesi için kullanılır.
-- Çalıştırmak için: npx supabase db seed veya Supabase SQL Editor
--
-- IMPORTANT: Bu dosya idempotent tasarlanmıştır (ON CONFLICT kullanır).
-- Tekrar çalıştırıldığında mevcut verileri günceller, çakışma olmaz.
-- ============================================================================

-- ============================================================================
-- FEATURES CATALOG
-- Tüm platform özellikleri - Dinamik paket kontrolü için
-- feature_type: 'boolean' = açık/kapalı, 'limit' = sayısal limit
-- category: Admin panelde gruplama için
--
-- ÖNEMLI: Feature key'leri kod içinde kullanılır:
--   hasPermission(orgId, 'module_waiter_call')
--   getFeatureLimit(orgId, 'limit_menu_items')
-- ============================================================================

-- ----------------------------------------------------------------------------
-- LIMIT FEATURES (Sayısal limitler)
-- ----------------------------------------------------------------------------

INSERT INTO features (key, name, description, feature_type, category, sort_order)
VALUES
    ('limit_categories', 'Kategori Limiti', 'Maksimum oluşturulabilecek kategori sayısı. NULL = sınırsız.', 'limit', 'limits', 10),
    ('limit_menu_items', 'Ürün Limiti', 'Maksimum eklenebilecek ürün/menü öğesi sayısı. NULL = sınırsız.', 'limit', 'limits', 20),
    ('limit_price_changes', 'Fiyat Değişikliği Limiti', 'Aylık maksimum fiyat değişikliği sayısı. NULL = sınırsız.', 'limit', 'limits', 30),
    ('limit_tables', 'Masa Limiti', 'Maksimum tanımlanabilecek masa sayısı. NULL = sınırsız.', 'limit', 'limits', 40),
    ('limit_languages', 'Dil Limiti', 'Desteklenen ek dil sayısı (Türkçe hariç). 0 = sadece Türkçe.', 'limit', 'limits', 50),
    ('limit_users', 'Kullanıcı Limiti', 'İşletmeye eklenebilecek maksimum personel sayısı. NULL = sınırsız.', 'limit', 'limits', 60)
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    feature_type = EXCLUDED.feature_type,
    category = EXCLUDED.category,
    sort_order = EXCLUDED.sort_order;

-- ----------------------------------------------------------------------------
-- MODULE FEATURES (Açık/Kapalı modüller)
-- ----------------------------------------------------------------------------

INSERT INTO features (key, name, description, feature_type, category, sort_order)
VALUES
    -- Görsel & Branding Modülleri (Pro+)
    ('module_images', 'Görsel Sistemi', 'Ürün görsellerini yükleme ve gösterme özelliği.', 'boolean', 'modules', 100),
    ('module_logo', 'Logo Kullanımı', 'İşletme logosunu menü sayfasında gösterme.', 'boolean', 'modules', 110),
    ('module_background_color', 'Arka Plan Renklendirme', 'Menü arka plan rengini özelleştirme.', 'boolean', 'modules', 120),
    ('module_cover_image', 'Kapak Resmi', 'Menü sayfasının üst %20''lik alanında kapak görseli.', 'boolean', 'modules', 125),

    -- Ürün Etiketleme Modülleri (Pro+)
    ('module_chef_special', 'Şefin Tavsiyesi', 'Ürünlere "Şefin Tavsiyesi" ribbon/etiketi ekleme.', 'boolean', 'modules', 130),
    ('module_daily_special', 'Günün Spesiyeli', 'Günlük değişen özel ürünü vurgulama.', 'boolean', 'modules', 140),

    -- Garson & Masa Modülleri (Pro+)
    ('module_waiter_call', 'Garson Çağırma', 'Müşterinin menüden garson çağırabilmesi. Supabase Realtime ile anlık bildirim.', 'boolean', 'modules', 150),
    ('module_table_management', 'Masa Yönetimi', 'QR bazlı masa tanımlama ve durum takibi.', 'boolean', 'modules', 155),

    -- Çoklu Dil (Pro: 1 dil, Premium: 3 dil - limit_languages ile kontrol)
    ('module_multilang', 'Çoklu Dil Desteği', 'Menüyü birden fazla dilde sunma (İngilizce, Arapça, Rusça vb.).', 'boolean', 'modules', 160),

    -- Destek Modülleri (Pro+)
    ('module_priority_support', 'Hızlı Destek Hattı', 'Öncelikli teknik destek ve hızlı yanıt.', 'boolean', 'modules', 170),

    -- Premium Modüller
    ('module_cross_sell', 'Bununla İyi Gider', 'Çapraz satış: İlişkili ürün önerileri gösterme.', 'boolean', 'modules', 200),
    ('module_happy_hour', 'Happy Hour Zamanlayıcı', 'Zamana dayalı otomatik fiyat değişikliği. valid_from/valid_until kullanır.', 'boolean', 'modules', 210),
    ('module_social_share', 'Sosyal Medya Paylaşım', 'Müşterilerin ürünleri sosyal medyada paylaşması.', 'boolean', 'modules', 220),
    ('module_nutrition_info', 'Besin Değerleri', 'Kalori, karbonhidrat, protein bilgisi gösterimi.', 'boolean', 'modules', 230),
    ('module_allergen_info', 'Alerjen Bilgisi', 'Alerjen içerik uyarıları gösterimi.', 'boolean', 'modules', 235),
    ('module_google_business', 'Benim İşletmem Entegrasyonu', 'Google My Business ile entegrasyon, yorum toplama.', 'boolean', 'modules', 240),
    ('module_whatsapp_support', 'WhatsApp Destek', 'WhatsApp üzerinden müşteri desteği.', 'boolean', 'modules', 250),
    ('module_whatsapp_revise', 'WhatsApp Üzerinden Revize', 'Premium concierge: Değişiklikleri WhatsApp ile bizim ekibimiz yapar.', 'boolean', 'modules', 260)
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    feature_type = EXCLUDED.feature_type,
    category = EXCLUDED.category,
    sort_order = EXCLUDED.sort_order;

-- ----------------------------------------------------------------------------
-- UI/UX FEATURES (Arayüz özellikleri)
-- ----------------------------------------------------------------------------

INSERT INTO features (key, name, description, feature_type, category, sort_order)
VALUES
    ('ui_custom_theme', 'Özel Tema', 'Gelişmiş menü renk şeması özelleştirme.', 'boolean', 'ui_features', 300),
    ('ui_product_badges', 'Ürün Rozetleri', 'Yeni, Popüler, Kampanya gibi özel rozetler.', 'boolean', 'ui_features', 310),
    ('ui_portion_sizes', 'Porsiyon Seçenekleri', 'Aynı ürün için farklı porsiyon boyutları ve fiyatları.', 'boolean', 'ui_features', 320)
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    feature_type = EXCLUDED.feature_type,
    category = EXCLUDED.category,
    sort_order = EXCLUDED.sort_order;

-- ----------------------------------------------------------------------------
-- ADVANCED FEATURES (Gelişmiş özellikler)
-- ----------------------------------------------------------------------------

INSERT INTO features (key, name, description, feature_type, category, sort_order)
VALUES
    ('advanced_analytics', 'Detaylı Analitik', 'Menü görüntülenme, popüler ürünler ve müşteri davranış istatistikleri.', 'boolean', 'advanced', 400),
    ('advanced_export', 'Veri Dışa Aktarım', 'Menü, fiyat geçmişi ve audit loglarını CSV/PDF olarak indirme.', 'boolean', 'advanced', 410),
    ('advanced_api_access', 'API Erişimi', 'Harici sistemlerle entegrasyon için REST API erişimi.', 'boolean', 'advanced', 420),
    ('advanced_audit_log', 'Denetim Günlüğü', 'Tüm fiyat değişikliklerinin ve menü güncellemelerinin detaylı kaydı.', 'boolean', 'advanced', 430)
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    feature_type = EXCLUDED.feature_type,
    category = EXCLUDED.category,
    sort_order = EXCLUDED.sort_order;

-- ============================================================================
-- PLANS
-- Abonelik paketleri: Lite (Ücretsiz), Pro (Professional), Premium
-- Fiyatlar TRY cinsindendir.
-- ============================================================================

INSERT INTO plans (id, slug, name, description, price_monthly, price_yearly, is_featured, badge_text, sort_order, is_active)
VALUES
    (
        '00000000-0000-0000-0000-000000000001'::UUID,
        'lite',
        'Lite',
        'Küçük işletmeler için temel QR menü çözümü. Hızlı başlangıç, sınırlı özellikler.',
        0.00,
        NULL,
        false,
        NULL,
        10,
        true
    ),
    (
        '00000000-0000-0000-0000-000000000002'::UUID,
        'pro',
        'Professional',
        'Büyüyen işletmeler için profesyonel menü yönetimi. Görsel, logo, garson çağırma ve daha fazlası.',
        299.00,
        2990.00,  -- ~2 ay tasarruf
        true,     -- Önerilen paket
        'En Popüler',
        20,
        true
    ),
    (
        '00000000-0000-0000-0000-000000000003'::UUID,
        'premium',
        'Premium',
        'Kurumsal işletmeler için tam kapsamlı çözüm. Happy Hour, çapraz satış, besin değerleri ve öncelikli destek.',
        599.00,
        5990.00,  -- ~2 ay tasarruf
        false,
        'Tam Paket',
        30,
        true
    )
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    is_featured = EXCLUDED.is_featured,
    badge_text = EXCLUDED.badge_text,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- PLAN_FEATURES
-- Paket-özellik eşleştirmeleri
--
-- Paket Karşılaştırma Tablosu (paketler.md'den):
-- | ÖZELLİK                    | LITE        | PRO         | PREMIUM     |
-- |----------------------------|-------------|-------------|-------------|
-- | Kategori Ekleme            | 3 Adet      | Sınırsız    | Sınırsız    |
-- | Ürün Ekleme                | 20 Adet     | Sınırsız    | Sınırsız    |
-- | Fiyat Revize               | 2 Defa/Ay   | Sınırsız    | Sınırsız    |
-- | Görsel Sistemi             | ❌          | ✔️          | ✔️          |
-- | Logo Kullanımı             | ❌          | ✔️          | ✔️          |
-- | Arka Plan Renklendirme     | ❌          | ✔️          | ✔️          |
-- | Şefin Tavsiyesi            | ❌          | ✔️          | ✔️          |
-- | Günün Spesiyeli            | ❌          | ✔️          | ✔️          |
-- | Garson Çağırma             | ❌          | ✔️          | ✔️          |
-- | Çoklu Dil Desteği          | ❌          | 1 Dil       | 3 Dil       |
-- | Hızlı Destek Hattı         | ❌          | ✔️          | ✔️          |
-- | Çapraz Satış               | ❌          | ❌          | ✔️          |
-- | Happy Hour                 | ❌          | ❌          | ✔️          |
-- | Sosyal Medya Paylaş        | ❌          | ❌          | ✔️          |
-- | Besin Değerleri            | ❌          | ❌          | ✔️          |
-- | Google My Business         | ❌          | ❌          | ✔️          |
-- | WhatsApp Revizyon          | ❌          | ❌          | ✔️          |
-- ============================================================================

-- Önce mevcut plan_features'ı temizle (idempotent reset için)
-- Sadece bilinen plan ID'leri için temizlik yap
DELETE FROM plan_features
WHERE plan_id IN (
    '00000000-0000-0000-0000-000000000001'::UUID,
    '00000000-0000-0000-0000-000000000002'::UUID,
    '00000000-0000-0000-0000-000000000003'::UUID
);

-- ----------------------------------------------------------------------------
-- LITE PLAN FEATURES
-- Sınırlı özellikler: 3 kategori, 20 ürün, 2 fiyat değişikliği, 5 masa
-- Tüm modüller kapalı
-- ----------------------------------------------------------------------------

INSERT INTO plan_features (plan_id, feature_id, value_boolean, value_limit)
SELECT
    '00000000-0000-0000-0000-000000000001'::UUID,
    f.id,
    CASE
        WHEN f.feature_type = 'limit' THEN true  -- Limit özellikler mevcut (ama limit var)
        ELSE false  -- Boolean modüller kapalı
    END,
    CASE f.key
        -- Lite limitleri
        WHEN 'limit_categories' THEN 3
        WHEN 'limit_menu_items' THEN 20
        WHEN 'limit_price_changes' THEN 2
        WHEN 'limit_tables' THEN 5
        WHEN 'limit_languages' THEN 0
        WHEN 'limit_users' THEN 2
        ELSE NULL
    END
FROM features f
WHERE f.is_active = true;

-- ----------------------------------------------------------------------------
-- PRO PLAN FEATURES
-- Sınırsız: kategori, ürün, fiyat değişikliği, masa
-- Açık modüller: görsel, logo, arka plan, kapak, şefin tavsiyesi, günün spesiyeli,
--               garson çağırma, masa yönetimi, çoklu dil (1), hızlı destek
-- Kapalı: çapraz satış, happy hour, sosyal medya, besin değerleri, google, whatsapp
-- ----------------------------------------------------------------------------

INSERT INTO plan_features (plan_id, feature_id, value_boolean, value_limit)
SELECT
    '00000000-0000-0000-0000-000000000002'::UUID,
    f.id,
    CASE
        WHEN f.feature_type = 'limit' THEN true  -- Tüm limit özellikleri mevcut
        WHEN f.key IN (
            -- Pro'da açık olan modüller
            'module_images',
            'module_logo',
            'module_background_color',
            'module_cover_image',
            'module_chef_special',
            'module_daily_special',
            'module_waiter_call',
            'module_table_management',
            'module_multilang',
            'module_priority_support',
            'module_allergen_info',
            -- UI özellikleri
            'ui_custom_theme',
            'ui_product_badges',
            'ui_portion_sizes',
            -- Gelişmiş özellikler
            'advanced_export',
            'advanced_audit_log'
        ) THEN true
        ELSE false  -- Premium only modüller
    END,
    CASE f.key
        -- Pro: Sınırsız temel limitler (NULL = sınırsız)
        WHEN 'limit_categories' THEN NULL
        WHEN 'limit_menu_items' THEN NULL
        WHEN 'limit_price_changes' THEN NULL
        WHEN 'limit_tables' THEN NULL
        WHEN 'limit_languages' THEN 1  -- Pro'da 1 ek dil
        WHEN 'limit_users' THEN 10     -- Pro'da 10 kullanıcı
        ELSE NULL
    END
FROM features f
WHERE f.is_active = true;

-- ----------------------------------------------------------------------------
-- PREMIUM PLAN FEATURES
-- Tüm özellikler açık, sınırsız limitler
-- ----------------------------------------------------------------------------

INSERT INTO plan_features (plan_id, feature_id, value_boolean, value_limit)
SELECT
    '00000000-0000-0000-0000-000000000003'::UUID,
    f.id,
    true,  -- Premium'da tüm özellikler açık
    CASE f.key
        -- Premium: Tüm limitler sınırsız (NULL = sınırsız)
        WHEN 'limit_categories' THEN NULL
        WHEN 'limit_menu_items' THEN NULL
        WHEN 'limit_price_changes' THEN NULL
        WHEN 'limit_tables' THEN NULL
        WHEN 'limit_languages' THEN 3  -- Premium'da 3 ek dil
        WHEN 'limit_users' THEN NULL   -- Premium'da sınırsız kullanıcı
        ELSE NULL
    END
FROM features f
WHERE f.is_active = true;

-- ============================================================================
-- VERIFICATION
-- Seed data'nın doğruluğunu kontrol et
-- ============================================================================

DO $$
DECLARE
    v_feature_count INTEGER;
    v_plan_count INTEGER;
    v_plan_feature_count INTEGER;
    v_lite_features INTEGER;
    v_pro_features INTEGER;
    v_premium_features INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_feature_count FROM features WHERE is_active = true;
    SELECT COUNT(*) INTO v_plan_count FROM plans WHERE is_active = true;
    SELECT COUNT(*) INTO v_plan_feature_count FROM plan_features;

    SELECT COUNT(*) INTO v_lite_features
    FROM plan_features pf
    JOIN plans p ON p.id = pf.plan_id
    WHERE p.slug = 'lite';

    SELECT COUNT(*) INTO v_pro_features
    FROM plan_features pf
    JOIN plans p ON p.id = pf.plan_id
    WHERE p.slug = 'pro';

    SELECT COUNT(*) INTO v_premium_features
    FROM plan_features pf
    JOIN plans p ON p.id = pf.plan_id
    WHERE p.slug = 'premium';

    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║             SEED DATA SUMMARY                          ║';
    RAISE NOTICE '╠════════════════════════════════════════════════════════╣';
    RAISE NOTICE '║ Features (active):        %                            ║', LPAD(v_feature_count::TEXT, 3);
    RAISE NOTICE '║ Plans (active):           %                            ║', LPAD(v_plan_count::TEXT, 3);
    RAISE NOTICE '║ Plan-Feature mappings:    %                          ║', LPAD(v_plan_feature_count::TEXT, 3);
    RAISE NOTICE '╠════════════════════════════════════════════════════════╣';
    RAISE NOTICE '║ Lite plan features:       %                            ║', LPAD(v_lite_features::TEXT, 3);
    RAISE NOTICE '║ Pro plan features:        %                            ║', LPAD(v_pro_features::TEXT, 3);
    RAISE NOTICE '║ Premium plan features:    %                            ║', LPAD(v_premium_features::TEXT, 3);
    RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';

    -- Validation checks
    IF v_feature_count < 20 THEN
        RAISE WARNING 'Expected at least 20 features, got %', v_feature_count;
    END IF;

    IF v_plan_count != 3 THEN
        RAISE WARNING 'Expected 3 plans, got %', v_plan_count;
    END IF;

    IF v_lite_features != v_feature_count OR
       v_pro_features != v_feature_count OR
       v_premium_features != v_feature_count THEN
        RAISE WARNING 'Plan feature counts do not match total features!';
        RAISE WARNING 'Lite: %, Pro: %, Premium: %, Expected: %',
            v_lite_features, v_pro_features, v_premium_features, v_feature_count;
    END IF;

    RAISE NOTICE 'Seed data validation complete.';
END $$;

-- ============================================================================
-- VERIFICATION QUERIES (Comment out after verification)
-- ============================================================================

-- Plan features matrix view
/*
SELECT
    p.name as "Plan",
    f.key as "Feature Key",
    f.name as "Feature Name",
    f.feature_type as "Type",
    pf.value_boolean as "Enabled",
    CASE
        WHEN f.feature_type = 'limit' AND pf.value_limit IS NULL THEN 'Sınırsız'
        WHEN f.feature_type = 'limit' THEN pf.value_limit::TEXT
        ELSE '-'
    END as "Limit"
FROM plan_features pf
JOIN plans p ON p.id = pf.plan_id
JOIN features f ON f.id = pf.feature_id
WHERE p.is_active = true AND f.is_active = true
ORDER BY p.sort_order, f.sort_order;
*/

-- Quick feature comparison
/*
SELECT
    f.key,
    f.name,
    MAX(CASE WHEN p.slug = 'lite' THEN
        CASE
            WHEN f.feature_type = 'limit' AND pf.value_limit IS NULL THEN '∞'
            WHEN f.feature_type = 'limit' THEN pf.value_limit::TEXT
            WHEN pf.value_boolean THEN '✔'
            ELSE '✖'
        END
    END) as "Lite",
    MAX(CASE WHEN p.slug = 'pro' THEN
        CASE
            WHEN f.feature_type = 'limit' AND pf.value_limit IS NULL THEN '∞'
            WHEN f.feature_type = 'limit' THEN pf.value_limit::TEXT
            WHEN pf.value_boolean THEN '✔'
            ELSE '✖'
        END
    END) as "Pro",
    MAX(CASE WHEN p.slug = 'premium' THEN
        CASE
            WHEN f.feature_type = 'limit' AND pf.value_limit IS NULL THEN '∞'
            WHEN f.feature_type = 'limit' THEN pf.value_limit::TEXT
            WHEN pf.value_boolean THEN '✔'
            ELSE '✖'
        END
    END) as "Premium"
FROM features f
JOIN plan_features pf ON pf.feature_id = f.id
JOIN plans p ON p.id = pf.plan_id
GROUP BY f.id, f.key, f.name, f.sort_order
ORDER BY f.sort_order;
*/

-- ============================================================================
-- END OF SEED DATA
-- ============================================================================
