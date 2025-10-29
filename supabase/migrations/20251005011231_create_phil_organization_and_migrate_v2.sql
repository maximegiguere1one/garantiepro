/*
  # Create Phil's Organization and Migrate Existing Data - V2

  ## Summary
  Creates the owner organization for Phil and migrates all existing data.
  Now works with the fixed validation trigger.
*/

-- =====================================================
-- 1. Create Phil's Owner Organization
-- =====================================================

INSERT INTO organizations (
  id,
  name,
  type,
  owner_organization_id,
  status,
  billing_email,
  address,
  city,
  province,
  postal_code,
  primary_color,
  secondary_color
)
VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'Location Pro Remorque - Principal',
  'owner',
  NULL,
  'active',
  'info@locationproremorque.com',
  '',
  '',
  'QC',
  '',
  '#1e293b',
  '#64748b'
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. Update All Existing Profiles
-- =====================================================

UPDATE profiles
SET organization_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL;

-- =====================================================
-- 3. Migrate Main Tables
-- =====================================================

UPDATE customers
SET organization_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL;

UPDATE trailers
SET organization_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL;

UPDATE warranties
SET organization_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL;

UPDATE payments
SET organization_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL;

UPDATE loyalty_credits
SET organization_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL;

UPDATE nps_surveys
SET organization_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL;

UPDATE dealer_inventory
SET organization_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL;

UPDATE customer_products
SET organization_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL;

-- Migrate claims (with fixed validation trigger)
UPDATE claims
SET organization_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL;

-- =====================================================
-- 4. Migrate Settings Tables
-- =====================================================

UPDATE company_settings
SET organization_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL;

UPDATE tax_settings
SET organization_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL;

UPDATE pricing_settings
SET organization_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL;

UPDATE notification_settings
SET organization_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL;

UPDATE claim_settings
SET organization_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL;

UPDATE warranty_plans
SET organization_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL;

UPDATE warranty_options
SET organization_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL;

UPDATE notification_templates
SET organization_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL;

UPDATE integration_settings
SET organization_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL;

-- =====================================================
-- 5. Create Billing Config for Owner (Exempt)
-- =====================================================

INSERT INTO organization_billing_config (
  organization_id,
  billing_type,
  percentage_rate,
  is_active
)
VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'percentage_of_warranty',
  0.0,
  false
)
ON CONFLICT (organization_id) DO NOTHING;
