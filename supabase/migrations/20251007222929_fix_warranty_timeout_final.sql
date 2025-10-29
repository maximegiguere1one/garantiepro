/*
  # Fix Warranty Query Timeout - Final Solution

  ## Problem
  Query timeout error: "canceling statement due to statement timeout"
  
  ## Root Cause
  1. Complex nested RLS policies executing for each row
  2. INNER JOINs forcing evaluation of RLS on all joined tables
  3. Subqueries in RLS policies not using indexes efficiently
  
  ## Solution
  Simplify RLS policies to use simpler, index-friendly comparisons
*/

-- =====================================================
-- 1. Simplify RLS policies on all related tables
-- =====================================================

-- Drop and recreate warranties policy with simpler logic
DROP POLICY IF EXISTS "Users can view own org warranties" ON warranties;
CREATE POLICY "Users can view own org warranties"
  ON warranties FOR SELECT
  TO authenticated
  USING (
    -- Fast path: organization match using indexed column
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    OR
    -- Owner path: users in owner organizations see everything
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN organizations o ON p.organization_id = o.id
      WHERE p.id = auth.uid() AND o.type = 'owner'
    )
    OR
    -- Client path: see own warranties
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

-- Simplify customers policy
DROP POLICY IF EXISTS "Users can view own org customers" ON customers;
CREATE POLICY "Users can view own org customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN organizations o ON p.organization_id = o.id
      WHERE p.id = auth.uid() AND o.type = 'owner'
    )
  );

-- Simplify trailers policy
DROP POLICY IF EXISTS "Users can view own org trailers" ON trailers;
CREATE POLICY "Users can view own org trailers"
  ON trailers FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN organizations o ON p.organization_id = o.id
      WHERE p.id = auth.uid() AND o.type = 'owner'
    )
    OR
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

-- Simplify warranty_plans policy
DROP POLICY IF EXISTS "Users can view own org warranty plans" ON warranty_plans;
CREATE POLICY "Users can view own org warranty plans"
  ON warranty_plans FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    OR
    organization_id IS NULL
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN organizations o ON p.organization_id = o.id
      WHERE p.id = auth.uid() AND o.type = 'owner'
    )
  );

-- =====================================================
-- 2. Add critical indexes if missing
-- =====================================================

-- Index for faster profile lookups by auth.uid()
CREATE INDEX IF NOT EXISTS idx_profiles_id_organization
  ON profiles(id) INCLUDE (organization_id);

-- Index for organization type checks
CREATE INDEX IF NOT EXISTS idx_organizations_id_type
  ON organizations(id) INCLUDE (type);

-- Index for customer user_id lookups
CREATE INDEX IF NOT EXISTS idx_customers_user_id_only
  ON customers(user_id) WHERE user_id IS NOT NULL;

-- =====================================================
-- 3. Analyze tables for updated query plans
-- =====================================================

ANALYZE warranties;
ANALYZE customers;
ANALYZE trailers;
ANALYZE warranty_plans;
ANALYZE profiles;
ANALYZE organizations;
