/*
  # Check for Duplicate Settings Records

  This script checks all settings tables for duplicate records per organization_id.
  In a properly configured multi-tenant system, each organization should have
  at most ONE record in each settings table.

  Date: 2025-10-28
  Purpose: Diagnose PGRST116 errors caused by multiple rows returned
*/

-- Check company_settings for duplicates
SELECT
  'company_settings' as table_name,
  organization_id,
  COUNT(*) as record_count
FROM company_settings
GROUP BY organization_id
HAVING COUNT(*) > 1
ORDER BY record_count DESC;

-- Check tax_settings for duplicates
SELECT
  'tax_settings' as table_name,
  organization_id,
  COUNT(*) as record_count
FROM tax_settings
GROUP BY organization_id
HAVING COUNT(*) > 1
ORDER BY record_count DESC;

-- Check pricing_settings for duplicates
SELECT
  'pricing_settings' as table_name,
  organization_id,
  COUNT(*) as record_count
FROM pricing_settings
GROUP BY organization_id
HAVING COUNT(*) > 1
ORDER BY record_count DESC;

-- Check notification_settings for duplicates
SELECT
  'notification_settings' as table_name,
  organization_id,
  COUNT(*) as record_count
FROM notification_settings
GROUP BY organization_id
HAVING COUNT(*) > 1
ORDER BY record_count DESC;

-- Check claim_settings for duplicates
SELECT
  'claim_settings' as table_name,
  organization_id,
  COUNT(*) as record_count
FROM claim_settings
GROUP BY organization_id
HAVING COUNT(*) > 1
ORDER BY record_count DESC;

-- Summary: Total records per table
SELECT 'company_settings' as table_name, COUNT(*) as total_records FROM company_settings
UNION ALL
SELECT 'tax_settings', COUNT(*) FROM tax_settings
UNION ALL
SELECT 'pricing_settings', COUNT(*) FROM pricing_settings
UNION ALL
SELECT 'notification_settings', COUNT(*) FROM notification_settings
UNION ALL
SELECT 'claim_settings', COUNT(*) FROM claim_settings;

-- Check for records without organization_id (should be none)
SELECT 'company_settings' as table_name, COUNT(*) as records_without_org_id
FROM company_settings WHERE organization_id IS NULL
UNION ALL
SELECT 'tax_settings', COUNT(*)
FROM tax_settings WHERE organization_id IS NULL
UNION ALL
SELECT 'pricing_settings', COUNT(*)
FROM pricing_settings WHERE organization_id IS NULL
UNION ALL
SELECT 'notification_settings', COUNT(*)
FROM notification_settings WHERE organization_id IS NULL
UNION ALL
SELECT 'claim_settings', COUNT(*)
FROM claim_settings WHERE organization_id IS NULL;
