/*
  # Fix Settings Tables Schema - Oct 28, 2025
  
  ROOT PROBLEM: Multiple conflicting schemas for settings tables
  - Old migrations use dealer_id with UNIQUE constraint
  - New migrations use organization_id
  - Code uses both user_id AND organization_id
  
  SOLUTION: Standardize all settings tables to use:
  - organization_id (NOT NULL, with UNIQUE constraint for UPSERT)
  - user_id (nullable, for audit trail)
  - Proper RLS policies based on organization membership
*/

-- =====================================================
-- 1. DROP and RECREATE tax_settings with correct schema
-- =====================================================
DROP TABLE IF EXISTS tax_settings CASCADE;

CREATE TABLE tax_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  gst_rate numeric(5,3) NOT NULL DEFAULT 5.0,
  qst_rate numeric(5,3) NOT NULL DEFAULT 9.975,
  pst_rate numeric(5,3) NOT NULL DEFAULT 0,
  hst_rate numeric(5,3) NOT NULL DEFAULT 0,
  apply_gst boolean NOT NULL DEFAULT true,
  apply_qst boolean NOT NULL DEFAULT true,
  apply_pst boolean NOT NULL DEFAULT false,
  apply_hst boolean NOT NULL DEFAULT false,
  tax_number_gst text DEFAULT '',
  tax_number_qst text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id)
);

ALTER TABLE tax_settings ENABLE ROW LEVEL SECURITY;

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

CREATE INDEX idx_tax_settings_organization_id ON tax_settings(organization_id);

-- =====================================================
-- 2. DROP and RECREATE pricing_settings with correct schema
-- =====================================================
DROP TABLE IF EXISTS pricing_settings CASCADE;

CREATE TABLE pricing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  default_margin_percentage numeric(5,2) NOT NULL DEFAULT 20.0,
  minimum_warranty_price numeric(10,2) NOT NULL DEFAULT 50.0,
  maximum_warranty_price numeric(10,2) NOT NULL DEFAULT 10000.0,
  price_rounding_method text NOT NULL DEFAULT 'nearest' CHECK (price_rounding_method IN ('none', 'nearest', 'up', 'down')),
  price_rounding_to numeric(3,2) NOT NULL DEFAULT 0.99,
  apply_volume_discounts boolean NOT NULL DEFAULT false,
  volume_discount_threshold integer NOT NULL DEFAULT 10,
  volume_discount_percentage numeric(5,2) NOT NULL DEFAULT 5.0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id)
);

ALTER TABLE pricing_settings ENABLE ROW LEVEL SECURITY;

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

CREATE INDEX idx_pricing_settings_organization_id ON pricing_settings(organization_id);

-- =====================================================
-- 3. DROP and RECREATE claim_settings with correct schema
-- =====================================================
DROP TABLE IF EXISTS claim_settings CASCADE;

CREATE TABLE claim_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sla_hours integer NOT NULL DEFAULT 48,
  auto_approval_threshold numeric(10,2) NOT NULL DEFAULT 500.0,
  require_supervisor_approval_above numeric(10,2) NOT NULL DEFAULT 2000.0,
  exclusion_keywords text[] DEFAULT '{}',
  workflow_steps text[] DEFAULT '{}',
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id)
);

ALTER TABLE claim_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view claim settings in their organization"
  ON claim_settings FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage claim settings"
  ON claim_settings FOR ALL
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

CREATE INDEX idx_claim_settings_organization_id ON claim_settings(organization_id);

-- =====================================================
-- 4. Update triggers for updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tax_settings_updated_at
  BEFORE UPDATE ON tax_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_settings_updated_at
  BEFORE UPDATE ON pricing_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_claim_settings_updated_at
  BEFORE UPDATE ON claim_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
