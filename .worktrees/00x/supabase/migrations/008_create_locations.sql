-- ============================================================================
-- 008_create_locations.sql
-- Multi-location support for organizations (franchise/chain restaurants)
-- Tables: locations
-- ============================================================================

-- ============================================================================
-- LOCATIONS TABLE
-- Organization'a ait fiziksel lokasyonlar (şubeler)
-- ============================================================================

CREATE TABLE locations (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign keys
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Basic info
    name TEXT NOT NULL,
    slug TEXT NOT NULL,

    -- Contact info
    address TEXT,
    city TEXT,
    phone TEXT,
    email TEXT,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    -- Slug organization içinde benzersiz olmalı
    CONSTRAINT locations_unique_slug_per_org UNIQUE (organization_id, slug),
    CONSTRAINT locations_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' OR slug ~ '^[a-z0-9]$'),
    CONSTRAINT locations_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
    CONSTRAINT locations_slug_length CHECK (char_length(slug) >= 1 AND char_length(slug) <= 50),
    CONSTRAINT locations_email_format CHECK (email IS NULL OR email ~ '^[^@]+@[^@]+\.[^@]+$')
);

-- Indexes for locations
CREATE INDEX idx_locations_organization_id ON locations (organization_id);
CREATE INDEX idx_locations_slug ON locations (organization_id, slug);
CREATE INDEX idx_locations_active ON locations (organization_id, is_active) WHERE is_active = true;
CREATE INDEX idx_locations_city ON locations (city) WHERE city IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER trigger_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE locations IS 'Organization''a ait fiziksel lokasyonlar. Franchise ve zincir restoranlar için çoklu şube desteği.';
COMMENT ON COLUMN locations.organization_id IS 'Bu lokasyonun ait olduğu organization. Her lokasyon bir organization''a bağlıdır.';
COMMENT ON COLUMN locations.slug IS 'URL-friendly benzersiz tanımlayıcı. Organization içinde benzersiz olmalı. Menü URL''lerinde kullanılır: /menu/{org-slug}/{location-slug}';
COMMENT ON COLUMN locations.name IS 'Lokasyon adı (örn: "Kadıköy Şubesi", "Merkez", "Downtown Branch")';
COMMENT ON COLUMN locations.address IS 'Lokasyonun tam adresi';
COMMENT ON COLUMN locations.city IS 'Lokasyonun bulunduğu şehir';
COMMENT ON COLUMN locations.phone IS 'Lokasyona ait telefon numarası';
COMMENT ON COLUMN locations.email IS 'Lokasyona ait e-posta adresi';
COMMENT ON COLUMN locations.is_active IS 'false yapılarak lokasyon gizlenebilir (silmeden). Soft delete için kullanılır.';

-- ============================================================================
-- HELPER FUNCTION: Get location by organization and location slugs
-- ============================================================================

CREATE OR REPLACE FUNCTION get_location_by_slugs(
    org_slug TEXT,
    loc_slug TEXT
)
RETURNS TABLE (
    location_id UUID,
    location_name TEXT,
    location_slug TEXT,
    org_id UUID,
    org_name TEXT,
    org_slug TEXT
) AS $$
    SELECT
        l.id AS location_id,
        l.name AS location_name,
        l.slug AS location_slug,
        o.id AS org_id,
        o.name AS org_name,
        o.slug AS org_slug
    FROM locations l
    INNER JOIN organizations o ON l.organization_id = o.id
    WHERE o.slug = $1
      AND l.slug = $2
      AND l.is_active = true
      AND o.status = 'active';
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_location_by_slugs IS 'Organization ve location slug''ları ile lokasyon bilgilerini getirir. RLS politikalarında ve sorgularda kullanılır.';

-- ============================================================================
-- HELPER FUNCTION: Get all active locations for an organization
-- ============================================================================

CREATE OR REPLACE FUNCTION get_organization_locations(org_uuid UUID)
RETURNS SETOF locations AS $$
    SELECT *
    FROM locations
    WHERE organization_id = org_uuid
      AND is_active = true
    ORDER BY name;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_organization_locations IS 'Bir organization''ın tüm aktif lokasyonlarını döner.';
