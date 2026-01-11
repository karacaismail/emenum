-- ============================================================================
-- 010_migrate_existing_organizations.sql
-- Data migration: Create default locations for existing organizations
-- Ensures all organizations have at least one location for multi-location support
-- ============================================================================

-- ============================================================================
-- DATA MIGRATION: Create default locations for existing organizations
-- Mevcut organizasyonlar için varsayılan lokasyon oluşturma
-- ============================================================================

-- Insert a default location for each organization that doesn't have any locations yet
-- Henüz lokasyonu olmayan her organization için "Merkez" (Main) lokasyonu oluşturur

INSERT INTO locations (
    organization_id,
    name,
    slug,
    address,
    city,
    phone,
    email,
    is_active,
    created_at,
    updated_at
)
SELECT
    o.id AS organization_id,
    o.name || ' - Merkez' AS name,           -- Default name: "OrgName - Merkez" (Main Branch)
    'main' AS slug,                           -- Simple, universal slug
    o.address AS address,                     -- Copy address from organization
    NULL AS city,                             -- City not available in organizations table
    o.phone AS phone,                         -- Copy phone from organization
    o.email AS email,                         -- Copy email from organization
    true AS is_active,                        -- Active by default
    NOW() AS created_at,
    NOW() AS updated_at
FROM organizations o
WHERE NOT EXISTS (
    -- Only create for organizations without any locations
    SELECT 1
    FROM locations l
    WHERE l.organization_id = o.id
);

-- ============================================================================
-- NOTES ON PRODUCT MIGRATION
-- ============================================================================
-- Existing products are NOT migrated to specific locations.
-- Products with location_id = NULL are organization-level products
-- (available at all locations). This maintains backward compatibility.
--
-- Mevcut ürünler lokasyona atanmaz. location_id = NULL olan ürünler
-- tüm lokasyonlarda geçerli organization-level ürünlerdir.
-- Bu, mevcut menülerin çalışmaya devam etmesini sağlar.
-- ============================================================================

-- ============================================================================
-- VERIFICATION QUERIES (for manual verification)
-- Doğrulama sorguları (manuel kontrol için)
-- ============================================================================

-- These can be run to verify the migration:
--
-- 1. Check all organizations have at least one location:
--    SELECT o.id, o.name, o.slug, COUNT(l.id) as location_count
--    FROM organizations o
--    LEFT JOIN locations l ON l.organization_id = o.id
--    GROUP BY o.id, o.name, o.slug
--    HAVING COUNT(l.id) = 0;
--    -- Should return 0 rows (all orgs have locations)
--
-- 2. Compare organization and location counts:
--    SELECT
--        (SELECT COUNT(*) FROM organizations) as org_count,
--        (SELECT COUNT(*) FROM locations) as location_count;
--    -- location_count should be >= org_count
--
-- 3. Verify default locations were created correctly:
--    SELECT l.*, o.name as org_name
--    FROM locations l
--    JOIN organizations o ON l.organization_id = o.id
--    WHERE l.slug = 'main'
--    ORDER BY l.created_at DESC;

COMMENT ON TABLE locations IS 'Organization''a ait fiziksel lokasyonlar. Her organization en az bir varsayılan ''main'' lokasyonuna sahiptir.';
