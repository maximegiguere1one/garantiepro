/*
  # Fix Settings Schema Errors - Oct 27, 2025

  1. Issues Fixed
    - Add missing organization_id column to company_settings
    - Add missing organization_id column to claim_settings
    - Create missing tax_settings table
    - Create missing pricing_settings table
    - Create missing notification_settings table

  2. Tables Created/Modified
    - company_settings: Add organization_id
    - claim_settings: Add organization_id
    - tax_settings: New table with organization_id
    - pricing_settings: New table with organization_id
    - notification_settings: New table with organization_id

  3. Security
    - RLS enabled on all tables
    - Policies for organization-scoped access
*/

-- Add organization_id to company_settings if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_company_settings_organization_id ON company_settings(organization_id);
  END IF;
END $$;

-- Add organization_id to claim_settings if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claim_settings' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE claim_settings ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_claim_settings_organization_id ON claim_settings(organization_id);
  END IF;
END $$;

-- Create tax_settings table
CREATE TABLE IF NOT EXISTS tax_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tps_rate numeric(5,4) DEFAULT 0.05,
  tvq_rate numeric(5,4) DEFAULT 0.09975,
  tax_enabled boolean DEFAULT true,
  tax_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create pricing_settings table
CREATE TABLE IF NOT EXISTS pricing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  base_price numeric(10,2) DEFAULT 0,
  currency text DEFAULT 'CAD',
  discount_enabled boolean DEFAULT false,
  volume_discount_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notification_settings table
CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications boolean DEFAULT true,
  sms_notifications boolean DEFAULT false,
  push_notifications boolean DEFAULT true,
  warranty_expiry_reminder_days integer DEFAULT 30,
  claim_updates boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE tax_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tax_settings_organization_id ON tax_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_tax_settings_user_id ON tax_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_pricing_settings_organization_id ON pricing_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_pricing_settings_user_id ON pricing_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_organization_id ON notification_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);

-- RLS Policies for tax_settings
CREATE POLICY "Users can view tax settings in their organization"
  ON tax_settings FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert tax settings"
  ON tax_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('master', 'admin', 'franchisee_admin')
    )
  );

CREATE POLICY "Admins can update tax settings"
  ON tax_settings FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('master', 'admin', 'franchisee_admin')
    )
  );

-- RLS Policies for pricing_settings
CREATE POLICY "Users can view pricing settings in their organization"
  ON pricing_settings FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert pricing settings"
  ON pricing_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('master', 'admin', 'franchisee_admin')
    )
  );

CREATE POLICY "Admins can update pricing settings"
  ON pricing_settings FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('master', 'admin', 'franchisee_admin')
    )
  );

-- RLS Policies for notification_settings
CREATE POLICY "Users can view notification settings in their organization"
  ON notification_settings FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own notification settings"
  ON notification_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own notification settings"
  ON notification_settings FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() AND
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Update triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tax_settings_updated_at ON tax_settings;
CREATE TRIGGER update_tax_settings_updated_at
  BEFORE UPDATE ON tax_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pricing_settings_updated_at ON pricing_settings;
CREATE TRIGGER update_pricing_settings_updated_at
  BEFORE UPDATE ON pricing_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_settings_updated_at ON notification_settings;
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
