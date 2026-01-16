-- Migration: 007_rls_policies (FIXED)
-- Description: Create Row Level Security (RLS) policies for all tenant-scoped tables

-- ============================================================================
-- ENABLE RLS ON ALL TENANT-SCOPED TABLES
-- ============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- HELPER FUNCTION: Check if current user is super admin
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(
        (auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean,
        false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_super_admin() IS 'Check if current user is a super admin based on app_metadata';

-- ============================================================================
-- HELPER FUNCTION: Check if user is member of organization
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = org_id
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_org_member(UUID) IS 'Check if current user is a member of the given organization';


-- ============================================================================
-- HELPER FUNCTION: Get all organization IDs for current user
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_org_ids()
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.user_org_ids() IS 'Get all organization IDs the current user belongs to';


-- ============================================================================
-- POLICY 1: ORGANIZATIONS - SELECT
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own organizations" ON organizations;

CREATE POLICY "Users can view own organizations"
ON organizations FOR SELECT
USING (
    public.is_super_admin() OR
    id IN (SELECT public.user_org_ids())
);

COMMENT ON POLICY "Users can view own organizations" ON organizations
IS 'Users can only see organizations they belong to';

-- ============================================================================
-- POLICY 1B: ORGANIZATIONS - INSERT (for new user registration)
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;

CREATE POLICY "Authenticated users can create organizations"
ON organizations FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL  -- Any authenticated user can create an organization
);

COMMENT ON POLICY "Authenticated users can create organizations" ON organizations
IS 'Authenticated users can create new organizations during registration';


-- ============================================================================
-- POLICY 2: ORGANIZATION_MEMBERS - SELECT
-- ============================================================================

DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;

CREATE POLICY "Users can view members of their organizations"
ON organization_members FOR SELECT
USING (
    public.is_super_admin() OR
    organization_id IN (SELECT public.user_org_ids())
);

COMMENT ON POLICY "Users can view members of their organizations" ON organization_members
IS 'Users can see all members of organizations they belong to';

-- ============================================================================
-- POLICY 2B: ORGANIZATION_MEMBERS - INSERT (for new user registration)
-- ============================================================================

DROP POLICY IF EXISTS "Users can add themselves to organizations" ON organization_members;

CREATE POLICY "Users can add themselves to organizations"
ON organization_members FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()  -- Users can only add themselves
);

COMMENT ON POLICY "Users can add themselves to organizations" ON organization_members
IS 'Users can add themselves as members when creating a new organization during registration';


-- ============================================================================
-- POLICY 3: CATEGORIES - ALL OPERATIONS
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage categories in their organizations" ON categories;

CREATE POLICY "Users can manage categories in their organizations"
ON categories FOR ALL
USING (
    public.is_super_admin() OR
    organization_id IN (SELECT public.user_org_ids())
)
WITH CHECK (
    public.is_super_admin() OR
    organization_id IN (SELECT public.user_org_ids())
);

COMMENT ON POLICY "Users can manage categories in their organizations" ON categories
IS 'Full CRUD access to categories for organization members';


-- ============================================================================
-- POLICY 4: PRODUCTS - ALL OPERATIONS
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage products in their organizations" ON products;

CREATE POLICY "Users can manage products in their organizations"
ON products FOR ALL
USING (
    public.is_super_admin() OR
    organization_id IN (SELECT public.user_org_ids())
)
WITH CHECK (
    public.is_super_admin() OR
    organization_id IN (SELECT public.user_org_ids())
);

COMMENT ON POLICY "Users can manage products in their organizations" ON products
IS 'Full CRUD access to products for organization members';


-- ============================================================================
-- POLICY 5: PRICE_LEDGER - SELECT AND INSERT ONLY
-- ============================================================================

DROP POLICY IF EXISTS "Users can view and add prices in their organizations" ON price_ledger;

CREATE POLICY "Users can view and add prices in their organizations"
ON price_ledger FOR ALL
USING (
    public.is_super_admin() OR
    product_id IN (
        SELECT id FROM products
        WHERE organization_id IN (SELECT public.user_org_ids())
    )
)
WITH CHECK (
    public.is_super_admin() OR
    product_id IN (
        SELECT id FROM products
        WHERE organization_id IN (SELECT public.user_org_ids())
    )
);

COMMENT ON POLICY "Users can view and add prices in their organizations" ON price_ledger
IS 'View and insert price entries for products in member organizations (UPDATE/DELETE blocked by trigger)';


-- ============================================================================
-- POLICY 6: RESTAURANT_TABLES - ALL OPERATIONS
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage tables in their organizations" ON restaurant_tables;

CREATE POLICY "Users can manage tables in their organizations"
ON restaurant_tables FOR ALL
USING (
    public.is_super_admin() OR
    organization_id IN (SELECT public.user_org_ids())
)
WITH CHECK (
    public.is_super_admin() OR
    organization_id IN (SELECT public.user_org_ids())
);

COMMENT ON POLICY "Users can manage tables in their organizations" ON restaurant_tables
IS 'Full CRUD access to restaurant tables for organization members';


-- ============================================================================
-- POLICY 7: SERVICE_REQUESTS - ALL OPERATIONS
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage service requests in their organizations" ON service_requests;

CREATE POLICY "Users can manage service requests in their organizations"
ON service_requests FOR ALL
USING (
    public.is_super_admin() OR
    organization_id IN (SELECT public.user_org_ids())
)
WITH CHECK (
    public.is_super_admin() OR
    organization_id IN (SELECT public.user_org_ids())
);

COMMENT ON POLICY "Users can manage service requests in their organizations" ON service_requests
IS 'Full CRUD access to service requests for organization members';


-- ============================================================================
-- POLICY 8: MENU_SNAPSHOTS - ALL OPERATIONS
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage menu snapshots in their organizations" ON menu_snapshots;

CREATE POLICY "Users can manage menu snapshots in their organizations"
ON menu_snapshots FOR ALL
USING (
    public.is_super_admin() OR
    organization_id IN (SELECT public.user_org_ids())
)
WITH CHECK (
    public.is_super_admin() OR
    organization_id IN (SELECT public.user_org_ids())
);

COMMENT ON POLICY "Users can manage menu snapshots in their organizations" ON menu_snapshots
IS 'Full CRUD access to menu snapshots for organization members';


-- ============================================================================
-- POLICY 9: AUDIT_LOGS - SELECT ONLY
-- ============================================================================

DROP POLICY IF EXISTS "Users can view audit logs for their organizations" ON audit_logs;

CREATE POLICY "Users can view audit logs for their organizations"
ON audit_logs FOR SELECT
USING (
    public.is_super_admin() OR
    organization_id IN (SELECT public.user_org_ids())
    OR organization_id IS NULL
);

COMMENT ON POLICY "Users can view audit logs for their organizations" ON audit_logs
IS 'Users can view audit logs for their organizations (INSERT via service role only)';


-- ============================================================================
-- POLICY 10: SUBSCRIPTIONS - SELECT ONLY
-- ============================================================================

DROP POLICY IF EXISTS "Users can view subscriptions for their organizations" ON subscriptions;

CREATE POLICY "Users can view subscriptions for their organizations"
ON subscriptions FOR SELECT
USING (
    public.is_super_admin() OR
    organization_id IN (SELECT public.user_org_ids())
);

COMMENT ON POLICY "Users can view subscriptions for their organizations" ON subscriptions
IS 'Users can view their organization subscription (management via super admin only)';


-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE organizations IS 'RLS: Members can view their own organizations';
COMMENT ON TABLE organization_members IS 'RLS: Members can view membership of their organizations';
COMMENT ON TABLE categories IS 'RLS: Members have full CRUD on their organization categories';
COMMENT ON TABLE products IS 'RLS: Members have full CRUD on their organization products';
COMMENT ON TABLE price_ledger IS 'RLS: Members can view/insert prices (UPDATE/DELETE blocked by trigger)';
COMMENT ON TABLE restaurant_tables IS 'RLS: Members have full CRUD on their organization tables';
COMMENT ON TABLE service_requests IS 'RLS: Members have full CRUD on their organization service requests';
COMMENT ON TABLE menu_snapshots IS 'RLS: Members have full CRUD on their organization snapshots';
COMMENT ON TABLE audit_logs IS 'RLS: Members can view their organization audit logs (INSERT via service role)';
COMMENT ON TABLE subscriptions IS 'RLS: Members can view their organization subscriptions (management via admin)';