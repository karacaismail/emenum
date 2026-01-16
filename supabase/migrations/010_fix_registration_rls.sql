-- Migration: 010_fix_registration_rls
-- Description: Fix RLS policies to allow new user registration
-- Created: 2026-01-13
--
-- This migration adds INSERT policies for organizations and organization_members
-- to allow authenticated users to create organizations during registration.
--
-- IMPORTANT: Run this in Supabase Dashboard > SQL Editor

-- ============================================================================
-- ORGANIZATIONS - INSERT POLICY
-- ============================================================================

-- Drop ALL existing INSERT policies on organizations (to avoid conflicts)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'organizations' 
        AND cmd = 'INSERT'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON organizations', r.policyname);
    END LOOP;
END $$;

-- Create policy to allow authenticated users to create organizations
CREATE POLICY "Authenticated users can create organizations"
ON organizations FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL  -- Any authenticated user can create an organization
);

COMMENT ON POLICY "Authenticated users can create organizations" ON organizations
IS 'Authenticated users can create new organizations during registration';

-- ============================================================================
-- ORGANIZATION_MEMBERS - INSERT POLICY
-- ============================================================================

-- Drop ALL existing INSERT policies on organization_members (to avoid conflicts)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'organization_members' 
        AND cmd = 'INSERT'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON organization_members', r.policyname);
    END LOOP;
END $$;

-- Create policy to allow users to add themselves to organizations
CREATE POLICY "Users can add themselves to organizations"
ON organization_members FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()  -- Users can only add themselves
);

COMMENT ON POLICY "Users can add themselves to organizations" ON organization_members
IS 'Users can add themselves as members when creating a new organization during registration';

