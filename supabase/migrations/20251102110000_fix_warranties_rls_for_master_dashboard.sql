/*
  # Fix Warranties RLS for Master Dashboard

  1. Problem
    - Masters cannot see warranty counts for franchisees
    - RLS policies block SELECT queries on warranties table
    - OrganizationsManagementV2 shows 0 warranties for all franchisees

  2. Solution
    - Add policy allowing masters to SELECT all warranties
    - Keep existing policies for other roles
    - Ensure security is maintained

  3. Security
    - Masters can view all warranties (needed for dashboard)
    - Admins can view their org's warranties
    - Other users follow existing rules
*/

-- ============================================================================
-- FIX WARRANTIES RLS FOR MASTER VIEWING
-- ============================================================================

-- Drop existing SELECT policies to recreate them properly
DROP POLICY IF EXISTS "Masters can view all warranties" ON warranties;
DROP POLICY IF EXISTS "Admins can view all warranties in their organization" ON warranties;
DROP POLICY IF EXISTS "Users can view warranties in their organization" ON warranties;

-- Policy 1: Masters can see EVERYTHING
CREATE POLICY "Masters can view all warranties"
  ON warranties
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'master'
    )
  );

-- Policy 2: Admins can see their organization's warranties
CREATE POLICY "Admins can view organization warranties"
  ON warranties
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'franchisee_admin')
      AND profiles.organization_id = warranties.organization_id
    )
  );

-- Policy 3: Regular users can see warranties in their organization
CREATE POLICY "Users can view own organization warranties"
  ON warranties
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

-- Policy 4: Public access via claim tokens (for customers)
CREATE POLICY "Public can view warranties via claim token"
  ON warranties
  FOR SELECT
  TO anon, authenticated
  USING (
    id IN (
      SELECT warranty_id
      FROM warranty_claim_tokens
      WHERE token = current_setting('request.headers', true)::json->>'x-claim-token'
      AND expires_at > NOW()
    )
  );

-- ============================================================================
-- VERIFY RLS IS ENABLED
-- ============================================================================

-- Ensure RLS is enabled on warranties
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ADD INDEX FOR PERFORMANCE
-- ============================================================================

-- Index to speed up organization_id lookups
CREATE INDEX IF NOT EXISTS idx_warranties_organization_id
  ON warranties(organization_id);

-- Index for RLS policy performance
CREATE INDEX IF NOT EXISTS idx_warranties_org_created
  ON warranties(organization_id, created_at DESC);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Ensure authenticated users can count
GRANT SELECT ON warranties TO authenticated;
