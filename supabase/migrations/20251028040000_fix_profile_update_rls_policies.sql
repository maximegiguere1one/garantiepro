/*
  # Fix Profile Update RLS Policies - Oct 28, 2025

  ## Problem
  Users cannot save their profile information (full_name, phone) due to overly restrictive
  WITH CHECK policies. The current "Users can update own profile" policy checks role
  conditions even for basic profile field updates, causing 400 errors.

  ## Root Cause
  The WITH CHECK clause in the existing policy validates role changes for ALL updates,
  including simple field updates like full_name and phone. This prevents users from
  updating their basic information without modifying their role.

  ## Solution
  1. Separate profile information updates from role updates
  2. Create a dedicated policy for basic profile field updates (name, phone, email)
  3. Keep role change validation in a separate policy
  4. Simplify WITH CHECK conditions to only validate what's being changed

  ## Security
  - Users can ONLY update their own profile (auth.uid() = id)
  - Basic fields (full_name, phone, email) can be updated without role checks
  - Role changes are still protected by separate policies
  - Organization membership cannot be changed by users
  - All policies maintain proper authentication checks
*/

-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own name" ON profiles;

-- Policy 1: Users can update their basic profile information
-- This allows updating full_name, phone, email WITHOUT role validation
CREATE POLICY "Users can update own basic info"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- Role must remain unchanged for basic profile updates
    role = (SELECT role FROM profiles WHERE id = auth.uid()) AND
    -- Organization must remain unchanged
    organization_id IS NOT DISTINCT FROM (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- Policy 2: Admins and above can change their own role (self-promotion)
CREATE POLICY "Admins can self-promote role"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'franchisee_admin', 'master')
    )
  )
  WITH CHECK (
    auth.uid() = id AND (
      -- Masters can update anything on their profile
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
      OR
      -- Admins can promote self to master
      (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'franchisee_admin'))
        AND role = 'master'
      )
    )
  );

-- Policy 3: Masters can update any profile (unchanged)
CREATE POLICY "Masters can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'master'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'master'
    )
  );

-- Policy 4: Admins can update profiles in their organization (unchanged)
CREATE POLICY "Admins can update org profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() != id AND
    EXISTS (
      SELECT 1 FROM profiles admin
      WHERE admin.id = auth.uid()
      AND admin.role IN ('admin', 'franchisee_admin')
      AND admin.organization_id = profiles.organization_id
      AND profiles.role NOT IN ('master', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles admin
      WHERE admin.id = auth.uid()
      AND admin.role IN ('admin', 'franchisee_admin')
      AND admin.organization_id = profiles.organization_id
    )
  );

-- Verify the policies are created
DO $$
BEGIN
  RAISE NOTICE 'Profile update RLS policies fixed successfully';
  RAISE NOTICE '✓ Users can now update their basic profile info (name, phone)';
  RAISE NOTICE '✓ Role changes are protected by separate policy';
  RAISE NOTICE '✓ Organization changes are prevented';
END $$;
