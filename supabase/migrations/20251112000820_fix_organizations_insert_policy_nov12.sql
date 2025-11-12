/*
  # Fix Organizations INSERT Policy - November 12, 2025
  
  ## Problem
  - Error 403 when trying to create new organizations (franchises)
  - Error: "new row violates row-level security policy for table organizations"
  - Master users cannot insert new rows into organizations table
  
  ## Solution
  1. Drop all existing INSERT policies on organizations table
  2. Create a clear INSERT policy for master and admin roles
  3. Ensure the policy checks profiles.role correctly
  
  ## Security
  - Only users with role='master' or role='admin' can create organizations
  - Policy uses EXISTS subquery to check user role in profiles table
  - WITH CHECK clause validates the insertion is allowed
*/

-- =====================================================
-- 1. Clean up existing INSERT policies
-- =====================================================
DROP POLICY IF EXISTS "Masters and admins can create organizations" ON organizations;
DROP POLICY IF EXISTS "Masters can create organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can create organizations" ON organizations;
DROP POLICY IF EXISTS "Masters and admins can insert organizations" ON organizations;
DROP POLICY IF EXISTS "Authenticated admins can create organizations" ON organizations;

-- =====================================================
-- 2. Create clear INSERT policy for master and admin
-- =====================================================
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
-- 3. Verify RLS is enabled
-- =====================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. Log success
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Organizations INSERT policy fixed';
  RAISE NOTICE '   - Master and admin users can now create organizations';
  RAISE NOTICE '   - Policy: "Master and admin can insert organizations"';
END $$;
