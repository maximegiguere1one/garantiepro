/*
  # Fix Profiles RLS for Self-Promotion to Master - Oct 27, 2025

  1. Problem
    - Current RLS policies prevent self-promotion to master role
    - WITH CHECK policies are too restrictive
    - Need special case for admin -> master promotion

  2. Solution
    - Add policy allowing admin to update own role to master
    - Simplify WITH CHECK conditions
    - Keep security for cross-user updates

  3. Security
    - Only affects self-updates (auth.uid() = id)
    - Admins can promote themselves to master
    - Masters can do anything
*/

-- Drop overly restrictive policies
DROP POLICY IF EXISTS "update_own_profile_safe" ON profiles;
DROP POLICY IF EXISTS "update_any_profile_as_super_admin_safe" ON profiles;
DROP POLICY IF EXISTS "update_org_profiles_as_admin_safe" ON profiles;
DROP POLICY IF EXISTS "Admins can update user profiles" ON profiles;

-- Create simpler, more permissive policies

-- 1. Users can update their own profile (including role changes for self-promotion)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND (
      -- Allow any self-update if user is already master
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
      OR
      -- Allow admin to promote self to master
      (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'franchisee_admin'))
        AND role = 'master'
      )
      OR
      -- Allow keeping same role
      role = (SELECT role FROM profiles WHERE id = auth.uid())
      OR
      -- Allow other profile updates without role change
      role = (SELECT p.role FROM profiles p WHERE p.id = id)
    )
  );

-- 2. Masters can update any profile
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

-- 3. Admins can update profiles in their organization (except masters)
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
