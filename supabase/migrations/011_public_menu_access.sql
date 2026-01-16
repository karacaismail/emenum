-- ============================================================================
-- PUBLIC MENU ACCESS POLICIES
-- ============================================================================
-- This migration adds public read access to menu data for active organizations.
-- This allows public menu pages (/menu/[slug]) to display menu information
-- without requiring authentication.
--
-- Security: Only active organizations' data is accessible publicly.
-- ============================================================================

-- ============================================================================
-- PUBLIC POLICY 1: ORGANIZATIONS - SELECT (for active organizations only)
-- ============================================================================

DROP POLICY IF EXISTS "Public can view active organizations" ON organizations;

CREATE POLICY "Public can view active organizations"
ON organizations FOR SELECT
USING (is_active = true);

COMMENT ON POLICY "Public can view active organizations" ON organizations
IS 'Public can view active organizations for menu pages';

-- ============================================================================
-- PUBLIC POLICY 2: CATEGORIES - SELECT (for active organizations only)
-- ============================================================================

DROP POLICY IF EXISTS "Public can view categories of active organizations" ON categories;

CREATE POLICY "Public can view categories of active organizations"
ON categories FOR SELECT
USING (
    is_visible = true AND
    organization_id IN (
        SELECT id FROM organizations WHERE is_active = true
    )
);

COMMENT ON POLICY "Public can view categories of active organizations" ON categories
IS 'Public can view visible categories of active organizations for menu pages';

-- ============================================================================
-- PUBLIC POLICY 3: PRODUCTS - SELECT (for active organizations only)
-- ============================================================================

DROP POLICY IF EXISTS "Public can view products of active organizations" ON products;

CREATE POLICY "Public can view products of active organizations"
ON products FOR SELECT
USING (
    is_visible = true AND
    organization_id IN (
        SELECT id FROM organizations WHERE is_active = true
    )
);

COMMENT ON POLICY "Public can view products of active organizations" ON products
IS 'Public can view visible products of active organizations for menu pages';

-- ============================================================================
-- PUBLIC POLICY 4: PRICE_LEDGER - SELECT (for active organizations only)
-- ============================================================================
-- Note: current_prices is a view based on price_ledger.
-- We need to allow public access to price_ledger for the view to work.

DROP POLICY IF EXISTS "Public can view prices of active organizations" ON price_ledger;

CREATE POLICY "Public can view prices of active organizations"
ON price_ledger FOR SELECT
USING (
    product_id IN (
        SELECT p.id FROM products p
        INNER JOIN organizations o ON p.organization_id = o.id
        WHERE p.is_visible = true AND o.is_active = true
    )
);

COMMENT ON POLICY "Public can view prices of active organizations" ON price_ledger
IS 'Public can view price history of visible products from active organizations for menu pages (used by current_prices view)';

-- ============================================================================
-- PUBLIC POLICY 5: MENU_SNAPSHOTS - SELECT (for active organizations only)
-- ============================================================================

DROP POLICY IF EXISTS "Public can view menu snapshots of active organizations" ON menu_snapshots;

CREATE POLICY "Public can view menu snapshots of active organizations"
ON menu_snapshots FOR SELECT
USING (
    organization_id IN (
        SELECT id FROM organizations WHERE is_active = true
    )
);

COMMENT ON POLICY "Public can view menu snapshots of active organizations" ON menu_snapshots
IS 'Public can view menu snapshots of active organizations for menu pages';

