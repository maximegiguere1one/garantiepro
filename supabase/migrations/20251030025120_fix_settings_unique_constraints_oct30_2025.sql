/*
  # Fix Settings Tables - UNIQUE Constraints

  This migration adds UNIQUE constraints on organization_id for all settings tables
  to prevent duplicate entries and fix PGRST116 errors.

  ## Changes Made
  1. Add UNIQUE constraint on company_settings.organization_id
  2. Add UNIQUE constraint on pricing_settings.organization_id
  3. Add UNIQUE constraint on tax_settings.organization_id
  4. Add UNIQUE constraint on claim_settings.organization_id
  5. Add UNIQUE constraint on addon_options_settings.organization_id

  ## Why This is Critical
  - Prevents duplicate settings per organization
  - Fixes 400 errors on SELECT queries
  - Resolves PGRST116 ambiguity errors
  - Ensures data integrity

  ## Safety
  - Uses IF NOT EXISTS to prevent errors if constraint already exists
  - Non-destructive operation
*/

-- Add UNIQUE constraint on company_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'company_settings_organization_id_unique'
  ) THEN
    ALTER TABLE company_settings 
    ADD CONSTRAINT company_settings_organization_id_unique 
    UNIQUE (organization_id);
    
    RAISE NOTICE 'Added UNIQUE constraint on company_settings.organization_id';
  ELSE
    RAISE NOTICE 'UNIQUE constraint on company_settings.organization_id already exists';
  END IF;
END $$;

-- Add UNIQUE constraint on pricing_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pricing_settings_organization_id_unique'
  ) THEN
    ALTER TABLE pricing_settings 
    ADD CONSTRAINT pricing_settings_organization_id_unique 
    UNIQUE (organization_id);
    
    RAISE NOTICE 'Added UNIQUE constraint on pricing_settings.organization_id';
  ELSE
    RAISE NOTICE 'UNIQUE constraint on pricing_settings.organization_id already exists';
  END IF;
END $$;

-- Add UNIQUE constraint on tax_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tax_settings_organization_id_unique'
  ) THEN
    ALTER TABLE tax_settings 
    ADD CONSTRAINT tax_settings_organization_id_unique 
    UNIQUE (organization_id);
    
    RAISE NOTICE 'Added UNIQUE constraint on tax_settings.organization_id';
  ELSE
    RAISE NOTICE 'UNIQUE constraint on tax_settings.organization_id already exists';
  END IF;
END $$;

-- Add UNIQUE constraint on claim_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'claim_settings_organization_id_unique'
  ) THEN
    ALTER TABLE claim_settings 
    ADD CONSTRAINT claim_settings_organization_id_unique 
    UNIQUE (organization_id);
    
    RAISE NOTICE 'Added UNIQUE constraint on claim_settings.organization_id';
  ELSE
    RAISE NOTICE 'UNIQUE constraint on claim_settings.organization_id already exists';
  END IF;
END $$;

-- Add UNIQUE constraint on addon_options_settings (if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'addon_options_settings'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'addon_options_settings_organization_id_unique'
    ) THEN
      ALTER TABLE addon_options_settings 
      ADD CONSTRAINT addon_options_settings_organization_id_unique 
      UNIQUE (organization_id);
      
      RAISE NOTICE 'Added UNIQUE constraint on addon_options_settings.organization_id';
    ELSE
      RAISE NOTICE 'UNIQUE constraint on addon_options_settings.organization_id already exists';
    END IF;
  ELSE
    RAISE NOTICE 'Table addon_options_settings does not exist, skipping';
  END IF;
END $$;