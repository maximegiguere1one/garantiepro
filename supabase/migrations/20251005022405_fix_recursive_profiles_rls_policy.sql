/*
  # Fix Recursive RLS Policy on Profiles

  ## Problem
  The RLS policy "Admins can view profiles in their organization" causes
  infinite recursion because it queries the profiles table within its own
  USING clause.

  ## Solution
  Use helper functions that operate with SECURITY DEFINER to avoid recursion.

  ## Changes
  1. Drop problematic recursive policy
  2. Create helper functions that bypass RLS
  3. Create non-recursive policies using helper functions
*/

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Admins can view profiles in their organization" ON profiles;

-- Create a helper function to get user's organization with SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Create a helper function to check if user is owner organization
CREATE OR REPLACE FUNCTION is_user_owner_org()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.organizations o ON o.id = p.organization_id
    WHERE p.id = auth.uid()
    AND o.type = 'owner'
  );
$$;

-- Create a helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Create new non-recursive policy for admins
CREATE POLICY "Admins can view profiles in their organization"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- If user is admin and from owner org, can see all
    (is_user_admin() AND is_user_owner_org())
    OR
    -- If user is admin from same org, can see org members
    (is_user_admin() AND organization_id = get_user_organization_id())
  );

-- Ensure user can view their own profile (this should already exist)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);
