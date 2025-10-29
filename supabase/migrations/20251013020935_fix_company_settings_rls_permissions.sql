/*
  # Fix Company Settings RLS Permissions
  
  ## Problem
  The current RLS policies only allow admins and owners to INSERT/UPDATE company_settings,
  but users need to be able to update their organization's settings.
  
  ## Changes
  1. Drop the restrictive "ALL" policy that requires admin/owner role
  2. Create separate INSERT and UPDATE policies that allow any authenticated user
     in the organization to manage their organization's settings
  3. Keep the SELECT policy as is
  
  ## Security
  - Users can only manage settings for their own organization
  - organization_id is validated on both USING and WITH CHECK clauses
  - All operations require authentication
*/

-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Admins can manage own org company settings" ON company_settings;

-- Create separate INSERT policy for all authenticated users in the org
CREATE POLICY "Users can insert their org company settings"
  ON company_settings FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());

-- Create separate UPDATE policy for all authenticated users in the org
CREATE POLICY "Users can update their org company settings"
  ON company_settings FOR UPDATE
  TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());
