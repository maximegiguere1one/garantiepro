/*
  # Refresh Schema Cache for dealer_inventory Table

  1. Changes
    - Verify dealer_inventory table has organization_id column
    - Add organization_id if missing (safety check)
    - Refresh PostgREST schema cache
    - Verify RLS policies are correctly applied

  2. Purpose
    - Fix "Could not find the 'category' column of 'dealer_inventory' in the schema cache" error
    - Ensure Supabase recognizes all columns in dealer_inventory table
    - Force schema cache refresh to sync with actual database structure

  3. Security
    - Maintains existing RLS policies
    - Does not modify access controls
*/

-- Verify and add organization_id column if missing (safety check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'dealer_inventory'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE dealer_inventory ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_dealer_inventory_organization_id ON dealer_inventory(organization_id);
  END IF;
END $$;

-- Verify category column exists with proper constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'dealer_inventory'
    AND column_name = 'category'
  ) THEN
    RAISE EXCEPTION 'CRITICAL: category column missing from dealer_inventory table';
  END IF;
END $$;

-- Refresh the schema cache by notifying PostgREST
NOTIFY pgrst, 'reload schema';

-- Verify table structure
DO $$
DECLARE
  col_count integer;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = 'dealer_inventory';

  IF col_count < 15 THEN
    RAISE WARNING 'dealer_inventory table has fewer columns than expected: %', col_count;
  END IF;

  RAISE NOTICE 'dealer_inventory table has % columns', col_count;
END $$;

-- List all columns for verification
DO $$
DECLARE
  col_record RECORD;
BEGIN
  RAISE NOTICE 'dealer_inventory table columns:';
  FOR col_record IN
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'dealer_inventory'
    ORDER BY ordinal_position
  LOOP
    RAISE NOTICE '  - % (%, nullable: %)', col_record.column_name, col_record.data_type, col_record.is_nullable;
  END LOOP;
END $$;

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'dealer_inventory'
    AND rowsecurity = true
  ) THEN
    RAISE WARNING 'RLS is not enabled on dealer_inventory table';
  ELSE
    RAISE NOTICE 'RLS is properly enabled on dealer_inventory table';
  END IF;
END $$;

-- Count and display RLS policies
DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'dealer_inventory';

  RAISE NOTICE 'dealer_inventory table has % RLS policies', policy_count;
END $$;
