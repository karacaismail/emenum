-- Migration: 009_super_admin_rls_policies
-- Description: Add RLS policies to allow super admin users to access all data
-- Created: 2026-01-13
--
-- This migration adds super admin bypass policies to all RLS-protected tables.
-- Super admin users (identified by app_metadata.is_super_admin = true) can
-- access all data regardless of organization membership.

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
-- SUPER ADMIN POLICIES: Allow super admin to bypass RLS
-- ============================================================================

-- Organizations: Super admin can view all
DROP POLICY IF EXISTS "Super admin can view all organizations" ON organizations;
CREATE POLICY "Super admin can view all organizations"
ON organizations FOR SELECT
USING (public.is_super_admin());

-- Organizations: Super admin can manage all
DROP POLICY IF EXISTS "Super admin can manage all organizations" ON organizations;
CREATE POLICY "Super admin can manage all organizations"
ON organizations FOR ALL
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Organization Members: Super admin can view all
DROP POLICY IF EXISTS "Super admin can view all members" ON organization_members;
CREATE POLICY "Super admin can view all members"
ON organization_members FOR SELECT
USING (public.is_super_admin());

-- Organization Members: Super admin can manage all
DROP POLICY IF EXISTS "Super admin can manage all members" ON organization_members;
CREATE POLICY "Super admin can manage all members"
ON organization_members FOR ALL
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Categories: Super admin can view all
DROP POLICY IF EXISTS "Super admin can view all categories" ON categories;
CREATE POLICY "Super admin can view all categories"
ON categories FOR SELECT
USING (public.is_super_admin());

-- Categories: Super admin can manage all
DROP POLICY IF EXISTS "Super admin can manage all categories" ON categories;
CREATE POLICY "Super admin can manage all categories"
ON categories FOR ALL
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Products: Super admin can view all
DROP POLICY IF EXISTS "Super admin can view all products" ON products;
CREATE POLICY "Super admin can view all products"
ON products FOR SELECT
USING (public.is_super_admin());

-- Products: Super admin can manage all
DROP POLICY IF EXISTS "Super admin can manage all products" ON products;
CREATE POLICY "Super admin can manage all products"
ON products FOR ALL
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Price Ledger: Super admin can view all
DROP POLICY IF EXISTS "Super admin can view all prices" ON price_ledger;
CREATE POLICY "Super admin can view all prices"
ON price_ledger FOR SELECT
USING (public.is_super_admin());

-- Restaurant Tables: Super admin can view all
DROP POLICY IF EXISTS "Super admin can view all tables" ON restaurant_tables;
CREATE POLICY "Super admin can view all tables"
ON restaurant_tables FOR SELECT
USING (public.is_super_admin());

-- Restaurant Tables: Super admin can manage all
DROP POLICY IF EXISTS "Super admin can manage all tables" ON restaurant_tables;
CREATE POLICY "Super admin can manage all tables"
ON restaurant_tables FOR ALL
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Service Requests: Super admin can view all
DROP POLICY IF EXISTS "Super admin can view all service requests" ON service_requests;
CREATE POLICY "Super admin can view all service requests"
ON service_requests FOR SELECT
USING (public.is_super_admin());

-- Service Requests: Super admin can manage all
DROP POLICY IF EXISTS "Super admin can manage all service requests" ON service_requests;
CREATE POLICY "Super admin can manage all service requests"
ON service_requests FOR ALL
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Menu Snapshots: Super admin can view all
DROP POLICY IF EXISTS "Super admin can view all snapshots" ON menu_snapshots;
CREATE POLICY "Super admin can view all snapshots"
ON menu_snapshots FOR SELECT
USING (public.is_super_admin());

-- Menu Snapshots: Super admin can manage all
DROP POLICY IF EXISTS "Super admin can manage all snapshots" ON menu_snapshots;
CREATE POLICY "Super admin can manage all snapshots"
ON menu_snapshots FOR ALL
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Audit Logs: Super admin can view all
DROP POLICY IF EXISTS "Super admin can view all audit logs" ON audit_logs;
CREATE POLICY "Super admin can view all audit logs"
ON audit_logs FOR SELECT
USING (public.is_super_admin());

-- Subscriptions: Super admin can view all
DROP POLICY IF EXISTS "Super admin can view all subscriptions" ON subscriptions;
CREATE POLICY "Super admin can view all subscriptions"
ON subscriptions FOR SELECT
USING (public.is_super_admin());

-- Subscriptions: Super admin can manage all
DROP POLICY IF EXISTS "Super admin can manage all subscriptions" ON subscriptions;
CREATE POLICY "Super admin can manage all subscriptions"
ON subscriptions FOR ALL
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Plans: Super admin can view all (plans table might not have RLS, but adding for completeness)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'plans') THEN
        -- Check if RLS is enabled
        IF EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname = 'plans' AND n.nspname = 'public' AND c.relrowsecurity = true
        ) THEN
            DROP POLICY IF EXISTS "Super admin can view all plans" ON plans;
            CREATE POLICY "Super admin can view all plans"
            ON plans FOR SELECT
            USING (public.is_super_admin());

            DROP POLICY IF EXISTS "Super admin can manage all plans" ON plans;
            CREATE POLICY "Super admin can manage all plans"
            ON plans FOR ALL
            USING (public.is_super_admin())
            WITH CHECK (public.is_super_admin());
        END IF;
    END IF;
END $$;

COMMENT ON POLICY "Super admin can view all organizations" ON organizations
IS 'Super admin users can view all organizations regardless of membership';
COMMENT ON POLICY "Super admin can manage all organizations" ON organizations
IS 'Super admin users can manage all organizations';

