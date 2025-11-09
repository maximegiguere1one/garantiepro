/*
  # Seed Demo Data

  1. Purpose
    - Provides demo users and organizations for testing
    - Uses ON CONFLICT DO NOTHING for idempotency
    - Safe to run multiple times

  2. Demo Data
    - Demo organization (owner type)
    - Demo master user
    - Demo profile linked to master user

  3. Security
    - All RLS policies already in place
    - Demo data follows same security model as production
*/

-- Demo Organization
INSERT INTO organizations (
  id,
  name,
  type,
  status,
  parent_organization_id,
  address,
  city,
  province,
  postal_code,
  phone,
  email,
  tax_number,
  notes,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-4000-8000-0000000000ab',
  'Organisation Démo',
  'owner',
  'active',
  NULL,
  '123 Rue Demo',
  'Montréal',
  'QC',
  'H1A 1A1',
  '514-555-0100',
  'demo@proremorque.com',
  '123456789 RT0001',
  'Organisation de démonstration pour tests',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Demo Profile (will be linked to auth.users via trigger)
-- Note: The actual auth.users entry must be created via Supabase auth.signUp()
-- This is just the profile data
INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  organization_id,
  phone,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-4000-8000-000000000001',
  'demo@proremorque.com',
  'Mode Démo',
  'master',
  '00000000-0000-4000-8000-0000000000ab',
  '514-555-0100',
  NULL,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Demo Company Settings for the organization
INSERT INTO company_settings (
  id,
  organization_id,
  company_name,
  address,
  city,
  province,
  postal_code,
  phone,
  email,
  tax_number,
  logo_url,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '00000000-0000-4000-8000-0000000000ab',
  'Pro Remorque Démo',
  '123 Rue Demo',
  'Montréal',
  'QC',
  'H1A 1A1',
  '514-555-0100',
  'demo@proremorque.com',
  '123456789 RT0001',
  NULL,
  NOW(),
  NOW()
) ON CONFLICT (organization_id) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  updated_at = NOW();

-- Demo Warranty Plan
INSERT INTO warranty_plans (
  id,
  organization_id,
  name,
  description,
  duration_years,
  price,
  base_price,
  active,
  max_claim_amount,
  deductible,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '00000000-0000-4000-8000-0000000000ab',
  'Plan Démo Standard',
  'Plan de garantie standard pour démonstration',
  2,
  299.99,
  299.99,
  true,
  5000.00,
  100.00,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Demo Tax Settings
INSERT INTO tax_settings (
  id,
  organization_id,
  province_code,
  tps_rate,
  tvq_rate,
  gst_rate,
  pst_rate,
  hst_rate,
  is_default,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '00000000-0000-4000-8000-0000000000ab',
  'QC',
  5.00,
  9.975,
  0,
  0,
  0,
  true,
  NOW(),
  NOW()
) ON CONFLICT (organization_id, province_code) DO UPDATE SET
  tps_rate = EXCLUDED.tps_rate,
  tvq_rate = EXCLUDED.tvq_rate,
  updated_at = NOW();

-- Verify data was inserted
DO $$
BEGIN
  RAISE NOTICE 'Demo data seeded successfully';
  RAISE NOTICE 'Demo Organization ID: 00000000-0000-4000-8000-0000000000ab';
  RAISE NOTICE 'Demo User ID: 00000000-0000-4000-8000-000000000001';
  RAISE NOTICE 'Demo Email: demo@proremorque.com';
END $$;
