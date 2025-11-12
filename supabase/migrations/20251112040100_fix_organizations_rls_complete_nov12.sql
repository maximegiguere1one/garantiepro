/*
  # Fix organizations Table RLS Policies - November 12, 2025 - COMPLETE FIX

  ## Problem
  - Potential RLS policy conflicts on organizations table
  - Multiple migrations have modified the INSERT policy
  - Need to ensure consistency with billing_config policies

  ## Solution
  1. Drop ALL existing policies on organizations
  2. Create single, clear policy set matching billing_config pattern
  3. Use direct role checks (not helper functions)
  4. Ensure masters and admins can create organizations without restrictions

  ## Security
  - Only masters and admins can create organizations
  - Masters can see and modify all organizations
  - Admins can see all organizations (they manage the network)
  - Regular users can only see their own organization
*/

-- =====================================================
-- 1. Clean up ALL existing policies
-- =====================================================
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- Drop every possible policy name
DROP POLICY IF EXISTS "Masters can view all organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can view all organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view own organization" ON organizations;
DROP POLICY IF EXISTS "Masters can insert organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can insert organizations" ON organizations;
DROP POLICY IF EXISTS "Masters can update all organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can update all organizations" ON organizations;
DROP POLICY IF EXISTS "Masters can delete organizations" ON organizations;
DROP POLICY IF EXISTS "Masters and admins can view all organizations" ON organizations;
DROP POLICY IF EXISTS "Masters and admins can create organizations" ON organizations;
DROP POLICY IF EXISTS "Masters and admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Master and admin can insert organizations" ON organizations;
DROP POLICY IF EXISTS "Authenticated admins can create organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can create organizations" ON organizations;

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. Create SELECT policy
-- =====================================================
-- Masters and admins see all, regular users see their own org
CREATE POLICY "View organizations"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role IN ('master', 'admin')
        OR profiles.organization_id = organizations.id
      )
    )
  );

-- =====================================================
-- 3. Create INSERT policy (CRITICAL FIX)
-- =====================================================
-- Masters and admins can create organizations
-- NO WITH CHECK restrictions that could block creation
CREATE POLICY "Master and admin can insert organizations"
  ON organizations
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
-- 4. Create UPDATE policy
-- =====================================================
-- Masters can update any org, admins can update all orgs
CREATE POLICY "Master and admin can update organizations"
  ON organizations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master', 'admin')
    )
  );

-- =====================================================
-- 5. Create DELETE policy
-- =====================================================
-- Only masters can delete organizations
CREATE POLICY "Master can delete organizations"
  ON organizations
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
-- 6. Add indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_organizations_owner_org
  ON organizations(owner_organization_id)
  WHERE owner_organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_type
  ON organizations(type);

CREATE INDEX IF NOT EXISTS idx_organizations_status
  ON organizations(status)
  WHERE status = 'active';

-- =====================================================
-- 7. Create diagnostic function
-- =====================================================
CREATE OR REPLACE FUNCTION test_organization_insert_permission(
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
    v_reason := format('User has role %s which can insert organizations', v_role);
  ELSE
    v_can_insert := false;
    v_reason := format('User has role %s which cannot insert organizations', v_role);
  END IF;

  RETURN QUERY
  SELECT v_can_insert, v_role, v_org_id, v_reason;
END;
$$;

GRANT EXECUTE ON FUNCTION test_organization_insert_permission TO authenticated;

-- =====================================================
-- 8. Verification
-- =====================================================
DO $$
DECLARE
  policy_count integer;
BEGIN
  -- Count policies
  SELECT COUNT(*)
  INTO policy_count
  FROM pg_policies
  WHERE tablename = 'organizations';

  IF policy_count = 4 THEN
    RAISE NOTICE '✅ SUCCESS: organizations RLS policies fixed';
    RAISE NOTICE '   - 4 policies created (SELECT, INSERT, UPDATE, DELETE)';
    RAISE NOTICE '   - Masters and admins can create organizations';
    RAISE NOTICE '   - No restrictive WITH CHECK clauses blocking operations';
    RAISE NOTICE '   - Performance indexes added';
    RAISE NOTICE '   - Diagnostic function created: test_organization_insert_permission()';
  ELSE
    RAISE WARNING '⚠️ Expected 4 policies, found %', policy_count;
  END IF;
END $$;
