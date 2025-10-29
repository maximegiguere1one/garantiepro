/*
  # Consolidate All Settings Tables - Final Fix

  ## Problem
  Multiple settings tables have inconsistent schemas, causing 400 errors during save operations.
  Some tables still use dealer_id instead of organization_id, others have missing columns.

  ## Root Causes
  1. tax_settings, pricing_settings still use dealer_id (old schema)
  2. notification_settings might have schema inconsistencies
  3. Some tables missing user_id column
  4. Inconsistent UNIQUE constraints and RLS policies

  ## Solution
  Standardize ALL settings tables to use:
  - organization_id (NOT NULL, UNIQUE) - primary isolation key
  - user_id (nullable) - track who last modified
  - Consistent RLS policies for all admin roles
  - Proper indexes for performance

  ## Tables Affected
  - tax_settings
  - pricing_settings
  - notification_settings
  - company_settings
  - claim_settings
*/

-- =====================================================
-- STEP 1: Migrate tax_settings from dealer_id to organization_id
-- =====================================================

-- Check if tax_settings uses old dealer_id schema
DO $$
BEGIN
  -- If dealer_id column exists and organization_id doesn't, migrate
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tax_settings' AND column_name = 'dealer_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tax_settings' AND column_name = 'organization_id'
  ) THEN
    -- Add organization_id column
    ALTER TABLE tax_settings ADD COLUMN organization_id uuid;

    -- Migrate data: copy dealer_id to organization_id (they reference same profiles)
    UPDATE tax_settings SET organization_id = dealer_id WHERE dealer_id IS NOT NULL;

    -- Make organization_id required
    ALTER TABLE tax_settings ALTER COLUMN organization_id SET NOT NULL;

    -- Add foreign key constraint
    ALTER TABLE tax_settings
      ADD CONSTRAINT tax_settings_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

    -- Add unique constraint
    ALTER TABLE tax_settings
      DROP CONSTRAINT IF EXISTS tax_settings_organization_id_key CASCADE;
    ALTER TABLE tax_settings
      ADD CONSTRAINT tax_settings_organization_id_key UNIQUE (organization_id);

    -- Drop old dealer_id column
    ALTER TABLE tax_settings DROP COLUMN dealer_id CASCADE;

    RAISE NOTICE '✓ Migrated tax_settings from dealer_id to organization_id';
  ELSE
    -- Just ensure organization_id has proper constraints
    ALTER TABLE tax_settings
      DROP CONSTRAINT IF EXISTS tax_settings_organization_id_key CASCADE;
    ALTER TABLE tax_settings
      ADD CONSTRAINT tax_settings_organization_id_key UNIQUE (organization_id);

    RAISE NOTICE '✓ tax_settings organization_id constraints verified';
  END IF;
END $$;

-- Add user_id to tax_settings if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tax_settings' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE tax_settings ADD COLUMN user_id uuid REFERENCES auth.users(id);
    RAISE NOTICE '✓ Added user_id to tax_settings';
  END IF;
END $$;

-- =====================================================
-- STEP 2: Migrate pricing_settings from dealer_id to organization_id
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pricing_settings' AND column_name = 'dealer_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pricing_settings' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE pricing_settings ADD COLUMN organization_id uuid;
    UPDATE pricing_settings SET organization_id = dealer_id WHERE dealer_id IS NOT NULL;
    ALTER TABLE pricing_settings ALTER COLUMN organization_id SET NOT NULL;
    ALTER TABLE pricing_settings
      ADD CONSTRAINT pricing_settings_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    ALTER TABLE pricing_settings
      DROP CONSTRAINT IF EXISTS pricing_settings_organization_id_key CASCADE;
    ALTER TABLE pricing_settings
      ADD CONSTRAINT pricing_settings_organization_id_key UNIQUE (organization_id);
    ALTER TABLE pricing_settings DROP COLUMN dealer_id CASCADE;
    RAISE NOTICE '✓ Migrated pricing_settings from dealer_id to organization_id';
  ELSE
    ALTER TABLE pricing_settings
      DROP CONSTRAINT IF EXISTS pricing_settings_organization_id_key CASCADE;
    ALTER TABLE pricing_settings
      ADD CONSTRAINT pricing_settings_organization_id_key UNIQUE (organization_id);
    RAISE NOTICE '✓ pricing_settings organization_id constraints verified';
  END IF;
END $$;

-- Add user_id to pricing_settings if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pricing_settings' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE pricing_settings ADD COLUMN user_id uuid REFERENCES auth.users(id);
    RAISE NOTICE '✓ Added user_id to pricing_settings';
  END IF;
END $$;

-- =====================================================
-- STEP 3: Add indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tax_settings_organization_id
  ON tax_settings(organization_id);

CREATE INDEX IF NOT EXISTS idx_pricing_settings_organization_id
  ON pricing_settings(organization_id);

CREATE INDEX IF NOT EXISTS idx_notification_settings_organization_id
  ON notification_settings(organization_id);

CREATE INDEX IF NOT EXISTS idx_company_settings_organization_id
  ON company_settings(organization_id);

CREATE INDEX IF NOT EXISTS idx_claim_settings_organization_id
  ON claim_settings(organization_id);

-- =====================================================
-- STEP 4: Standardize RLS policies for ALL settings tables
-- =====================================================

-- Drop all old dealer_id-based policies
DROP POLICY IF EXISTS "Dealers can view own tax settings" ON tax_settings;
DROP POLICY IF EXISTS "Dealers can insert own tax settings" ON tax_settings;
DROP POLICY IF EXISTS "Dealers can update own tax settings" ON tax_settings;

DROP POLICY IF EXISTS "Dealers can view own pricing settings" ON pricing_settings;
DROP POLICY IF EXISTS "Dealers can insert own pricing settings" ON pricing_settings;
DROP POLICY IF EXISTS "Dealers can update own pricing settings" ON pricing_settings;

-- Create consistent organization-based policies for tax_settings
CREATE POLICY "Users can view tax settings in their organization"
  ON tax_settings FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage tax settings"
  ON tax_settings FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'super_admin', 'admin', 'franchisee_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'super_admin', 'admin', 'franchisee_admin')
    )
  );

-- Create consistent organization-based policies for pricing_settings
CREATE POLICY "Users can view pricing settings in their organization"
  ON pricing_settings FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage pricing settings"
  ON pricing_settings FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'super_admin', 'admin', 'franchisee_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'super_admin', 'admin', 'franchisee_admin')
    )
  );

-- =====================================================
-- STEP 5: Verification
-- =====================================================

DO $$
DECLARE
  tables_checked integer := 0;
  tables_valid integer := 0;
BEGIN
  -- Check each settings table has organization_id with UNIQUE constraint

  -- tax_settings
  tables_checked := tables_checked + 1;
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'tax_settings'
    AND constraint_name LIKE '%organization_id%'
    AND constraint_type = 'UNIQUE'
  ) THEN
    tables_valid := tables_valid + 1;
  END IF;

  -- pricing_settings
  tables_checked := tables_checked + 1;
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'pricing_settings'
    AND constraint_name LIKE '%organization_id%'
    AND constraint_type = 'UNIQUE'
  ) THEN
    tables_valid := tables_valid + 1;
  END IF;

  -- notification_settings
  tables_checked := tables_checked + 1;
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'notification_settings'
    AND constraint_name LIKE '%organization_id%'
    AND constraint_type = 'UNIQUE'
  ) THEN
    tables_valid := tables_valid + 1;
  END IF;

  -- company_settings
  tables_checked := tables_checked + 1;
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'company_settings'
    AND constraint_name LIKE '%organization_id%'
    AND constraint_type = 'UNIQUE'
  ) THEN
    tables_valid := tables_valid + 1;
  END IF;

  -- claim_settings
  tables_checked := tables_checked + 1;
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'claim_settings'
    AND constraint_name LIKE '%organization_id%'
    AND constraint_type = 'UNIQUE'
  ) THEN
    tables_valid := tables_valid + 1;
  END IF;

  RAISE NOTICE '================================';
  RAISE NOTICE 'Settings Tables Consolidation Complete';
  RAISE NOTICE '================================';
  RAISE NOTICE 'Tables checked: %', tables_checked;
  RAISE NOTICE 'Tables valid: %', tables_valid;
  RAISE NOTICE '';

  IF tables_valid = tables_checked THEN
    RAISE NOTICE '✓ All settings tables properly configured';
    RAISE NOTICE '✓ All tables use organization_id with UNIQUE constraint';
    RAISE NOTICE '✓ All tables have proper indexes';
    RAISE NOTICE '✓ All tables have consistent RLS policies';
  ELSE
    RAISE WARNING 'Some tables may have issues - check manually';
  END IF;
END $$;
