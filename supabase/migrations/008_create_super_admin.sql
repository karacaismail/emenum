-- Migration: 008_create_super_admin
-- Description: Creates or updates super admin user with email boraydeger@hotmail.com
-- Created: 2026-01-13
--
-- This migration ensures that a super admin user exists with the specified email.
-- If the user already exists, it updates their app_metadata to set is_super_admin = true.
-- If the user doesn't exist, it provides instructions for manual creation.
--
-- IMPORTANT: Direct INSERT into auth.users is not recommended in Supabase.
-- This script handles the update case and provides instructions for creation.

-- ============================================================================
-- SUPER ADMIN USER SETUP
-- ============================================================================

-- Function to update or create super admin user
CREATE OR REPLACE FUNCTION ensure_super_admin_user()
RETURNS TEXT AS $$
DECLARE
    v_user_exists BOOLEAN;
    v_user_id UUID;
    v_result TEXT;
    v_current_metadata JSONB;
BEGIN
    -- Check if user with this email already exists
    SELECT EXISTS(
        SELECT 1 FROM auth.users WHERE email = 'boraydeger@hotmail.com'
    ) INTO v_user_exists;

    IF v_user_exists THEN
        -- Get current metadata
        SELECT raw_app_meta_data INTO v_current_metadata
        FROM auth.users
        WHERE email = 'boraydeger@hotmail.com';

        -- User exists, update app_metadata to ensure super admin status
        UPDATE auth.users
        SET raw_app_meta_data = COALESCE(v_current_metadata, '{}'::jsonb) || 
            jsonb_build_object('is_super_admin', true),
        updated_at = now()
        WHERE email = 'boraydeger@hotmail.com'
        RETURNING id INTO v_user_id;

        v_result := format('Super admin status updated for user: boraydeger@hotmail.com (ID: %s). Metadata: %s', 
                          v_user_id, 
                          (SELECT raw_app_meta_data FROM auth.users WHERE id = v_user_id)::text);
        RETURN v_result;
    ELSE
        -- User doesn't exist - provide instructions
        v_result := 'User boraydeger@hotmail.com does not exist. ' ||
                   'Please create the user via Supabase Dashboard (Authentication > Users > Add User) ' ||
                   'or use Supabase Admin API, then run this migration again.';
        RETURN v_result;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the function
SELECT ensure_super_admin_user();

-- Clean up the function (optional, can be kept for future use)
-- DROP FUNCTION IF EXISTS ensure_super_admin_user();

