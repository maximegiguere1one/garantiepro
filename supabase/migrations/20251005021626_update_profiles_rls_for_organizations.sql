/*
  # Update Profiles RLS for Multi-Tenant Organizations

  ## Overview
  Updates RLS policies on profiles table to ensure users can only see
  profiles from their own organization.

  ## Changes
  1. **Updated Policies**
     - Admins can only view profiles within their organization
     - Users can still view their own profile
     - Maintains data isolation between organizations

  ## Security
  - Enforces organization-level data isolation
  - Prevents cross-organization profile access
  - Maintains user self-access capability
*/

-- Drop existing admin view policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Create new organization-scoped admin view policy
CREATE POLICY "Admins can view profiles in their organization"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- User is admin and profile belongs to same organization
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND (
        -- Same organization
        p.organization_id = profiles.organization_id
        OR
        -- Owner can see all (for Phil to see all franchisees' users)
        EXISTS (
          SELECT 1 FROM organizations
          WHERE organizations.id = p.organization_id
          AND organizations.type = 'owner'
        )
      )
    )
  );

-- Ensure users can still read their own profile
-- This policy already exists but let's make sure it's there
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);
