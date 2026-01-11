-- ============================================================================
-- 006_views.sql
-- Database views for convenient querying
-- Views: current_prices, organization_with_plan
-- ============================================================================

-- ============================================================================
-- CURRENT_PRICES VIEW
-- Guncel fiyatlari donduren view
-- DISTINCT ON ile her urun icin tek bir satir doner
-- valid_from/valid_until mantigi ile Happy Hour destegi
-- ============================================================================

CREATE VIEW current_prices AS
SELECT DISTINCT ON (product_id)
    pl.product_id,
    pl.id AS price_ledger_id,
    pl.price,
    pl.currency,
    pl.valid_from,
    pl.valid_until,
    pl.created_by,
    pl.change_reason,
    pl.created_at
FROM price_ledger pl
WHERE pl.valid_from <= NOW()
  AND (pl.valid_until IS NULL OR pl.valid_until > NOW())
ORDER BY pl.product_id, pl.valid_from DESC;

-- Comments
COMMENT ON VIEW current_prices IS 'Her urun icin guncel gecerli fiyati dondurur. DISTINCT ON ile urun basina tek satir. Happy Hour fiyatlamasi desteklenir. price_ledger_id ile orijinal kayda referans saglar.';

-- ============================================================================
-- ORGANIZATION_WITH_PLAN VIEW
-- Organizasyon bilgilerini aktif abonelik ve plan bilgileriyle birlestirir
-- Dashboard ve yetkilendirme kontrollerinde kullanilir
-- LATERAL join ile her organizasyon icin en son aktif abonelik alinir
-- ============================================================================

CREATE VIEW organization_with_plan AS
SELECT
    o.id,
    o.name,
    o.slug,
    o.description,
    o.logo_url,
    o.cover_image_url,
    o.background_color,
    o.address,
    o.phone,
    o.email,
    o.website,
    o.instagram_url,
    o.facebook_url,
    o.twitter_url,
    o.status,
    o.created_at,
    o.updated_at,
    -- Subscription info
    s.id AS subscription_id,
    s.status AS subscription_status,
    s.started_at AS subscription_started_at,
    s.expires_at AS subscription_expires_at,
    s.cancelled_at AS subscription_cancelled_at,
    s.payment_method,
    s.last_payment_at,
    s.next_payment_at,
    s.notes AS subscription_notes,
    s.activated_by,
    -- Plan info
    p.id AS plan_id,
    p.name AS plan_name,
    p.slug AS plan_slug,
    p.description AS plan_description,
    p.price_monthly AS plan_price_monthly,
    p.price_yearly AS plan_price_yearly,
    p.currency AS plan_currency,
    p.is_featured AS plan_is_featured,
    p.badge_text AS plan_badge_text,
    -- Computed fields for convenience
    CASE
        WHEN s.id IS NULL THEN false
        WHEN s.status IN ('active', 'past_due') AND (s.expires_at IS NULL OR s.expires_at > NOW()) THEN true
        ELSE false
    END AS has_active_subscription,
    CASE
        WHEN s.expires_at IS NULL THEN NULL
        WHEN s.expires_at <= NOW() THEN 0
        ELSE EXTRACT(DAY FROM (s.expires_at - NOW()))::INTEGER
    END AS days_until_expiry
FROM organizations o
LEFT JOIN LATERAL (
    -- LATERAL join ile her organizasyon icin en son aktif aboneligi al
    -- Birden fazla aktif abonelik varsa en son olusturulani secer
    SELECT *
    FROM subscriptions sub
    WHERE sub.organization_id = o.id
      AND sub.status IN ('active', 'past_due')
      AND (sub.expires_at IS NULL OR sub.expires_at > NOW())
    ORDER BY sub.created_at DESC
    LIMIT 1
) s ON true
LEFT JOIN plans p ON p.id = s.plan_id;

-- Comments
COMMENT ON VIEW organization_with_plan IS 'Organizasyonlari aktif abonelik ve plan bilgileriyle birlikte dondurur. LATERAL join ile her organizasyon icin en son aktif abonelik alinir. has_active_subscription ve days_until_expiry hesaplanmis alanlar icerir.';

-- ============================================================================
-- PRODUCTS_WITH_CURRENT_PRICE VIEW
-- Urunleri guncel fiyatlariyla birlestirir
-- Menu sayfasi ve urun listeleme icin kullanilir
-- ============================================================================

CREATE VIEW products_with_current_price AS
SELECT
    p.id,
    p.organization_id,
    p.category_id,
    p.name,
    p.description,
    p.image_url,
    p.allergens,
    p.calories,
    p.preparation_time_minutes,
    p.is_chef_special,
    p.is_daily_special,
    p.is_active,
    p.sort_order,
    p.created_at,
    p.updated_at,
    -- Current price info
    cp.price AS current_price,
    cp.currency AS current_currency,
    cp.valid_from AS price_valid_from,
    cp.valid_until AS price_valid_until,
    cp.change_reason AS last_change_reason,
    cp.created_by AS price_changed_by,
    -- Category info
    c.name AS category_name,
    c.sort_order AS category_sort_order,
    c.is_active AS category_is_active
FROM products p
LEFT JOIN current_prices cp ON cp.product_id = p.id
LEFT JOIN categories c ON c.id = p.category_id;

-- Comments
COMMENT ON VIEW products_with_current_price IS 'Urunleri guncel fiyat ve kategori bilgileriyle birlikte dondurur. Menu goruntuleme icin optimize edilmistir.';

-- ============================================================================
-- MENU_VIEW
-- Public menu sayfasi icin optimize edilmis view
-- Sadece aktif urunleri ve kategorileri icerir
-- ============================================================================

CREATE VIEW menu_view AS
SELECT
    p.id,
    p.organization_id,
    p.name,
    p.description,
    p.image_url,
    p.allergens,
    p.calories,
    p.preparation_time_minutes,
    p.is_chef_special,
    p.is_daily_special,
    p.sort_order,
    -- Price
    cp.price,
    cp.currency,
    cp.valid_from AS price_valid_from,
    cp.valid_until AS price_valid_until,
    -- Category
    c.id AS category_id,
    c.name AS category_name,
    c.description AS category_description,
    c.sort_order AS category_sort_order,
    -- Organization
    o.name AS organization_name,
    o.slug AS organization_slug,
    o.logo_url AS organization_logo_url,
    o.cover_image_url AS organization_cover_image_url,
    o.background_color AS organization_background_color,
    o.phone AS organization_phone,
    o.address AS organization_address
FROM products p
JOIN organizations o ON o.id = p.organization_id AND o.status = 'active'
LEFT JOIN categories c ON c.id = p.category_id AND c.is_active = true
LEFT JOIN current_prices cp ON cp.product_id = p.id
WHERE p.is_active = true
ORDER BY COALESCE(c.sort_order, 999999), p.sort_order;

-- Comments
COMMENT ON VIEW menu_view IS 'Public menu sayfasi icin optimize edilmis view. Sadece aktif organizasyon ve urunleri icerir. Kategorisiz urunler de desteklenir.';

-- ============================================================================
-- TABLE_STATUS_VIEW
-- Masa durumlarini ve bekleyen servis isteklerini birlestirir
-- Garson paneli icin kullanilir
-- ============================================================================

CREATE VIEW table_status_view AS
SELECT
    rt.id,
    rt.organization_id,
    rt.qr_uuid,
    rt.table_number,
    rt.table_name,
    rt.section,
    rt.capacity,
    rt.current_status,
    rt.last_ping_at,
    rt.is_active,
    rt.created_at,
    rt.updated_at,
    -- Pending requests count
    COALESCE(
        (SELECT COUNT(*)
         FROM service_requests sr
         WHERE sr.table_id = rt.id
           AND sr.status = 'pending'),
        0
    )::INTEGER AS pending_requests_count,
    -- Last request time
    (SELECT MAX(created_at)
     FROM service_requests sr
     WHERE sr.table_id = rt.id
       AND sr.status = 'pending') AS last_request_at,
    -- Organization info for easier access
    o.name AS organization_name,
    o.slug AS organization_slug
FROM restaurant_tables rt
LEFT JOIN organizations o ON o.id = rt.organization_id;

-- Comments
COMMENT ON VIEW table_status_view IS 'Masalari bekleyen servis istekleri ile birlikte dondurur. Garson paneli icin kullanilir.';

-- ============================================================================
-- SUBSCRIPTION_DETAILS_VIEW
-- Abonelik detaylarini plan ve organizasyon bilgileriyle birlestirir
-- Super Admin paneli icin kullanilir
-- ============================================================================

CREATE VIEW subscription_details_view AS
SELECT
    s.id,
    s.organization_id,
    s.plan_id,
    s.status,
    s.started_at,
    s.expires_at,
    s.cancelled_at,
    s.payment_method,
    s.last_payment_at,
    s.next_payment_at,
    s.notes,
    s.activated_by,
    s.created_at,
    s.updated_at,
    -- Organization info
    o.name AS organization_name,
    o.slug AS organization_slug,
    o.status AS organization_status,
    o.email AS organization_email,
    o.phone AS organization_phone,
    -- Plan info
    p.name AS plan_name,
    p.slug AS plan_slug,
    p.price_monthly,
    p.price_yearly,
    p.currency,
    -- Activated by user info
    u.email AS activated_by_email,
    u.full_name AS activated_by_name,
    -- Computed fields
    CASE
        WHEN s.expires_at IS NULL THEN NULL
        WHEN s.expires_at <= NOW() THEN 0
        ELSE EXTRACT(DAY FROM (s.expires_at - NOW()))::INTEGER
    END AS days_until_expiry,
    CASE
        WHEN s.status = 'active' AND (s.expires_at IS NULL OR s.expires_at > NOW()) THEN true
        ELSE false
    END AS is_currently_active
FROM subscriptions s
JOIN organizations o ON o.id = s.organization_id
JOIN plans p ON p.id = s.plan_id
LEFT JOIN users u ON u.id = s.activated_by;

-- Comments
COMMENT ON VIEW subscription_details_view IS 'Abonelik detaylarini organizasyon ve plan bilgileriyle birlikte dondurur. Super Admin paneli icin kullanilir.';

-- ============================================================================
-- PRICE_HISTORY_VIEW
-- Urun fiyat gecmisini kullanici bilgileriyle birlestirir
-- Audit ve denetim icin kullanilir
-- ============================================================================

CREATE VIEW price_history_view AS
SELECT
    pl.id,
    pl.product_id,
    pl.price,
    pl.currency,
    pl.valid_from,
    pl.valid_until,
    pl.change_reason,
    pl.created_at,
    pl.created_by,
    -- Product info
    p.name AS product_name,
    p.organization_id,
    -- Category info
    c.name AS category_name,
    -- User who changed
    u.email AS changed_by_email,
    u.full_name AS changed_by_name,
    -- Organization info
    o.name AS organization_name,
    o.slug AS organization_slug,
    -- Is this the current price?
    CASE
        WHEN pl.valid_from <= NOW()
         AND (pl.valid_until IS NULL OR pl.valid_until > NOW())
        THEN true
        ELSE false
    END AS is_current_price,
    -- Time since last change
    EXTRACT(DAY FROM (NOW() - pl.created_at))::INTEGER AS days_since_change
FROM price_ledger pl
JOIN products p ON p.id = pl.product_id
LEFT JOIN organizations o ON o.id = p.organization_id
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN users u ON u.id = pl.created_by
ORDER BY pl.product_id, pl.valid_from DESC;

-- Comments
COMMENT ON VIEW price_history_view IS 'Fiyat gecmisini urun ve kullanici bilgileriyle birlikte dondurur. Audit ve denetim icin kullanilir.';

-- ============================================================================
-- ORGANIZATION_STATS VIEW
-- Organizasyon istatistikleri
-- Dashboard overview icin kullanilir
-- ============================================================================

CREATE VIEW organization_stats AS
SELECT
    o.id AS organization_id,
    o.name AS organization_name,
    o.slug AS organization_slug,
    o.status AS organization_status,
    -- Product stats
    (
        SELECT COUNT(*)
        FROM products p
        WHERE p.organization_id = o.id
    ) AS total_products,
    (
        SELECT COUNT(*)
        FROM products p
        WHERE p.organization_id = o.id AND p.is_active = true
    ) AS active_products,
    -- Category stats
    (
        SELECT COUNT(*)
        FROM categories c
        WHERE c.organization_id = o.id
    ) AS total_categories,
    (
        SELECT COUNT(*)
        FROM categories c
        WHERE c.organization_id = o.id AND c.is_active = true
    ) AS active_categories,
    -- Price change stats (last 30 days)
    (
        SELECT COUNT(*)
        FROM price_ledger pl
        JOIN products p ON p.id = pl.product_id
        WHERE p.organization_id = o.id
          AND pl.created_at >= NOW() - INTERVAL '30 days'
    ) AS price_changes_last_30_days,
    -- Table stats
    (
        SELECT COUNT(*)
        FROM restaurant_tables rt
        WHERE rt.organization_id = o.id
    ) AS total_tables,
    (
        SELECT COUNT(*)
        FROM restaurant_tables rt
        WHERE rt.organization_id = o.id AND rt.is_active = true
    ) AS active_tables,
    -- Service request stats (last 24 hours)
    (
        SELECT COUNT(*)
        FROM service_requests sr
        JOIN restaurant_tables rt ON rt.id = sr.table_id
        WHERE rt.organization_id = o.id
          AND sr.created_at >= NOW() - INTERVAL '24 hours'
    ) AS service_requests_last_24h,
    -- Last activity timestamps
    (
        SELECT MAX(p.updated_at)
        FROM products p
        WHERE p.organization_id = o.id
    ) AS last_product_update,
    (
        SELECT MAX(pl.created_at)
        FROM price_ledger pl
        JOIN products p ON p.id = pl.product_id
        WHERE p.organization_id = o.id
    ) AS last_price_change,
    -- Snapshot count
    (
        SELECT COUNT(*)
        FROM menu_snapshots ms
        WHERE ms.organization_id = o.id
    ) AS total_snapshots
FROM organizations o;

-- Comments
COMMENT ON VIEW organization_stats IS 'Organizasyon istatistikleri. Dashboard overview icin kullanilir. Urun sayisi, kategori sayisi, fiyat degisiklikleri vb. bilgiler icerir.';

-- ============================================================================
-- PENDING_ACTIVATIONS VIEW
-- Super Admin icin bekleyen aktivasyonlar
-- ============================================================================

CREATE VIEW pending_activations AS
SELECT
    o.id AS organization_id,
    o.name AS organization_name,
    o.slug AS organization_slug,
    o.email AS organization_email,
    o.phone AS organization_phone,
    o.created_at AS organization_created_at,
    o.status AS organization_status,
    s.id AS subscription_id,
    s.status AS subscription_status,
    s.created_at AS subscription_created_at,
    s.payment_method,
    s.notes AS subscription_notes,
    p.id AS plan_id,
    p.name AS plan_name,
    p.slug AS plan_slug,
    p.price_monthly,
    -- Owner info
    u.id AS owner_user_id,
    u.email AS owner_email,
    u.full_name AS owner_name,
    u.phone AS owner_phone,
    -- Days waiting
    EXTRACT(DAY FROM (NOW() - o.created_at))::INTEGER AS days_waiting
FROM organizations o
LEFT JOIN subscriptions s ON s.organization_id = o.id
LEFT JOIN plans p ON p.id = s.plan_id
LEFT JOIN organization_members om ON om.organization_id = o.id AND om.role = 'owner'
LEFT JOIN users u ON u.id = om.user_id
WHERE o.status = 'pending'
   OR s.status = 'pending'
ORDER BY o.created_at ASC;

-- Comments
COMMENT ON VIEW pending_activations IS 'Super Admin icin bekleyen aktivasyonlar. Odeme bekleyen organizasyonlar ve abonelikleri listeler.';
