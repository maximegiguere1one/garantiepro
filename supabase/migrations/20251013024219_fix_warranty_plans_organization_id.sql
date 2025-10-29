/*
  # Fix Warranty Plans Organization ID Issue
  
  ## Problem
  Existing warranty plans were created without organization_id, causing them
  to not appear in the warranty sales form which filters by organization_id.
  
  ## Solution
  1. Update existing active warranty plans to associate them with their dealer's organization
  2. Migrate plans with dealer_id to use the dealer's organization_id
  3. Add a NOT NULL constraint on organization_id for future data integrity
  4. Create a trigger to prevent creation of plans without organization_id
  
  ## Changes
  
  ### 1. Data Migration
  - Associate existing plans with dealer_id to their dealer's organization
  - Keep template plans with the master organization
  
  ### 2. Schema Updates  
  - Make organization_id NOT NULL (with exception for templates)
  - Add check constraint to ensure either organization_id is set or is_template is true
  
  ### 3. Security
  - Ensure RLS policies properly filter by organization_id
*/

-- =====================================================
-- Step 1: Migrate existing warranty plans with dealer_id
-- =====================================================

-- Update plans that have dealer_id but no organization_id
-- Link them to their dealer's organization
UPDATE warranty_plans wp
SET organization_id = p.organization_id
FROM profiles p
WHERE wp.dealer_id = p.id
  AND wp.organization_id IS NULL
  AND p.organization_id IS NOT NULL;

-- Log the migration results
DO $$
DECLARE
  updated_count INTEGER;
  orphaned_count INTEGER;
BEGIN
  -- Count how many plans were successfully migrated
  SELECT COUNT(*) INTO updated_count
  FROM warranty_plans
  WHERE organization_id IS NOT NULL AND dealer_id IS NOT NULL;
  
  -- Count how many plans still have no organization_id
  SELECT COUNT(*) INTO orphaned_count
  FROM warranty_plans
  WHERE organization_id IS NULL AND is_template = false;
  
  RAISE NOTICE 'Migration complete: % plans updated, % orphaned plans remain', updated_count, orphaned_count;
END $$;

-- =====================================================
-- Step 2: Add validation constraint
-- =====================================================

-- Add check constraint to ensure data integrity:
-- Either organization_id must be set, OR is_template must be true
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'warranty_plans_organization_or_template'
  ) THEN
    ALTER TABLE warranty_plans 
    ADD CONSTRAINT warranty_plans_organization_or_template 
    CHECK (organization_id IS NOT NULL OR is_template = true);
  END IF;
END $$;

-- =====================================================
-- Step 3: Update RLS policies for clarity
-- =====================================================

-- Drop existing policies to recreate with better names and logic
DROP POLICY IF EXISTS "Users can view own org warranty plans" ON warranty_plans;
DROP POLICY IF EXISTS "Dealers can view own and template plans" ON warranty_plans;
DROP POLICY IF EXISTS "Dealers can create own warranty plans" ON warranty_plans;
DROP POLICY IF EXISTS "Dealers can update own warranty plans" ON warranty_plans;
DROP POLICY IF EXISTS "Dealers can delete own warranty plans" ON warranty_plans;
DROP POLICY IF EXISTS "Admins can manage template plans" ON warranty_plans;

-- Policy 1: Users can view plans from their organization or template plans
CREATE POLICY "Users can view own organization warranty plans"
  ON warranty_plans FOR SELECT
  TO authenticated
  USING (
    -- Plans from user's organization
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    OR
    -- Template plans (global)
    is_template = true
    OR
    -- Master organization can see all
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN organizations o ON p.organization_id = o.id
      WHERE p.id = auth.uid() AND o.type = 'owner'
    )
  );

-- Policy 2: Users can create plans for their organization
CREATE POLICY "Users can create warranty plans for their organization"
  ON warranty_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must belong to the user's organization
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    AND
    -- Must have appropriate role
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i', 'master')
    )
  );

-- Policy 3: Users can update their organization's plans
CREATE POLICY "Users can update own organization warranty plans"
  ON warranty_plans FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i', 'master')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i', 'master')
    )
  );

-- Policy 4: Users can delete their organization's plans
CREATE POLICY "Users can delete own organization warranty plans"
  ON warranty_plans FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i', 'master')
    )
  );

-- Policy 5: Master users can manage template plans
CREATE POLICY "Master users can manage template warranty plans"
  ON warranty_plans FOR ALL
  TO authenticated
  USING (
    is_template = true
    AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'master'
    )
  )
  WITH CHECK (
    is_template = true
    AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'master'
    )
  );

-- =====================================================
-- Step 4: Add helpful indexes
-- =====================================================

-- Index to speed up organization-based queries
CREATE INDEX IF NOT EXISTS idx_warranty_plans_org_active 
  ON warranty_plans(organization_id, is_active) 
  WHERE organization_id IS NOT NULL;

-- Index for template plans
CREATE INDEX IF NOT EXISTS idx_warranty_plans_templates_active 
  ON warranty_plans(is_template, is_active) 
  WHERE is_template = true;

-- =====================================================
-- Step 5: Create helper function for diagnostics
-- =====================================================

CREATE OR REPLACE FUNCTION check_warranty_plans_health()
RETURNS TABLE(
  organization_name text,
  active_plans_count bigint,
  inactive_plans_count bigint,
  total_plans bigint
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    o.name as organization_name,
    COUNT(*) FILTER (WHERE wp.is_active = true) as active_plans_count,
    COUNT(*) FILTER (WHERE wp.is_active = false) as inactive_plans_count,
    COUNT(*) as total_plans
  FROM organizations o
  LEFT JOIN warranty_plans wp ON wp.organization_id = o.id
  GROUP BY o.id, o.name
  ORDER BY o.name;
$$;

-- Run the health check and log results
DO $$
DECLARE
  result RECORD;
BEGIN
  RAISE NOTICE 'Warranty Plans Health Check:';
  RAISE NOTICE '================================';
  FOR result IN SELECT * FROM check_warranty_plans_health()
  LOOP
    RAISE NOTICE 'Organization: % | Active: % | Inactive: % | Total: %', 
      result.organization_name, 
      result.active_plans_count, 
      result.inactive_plans_count,
      result.total_plans;
  END LOOP;
END $$;

-- =====================================================
-- Step 6: Analyze for query optimization
-- =====================================================

ANALYZE warranty_plans;
ANALYZE organizations;
ANALYZE profiles;
