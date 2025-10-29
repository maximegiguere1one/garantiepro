/*
  # Update tax_settings and pricing_settings tables

  1. Changes
    - Add user_id and organization_id columns to tax_settings
    - Add user_id and organization_id columns to pricing_settings
    - Migrate data from dealer_id to user_id and organization_id
    - Update RLS policies to use organization_id
    - Keep dealer_id for backwards compatibility

  2. Security
    - Maintain existing RLS policies
    - Add new policies for organization-based access
*/

-- Add new columns to tax_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tax_settings' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE tax_settings ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tax_settings' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE tax_settings ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add new columns to pricing_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pricing_settings' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE pricing_settings ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pricing_settings' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE pricing_settings ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Migrate existing data for tax_settings
UPDATE tax_settings ts
SET
  user_id = p.user_id,
  organization_id = p.organization_id
FROM profiles p
WHERE ts.dealer_id = p.id
  AND ts.user_id IS NULL
  AND ts.organization_id IS NULL;

-- Migrate existing data for pricing_settings
UPDATE pricing_settings ps
SET
  user_id = p.user_id,
  organization_id = p.organization_id
FROM profiles p
WHERE ps.dealer_id = p.id
  AND ps.user_id IS NULL
  AND ps.organization_id IS NULL;

-- Update RLS policies for tax_settings
DROP POLICY IF EXISTS "Users can view own tax settings" ON tax_settings;
DROP POLICY IF EXISTS "Users can update own tax settings" ON tax_settings;
DROP POLICY IF EXISTS "Dealers can view own tax settings" ON tax_settings;
DROP POLICY IF EXISTS "Dealers can update own tax settings" ON tax_settings;

CREATE POLICY "Users can view organization tax settings"
  ON tax_settings FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage organization tax settings"
  ON tax_settings FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Update RLS policies for pricing_settings
DROP POLICY IF EXISTS "Users can view own pricing settings" ON pricing_settings;
DROP POLICY IF EXISTS "Users can update own pricing settings" ON pricing_settings;
DROP POLICY IF EXISTS "Dealers can view own pricing settings" ON pricing_settings;
DROP POLICY IF EXISTS "Dealers can update own pricing settings" ON pricing_settings;

CREATE POLICY "Users can view organization pricing settings"
  ON pricing_settings FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage organization pricing settings"
  ON pricing_settings FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tax_settings_user_id ON tax_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_tax_settings_organization_id ON tax_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_pricing_settings_user_id ON pricing_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_pricing_settings_organization_id ON pricing_settings(organization_id);
