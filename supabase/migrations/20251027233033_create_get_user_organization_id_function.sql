/*
  # Create get_user_organization_id Function - Oct 27, 2025

  1. Purpose
    - Helper function to get the organization_id for the current user
    - Returns NULL if user not found or no organization assigned

  2. Function
    - get_user_organization_id(): Returns organization_id for auth.uid()

  3. Security
    - SECURITY DEFINER for reliable access
    - Returns NULL if no profile or organization
*/

-- Create helper function to get user's organization_id
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_organization_id() TO authenticated;

-- Also create a function to check if user is in specific organization
CREATE OR REPLACE FUNCTION user_is_in_organization(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND organization_id = org_id
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION user_is_in_organization(uuid) TO authenticated;

-- Create function to check if user has admin role
CREATE OR REPLACE FUNCTION user_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role IN ('master', 'admin', 'franchisee_admin')
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION user_is_admin() TO authenticated;
