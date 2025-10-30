/*
  # Fix All Settings Tables RLS Policies

  This migration fixes RLS policies for all settings tables to eliminate ambiguity.

  ## Tables Updated
  1. pricing_settings
  2. tax_settings
  3. claim_settings
  4. addon_options_settings (if exists)

  ## Changes Made
  - Drop existing ambiguous policies
  - Create clear, separate policies for SELECT, INSERT, UPDATE
  - Ensure proper organization_id checks
*/

-- ============================================================================
-- PRICING_SETTINGS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view organization pricing settings" ON pricing_settings;
DROP POLICY IF EXISTS "Users can insert organization pricing settings" ON pricing_settings;
DROP POLICY IF EXISTS "Users can update organization pricing settings" ON pricing_settings;
DROP POLICY IF EXISTS "Enable read access for authenticated users based on organization" ON pricing_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users based on organization" ON pricing_settings;
DROP POLICY IF EXISTS "Enable update for authenticated users based on organization" ON pricing_settings;

ALTER TABLE pricing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_settings_select_policy"
ON pricing_settings FOR SELECT TO authenticated
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "pricing_settings_insert_policy"
ON pricing_settings FOR INSERT TO authenticated
WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "pricing_settings_update_policy"
ON pricing_settings FOR UPDATE TO authenticated
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- ============================================================================
-- TAX_SETTINGS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view organization tax settings" ON tax_settings;
DROP POLICY IF EXISTS "Users can insert organization tax settings" ON tax_settings;
DROP POLICY IF EXISTS "Users can update organization tax settings" ON tax_settings;
DROP POLICY IF EXISTS "Enable read access for authenticated users based on organization" ON tax_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users based on organization" ON tax_settings;
DROP POLICY IF EXISTS "Enable update for authenticated users based on organization" ON tax_settings;

ALTER TABLE tax_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tax_settings_select_policy"
ON tax_settings FOR SELECT TO authenticated
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tax_settings_insert_policy"
ON tax_settings FOR INSERT TO authenticated
WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tax_settings_update_policy"
ON tax_settings FOR UPDATE TO authenticated
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- ============================================================================
-- CLAIM_SETTINGS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view organization claim settings" ON claim_settings;
DROP POLICY IF EXISTS "Users can insert organization claim settings" ON claim_settings;
DROP POLICY IF EXISTS "Users can update organization claim settings" ON claim_settings;
DROP POLICY IF EXISTS "Enable read access for authenticated users based on organization" ON claim_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users based on organization" ON claim_settings;
DROP POLICY IF EXISTS "Enable update for authenticated users based on organization" ON claim_settings;

ALTER TABLE claim_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "claim_settings_select_policy"
ON claim_settings FOR SELECT TO authenticated
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "claim_settings_insert_policy"
ON claim_settings FOR INSERT TO authenticated
WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "claim_settings_update_policy"
ON claim_settings FOR UPDATE TO authenticated
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- ============================================================================
-- ADDON_OPTIONS_SETTINGS (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'addon_options_settings'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view organization addon options settings" ON addon_options_settings';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert organization addon options settings" ON addon_options_settings';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update organization addon options settings" ON addon_options_settings';
    EXECUTE 'DROP POLICY IF EXISTS "Enable read access for authenticated users based on organization" ON addon_options_settings';
    EXECUTE 'DROP POLICY IF EXISTS "Enable insert for authenticated users based on organization" ON addon_options_settings';
    EXECUTE 'DROP POLICY IF EXISTS "Enable update for authenticated users based on organization" ON addon_options_settings';
    
    EXECUTE 'ALTER TABLE addon_options_settings ENABLE ROW LEVEL SECURITY';
    
    EXECUTE 'CREATE POLICY "addon_options_settings_select_policy" ON addon_options_settings FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))';
    EXECUTE 'CREATE POLICY "addon_options_settings_insert_policy" ON addon_options_settings FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))';
    EXECUTE 'CREATE POLICY "addon_options_settings_update_policy" ON addon_options_settings FOR UPDATE TO authenticated USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())) WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))';
    
    RAISE NOTICE 'Fixed RLS policies for addon_options_settings';
  END IF;
END $$;