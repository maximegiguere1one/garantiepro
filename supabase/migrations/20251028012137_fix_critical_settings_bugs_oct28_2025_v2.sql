/*
  # Fix Critical Settings Management Bugs - Oct 28, 2025
  
  ## ROOT CAUSES IDENTIFIED:
  1. company_settings.organization_id is NULLABLE (causes UPSERT failures)
  2. company_settings RLS policies too restrictive (only 'admin' role)
  3. notification_settings schema mismatch with frontend expectations
  4. notification_settings missing RLS policies
  
  ## SOLUTIONS:
  1. Make company_settings.organization_id NOT NULL with UNIQUE constraint
  2. Standardize RLS policies across all settings tables
  3. Add missing columns to notification_settings
  4. Add proper RLS policies to notification_settings
*/

-- =====================================================
-- STEP 1: Fix company_settings schema
-- =====================================================

-- Delete any orphaned rows with NULL organization_id
DELETE FROM company_settings WHERE organization_id IS NULL;

-- Make organization_id NOT NULL
ALTER TABLE company_settings 
  ALTER COLUMN organization_id SET NOT NULL;

-- Ensure UNIQUE constraint exists (for UPSERT to work properly)
ALTER TABLE company_settings 
  DROP CONSTRAINT IF EXISTS company_settings_organization_id_key CASCADE;
  
ALTER TABLE company_settings 
  ADD CONSTRAINT company_settings_organization_id_key UNIQUE (organization_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_company_settings_organization_id 
  ON company_settings(organization_id);

-- =====================================================
-- STEP 2: Fix company_settings RLS policies
-- =====================================================

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Only admins can update company settings" ON company_settings;
DROP POLICY IF EXISTS "Only admins can insert company settings" ON company_settings;
DROP POLICY IF EXISTS "Anyone can view company settings" ON company_settings;

-- Create new consistent policies matching other settings tables
CREATE POLICY "Users can view company settings in their organization"
  ON company_settings FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage company settings"
  ON company_settings FOR ALL
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
-- STEP 3: Fix notification_settings schema
-- =====================================================

-- Add missing columns that frontend expects
ALTER TABLE notification_settings 
  ADD COLUMN IF NOT EXISTS notify_new_warranty boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_warranty_expiring boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_claim_submitted boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_claim_approved boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_claim_rejected boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS expiring_warranty_days integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS notification_email text DEFAULT '',
  ADD COLUMN IF NOT EXISTS notification_phone text DEFAULT '';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_notification_settings_organization_id 
  ON notification_settings(organization_id);

-- Ensure UNIQUE constraint exists on organization_id
ALTER TABLE notification_settings 
  DROP CONSTRAINT IF EXISTS notification_settings_organization_id_key CASCADE;
  
ALTER TABLE notification_settings 
  ADD CONSTRAINT notification_settings_organization_id_key UNIQUE (organization_id);

-- =====================================================
-- STEP 4: Fix notification_settings RLS policies
-- =====================================================

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Admins can manage notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Users can view notification settings in their organization" ON notification_settings;

-- Create consistent policies
CREATE POLICY "Users can view notification settings in their organization"
  ON notification_settings FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage notification settings"
  ON notification_settings FOR ALL
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
-- STEP 5: Ensure updated_at triggers exist
-- =====================================================

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to company_settings
DROP TRIGGER IF EXISTS update_company_settings_updated_at ON company_settings;
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply to notification_settings
DROP TRIGGER IF EXISTS update_notification_settings_updated_at ON notification_settings;
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
