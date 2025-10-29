/*
  # Migrate Templates and Integration Data to Owner Organization

  ## Overview
  Migrates existing data in template and integration tables to Phil's owner organization.

  ## Tables Migrated
  - warranty_templates
  - email_templates
  - integration_credentials
  - integration_logs
*/

-- =====================================================
-- Migrate Templates and Integration Tables
-- =====================================================

UPDATE warranty_templates
SET organization_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL
AND dealer_id IS NOT NULL;

UPDATE email_templates
SET organization_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL
AND dealer_id IS NOT NULL;

UPDATE integration_credentials
SET organization_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL
AND dealer_id IS NOT NULL;

UPDATE integration_logs
SET organization_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL
AND dealer_id IS NOT NULL;
