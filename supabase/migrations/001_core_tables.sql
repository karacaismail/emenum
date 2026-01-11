-- ============================================================================
-- 001_core_tables.sql
-- Core tables for multi-tenant organization management
-- Tables: organizations, organization_members, categories
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Organization status enum
-- pending: Yeni kayıt, ödeme bekleniyor
-- active: Aktif abonelik
-- suspended: Ödeme gecikmesi veya kural ihlali nedeniyle askıya alınmış
-- cancelled: Abonelik iptal edilmiş
CREATE TYPE organization_status AS ENUM ('pending', 'active', 'suspended', 'cancelled');

-- Organization member role enum (RBAC)
-- owner: Tam yetki, organizasyonu silme dahil
-- admin: Tam yetki, organizasyonu silme hariç
-- manager: Ürün/kategori/masa yönetimi
-- waiter: Sadece servis isteklerini görüntüleme/yanıtlama
-- viewer: Sadece okuma yetkisi
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'manager', 'waiter', 'viewer');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Trigger function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- USERS TABLE (Profile data extending auth.users)
-- ============================================================================

CREATE TABLE users (
    -- Primary key references auth.users
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Profile info
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,

    -- Super admin flag for platform-wide administration
    is_super_admin BOOLEAN NOT NULL DEFAULT false,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_super_admin ON users (is_super_admin) WHERE is_super_admin = true;

-- Trigger for updated_at
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE users IS 'Kullanıcı profil bilgileri. auth.users tablosunu genişletir.';
COMMENT ON COLUMN users.is_super_admin IS 'Platform yöneticisi bayrağı. Super admin tüm organizasyonlara erişebilir.';

-- ============================================================================
-- ORGANIZATIONS TABLE
-- Multi-tenant işletmeler
-- ============================================================================

CREATE TABLE organizations (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Basic info
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,

    -- Branding
    logo_url TEXT,
    cover_image_url TEXT,           -- Sayfa üst %20'lik alan
    background_color TEXT,          -- Hex renk kodu (Premium özellik)

    -- Contact info
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,

    -- Social media
    instagram_url TEXT,
    facebook_url TEXT,
    twitter_url TEXT,

    -- Status
    status organization_status NOT NULL DEFAULT 'pending',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT organizations_slug_unique UNIQUE (slug),
    CONSTRAINT organizations_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' OR slug ~ '^[a-z0-9]$'),
    CONSTRAINT organizations_name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 100),
    CONSTRAINT organizations_slug_length CHECK (char_length(slug) >= 2 AND char_length(slug) <= 50),
    CONSTRAINT organizations_email_format CHECK (email IS NULL OR email ~ '^[^@]+@[^@]+\.[^@]+$'),
    CONSTRAINT organizations_background_color_format CHECK (background_color IS NULL OR background_color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Indexes for organizations
CREATE INDEX idx_organizations_slug ON organizations (slug);
CREATE INDEX idx_organizations_status ON organizations (status);
CREATE INDEX idx_organizations_created_at ON organizations (created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER trigger_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE organizations IS 'Multi-tenant işletmeler. Her restoran/kafe bir organization olarak temsil edilir.';
COMMENT ON COLUMN organizations.slug IS 'URL-friendly benzersiz tanımlayıcı. Menü URL''leri için kullanılır: /menu/{slug}';
COMMENT ON COLUMN organizations.cover_image_url IS 'Menü sayfasının üst %20''lik alanında gösterilecek kapak resmi';
COMMENT ON COLUMN organizations.background_color IS 'Premium özellik: Özel arka plan rengi (hex format)';
COMMENT ON COLUMN organizations.status IS 'pending: Ödeme bekleniyor, active: Aktif, suspended: Askıya alınmış, cancelled: İptal';

-- ============================================================================
-- ORGANIZATION MEMBERS TABLE
-- Kullanıcı-Organization ilişkisi (RBAC)
-- ============================================================================

CREATE TABLE organization_members (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign keys
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Role-Based Access Control
    role member_role NOT NULL DEFAULT 'viewer',

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints: Bir kullanıcı aynı organizasyonda tek bir üyeliğe sahip olabilir
    CONSTRAINT organization_members_unique_membership UNIQUE (organization_id, user_id)
);

-- Indexes for organization_members
CREATE INDEX idx_organization_members_organization_id ON organization_members (organization_id);
CREATE INDEX idx_organization_members_user_id ON organization_members (user_id);
CREATE INDEX idx_organization_members_role ON organization_members (role);
CREATE INDEX idx_organization_members_active ON organization_members (organization_id, is_active) WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER trigger_organization_members_updated_at
    BEFORE UPDATE ON organization_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE organization_members IS 'Kullanıcı-Organization ilişkisi. RBAC (Role-Based Access Control) ile yetkilendirme.';
COMMENT ON COLUMN organization_members.role IS 'owner: Tam yetki, admin: Silme hariç tam yetki, manager: Ürün/masa yönetimi, waiter: Servis istekleri, viewer: Sadece okuma';
COMMENT ON COLUMN organization_members.is_active IS 'false yapılarak üyelik askıya alınabilir (silmeden)';

-- ============================================================================
-- CATEGORIES TABLE
-- Ürün kategorileri
-- ============================================================================

CREATE TABLE categories (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign keys
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Category info
    name TEXT NOT NULL,
    description TEXT,

    -- Display order
    sort_order INTEGER NOT NULL DEFAULT 0,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints: Aynı organizasyonda aynı isimde kategori olamaz
    CONSTRAINT categories_unique_name_per_org UNIQUE (organization_id, name),
    CONSTRAINT categories_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100)
);

-- Indexes for categories
CREATE INDEX idx_categories_organization_id ON categories (organization_id);
CREATE INDEX idx_categories_sort_order ON categories (organization_id, sort_order);
CREATE INDEX idx_categories_active ON categories (organization_id, is_active) WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER trigger_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE categories IS 'Ürün kategorileri. Her organization kendi kategorilerini tanımlar.';
COMMENT ON COLUMN categories.sort_order IS 'Menüde görüntülenme sırası. Küçük değerler önce gösterilir.';
COMMENT ON COLUMN categories.is_active IS 'false yapılarak kategori gizlenebilir (silmeden)';

-- ============================================================================
-- HELPER FUNCTION: Get user's organizations
-- RLS politikalarında kullanılmak üzere
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_organization_ids(user_uuid UUID)
RETURNS SETOF UUID AS $$
    SELECT organization_id
    FROM organization_members
    WHERE user_id = user_uuid AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_user_organization_ids IS 'Kullanıcının aktif üyeliği olan organization ID''lerini döner. RLS politikalarında kullanılır.';

-- ============================================================================
-- HELPER FUNCTION: Check if user has role in organization
-- ============================================================================

CREATE OR REPLACE FUNCTION user_has_role_in_org(
    user_uuid UUID,
    org_id UUID,
    required_roles member_role[]
)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM organization_members
        WHERE user_id = user_uuid
          AND organization_id = org_id
          AND is_active = true
          AND role = ANY(required_roles)
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION user_has_role_in_org IS 'Kullanıcının belirtilen organizasyonda belirtilen rollerden birine sahip olup olmadığını kontrol eder.';

-- ============================================================================
-- HELPER FUNCTION: Get user's role in organization
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_role_in_org(
    user_uuid UUID,
    org_id UUID
)
RETURNS member_role AS $$
    SELECT role
    FROM organization_members
    WHERE user_id = user_uuid
      AND organization_id = org_id
      AND is_active = true
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_user_role_in_org IS 'Kullanıcının belirtilen organizasyondaki rolünü döner. Üyelik yoksa NULL döner.';

-- ============================================================================
-- TRIGGER: Auto-create user profile on auth.users insert
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

COMMENT ON FUNCTION handle_new_user IS 'Yeni auth.users kaydı oluşturulduğunda otomatik olarak users tablosunda profil oluşturur.';

-- ============================================================================
-- HELPER FUNCTION: Check if user is super admin
-- ============================================================================

CREATE OR REPLACE FUNCTION is_super_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        (SELECT is_super_admin FROM users WHERE id = user_uuid),
        false
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_super_admin IS 'Kullanıcının super admin olup olmadığını kontrol eder.';
