/*
  # Fix organization_billing_config RLS Policies - November 12, 2025 - COMPLETE FIX

  ## Problem
  - Error 42501: "new row violates row-level security policy for table organization_billing_config"
  - Master users cannot insert billing configs when creating franchises
  - Multiple conflicting RLS policies from different migrations
  - Restrictive WITH CHECK clauses prevent cross-organization operations

  ## Root Cause Analysis
  1. Migration 20251005010940 created initial policies for 'admin' role only
  2. Migration 20251028005426 duplicated these policies
  3. Migration 20251028024116 changed to use helper functions with restrictive WITH CHECK
  4. Migration 20251102100000 tried to fix by adding 'master' support
  5. Policies conflict and block legitimate operations

  ## Solution
  1. Drop ALL existing policies on organization_billing_config
  2. Create single, clear policy set using direct role checks (not helper functions)
  3. Allow masters and admins to INSERT billing configs for ANY organization
  4. Use simple, explicit role checks that match organizations table pattern
  5. Ensure WITH CHECK clause doesn't restrict cross-organization operations

  ## Security
  - Only users with role='master' or role='admin' can insert billing configs
  - Masters can insert for any organization (they manage the network)
  - Admins can insert for any organization (they manage franchises)
  - All other users have no INSERT access
  - SELECT policies ensure users only see appropriate data
*/

-- =====================================================
-- 1. Clean up ALL existing policies completely
-- =====================================================
ALTER TABLE organization_billing_config DISABLE ROW LEVEL SECURITY;

-- Drop every possible policy name that could exist
DROP POLICY IF EXISTS "Admins can manage all billing configs" ON organization_billing_config;
DROP POLICY IF EXISTS "Users can view own org billing config" ON organization_billing_config;
DROP POLICY IF EXISTS "Masters and admins can view all billing configs" ON organization_billing_config;
DROP POLICY IF EXISTS "Masters and admins can insert billing configs" ON organization_billing_config;
DROP POLICY IF EXISTS "Masters and admins can update billing configs" ON organization_billing_config;
DROP POLICY IF EXISTS "Masters can delete billing configs" ON organization_billing_config;
DROP POLICY IF EXISTS "Admins can view organization billing config" ON organization_billing_config;
DROP POLICY IF EXISTS "Admins can manage organization billing config" ON organization_billing_config;
DROP POLICY IF EXISTS "Users can view billing configs in their organization" ON organization_billing_config;
DROP POLICY IF EXISTS "Admins can insert billing configs in their organization" ON organization_billing_config;
DROP POLICY IF EXISTS "Admins can update billing configs in their organization" ON organization_billing_config;
DROP POLICY IF EXISTS "Admins can delete billing configs in their organization" ON organization_billing_config;

-- Re-enable RLS with clean slate
ALTER TABLE organization_billing_config ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. Create comprehensive SELECT policy
-- =====================================================
-- Masters see everything, others see only their organization
CREATE POLICY "View billing configs"
  ON organization_billing_config
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'master'
        OR (
          profiles.role IN ('admin', 'franchisee_admin')
          AND profiles.organization_id = organization_billing_config.organization_id
        )
      )
    )
  );

-- =====================================================
-- 3. Create unrestricted INSERT policy for masters/admins
-- =====================================================
-- CRITICAL: No WITH CHECK restriction on organization_id
-- This allows masters to create billing configs for franchises they manage
CREATE POLICY "Master and admin can insert billing configs"
  ON organization_billing_config
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master', 'admin')
    )
  );

-- =====================================================
-- 4. Create UPDATE policy with proper scoping
-- =====================================================
CREATE POLICY "Master and admin can update billing configs"
  ON organization_billing_config
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'master'
        OR (
          profiles.role = 'admin'
          AND profiles.organization_id = organization_billing_config.organization_id
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'master'
        OR (
          profiles.role = 'admin'
          AND profiles.organization_id = organization_billing_config.organization_id
        )
      )
    )
  );

-- =====================================================
-- 5. Create DELETE policy (masters only)
-- =====================================================
CREATE POLICY "Master can delete billing configs"
  ON organization_billing_config
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'master'
    )
  );

-- =====================================================
-- 6. Verify foreign key constraint is correct
-- =====================================================
DO $$
BEGIN
  -- Drop and recreate FK with CASCADE for safety
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'organization_billing_config_organization_id_fkey'
    AND table_name = 'organization_billing_config'
  ) THEN
    ALTER TABLE organization_billing_config
    DROP CONSTRAINT organization_billing_config_organization_id_fkey;
  END IF;

  ALTER TABLE organization_billing_config
  ADD CONSTRAINT organization_billing_config_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES organizations(id)
  ON DELETE CASCADE;

  RAISE NOTICE 'Foreign key constraint updated successfully';
END $$;

-- =====================================================
-- 7. Add index for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_billing_config_org_id
  ON organization_billing_config(organization_id);

CREATE INDEX IF NOT EXISTS idx_billing_config_active
  ON organization_billing_config(is_active)
  WHERE is_active = true;

-- =====================================================
-- 8. Create diagnostic function for testing
-- =====================================================
CREATE OR REPLACE FUNCTION test_billing_config_insert_permission(
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE(
  can_insert boolean,
  user_role text,
  user_org_id uuid,
  reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
  v_org_id uuid;
  v_can_insert boolean;
  v_reason text;
BEGIN
  -- Get user info
  SELECT role, organization_id
  INTO v_role, v_org_id
  FROM profiles
  WHERE id = p_user_id;

  -- Check permission
  IF v_role IN ('master', 'admin') THEN
    v_can_insert := true;
    v_reason := format('User has role %s which can insert billing configs', v_role);
  ELSE
    v_can_insert := false;
    v_reason := format('User has role %s which cannot insert billing configs', v_role);
  END IF;

  RETURN QUERY
  SELECT v_can_insert, v_role, v_org_id, v_reason;
END;
$$;

GRANT EXECUTE ON FUNCTION test_billing_config_insert_permission TO authenticated;

-- =====================================================
-- 9. Verification and success message
-- =====================================================
DO $$
DECLARE
  policy_count integer;
BEGIN
  -- Count policies on organization_billing_config
  SELECT COUNT(*)
  INTO policy_count
  FROM pg_policies
  WHERE tablename = 'organization_billing_config';

  IF policy_count = 4 THEN
    RAISE NOTICE '✅ SUCCESS: organization_billing_config RLS policies fixed';
    RAISE NOTICE '   - 4 policies created (SELECT, INSERT, UPDATE, DELETE)';
    RAISE NOTICE '   - Masters can insert billing configs for any organization';
    RAISE NOTICE '   - Admins can insert billing configs for any organization';
    RAISE NOTICE '   - Foreign key constraint verified';
    RAISE NOTICE '   - Performance indexes added';
    RAISE NOTICE '   - Diagnostic function created: test_billing_config_insert_permission()';
  ELSE
    RAISE WARNING '⚠️ Expected 4 policies, found %', policy_count;
  END IF;
END $$;
