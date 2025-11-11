/*
  # Cleanup Duplicate Settings Records

  This script removes duplicate settings records, keeping only the most recent one
  for each organization_id.

  IMPORTANT: Run check-duplicate-settings.sql first to identify duplicates
  IMPORTANT: Back up your database before running this script

  Date: 2025-10-28
  Purpose: Fix PGRST116 errors by ensuring one record per organization
*/

-- Backup note: Always backup before running cleanup scripts
-- You can create a backup with: pg_dump your_database > backup.sql

-- Clean up company_settings duplicates
WITH ranked_settings AS (
  SELECT
    id,
    organization_id,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC
    ) as rn
  FROM company_settings
)
DELETE FROM company_settings
WHERE id IN (
  SELECT id FROM ranked_settings WHERE rn > 1
);

-- Clean up tax_settings duplicates
WITH ranked_settings AS (
  SELECT
    id,
    organization_id,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC
    ) as rn
  FROM tax_settings
)
DELETE FROM tax_settings
WHERE id IN (
  SELECT id FROM ranked_settings WHERE rn > 1
);

-- Clean up pricing_settings duplicates
WITH ranked_settings AS (
  SELECT
    id,
    organization_id,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC
    ) as rn
  FROM pricing_settings
)
DELETE FROM pricing_settings
WHERE id IN (
  SELECT id FROM ranked_settings WHERE rn > 1
);

-- Clean up notification_settings duplicates
WITH ranked_settings AS (
  SELECT
    id,
    organization_id,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC
    ) as rn
  FROM notification_settings
)
DELETE FROM notification_settings
WHERE id IN (
  SELECT id FROM ranked_settings WHERE rn > 1
);

-- Clean up claim_settings duplicates
WITH ranked_settings AS (
  SELECT
    id,
    organization_id,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC
    ) as rn
  FROM claim_settings
)
DELETE FROM claim_settings
WHERE id IN (
  SELECT id FROM ranked_settings WHERE rn > 1
);

-- Verify cleanup: Check remaining records per organization
SELECT 'company_settings' as table_name,
       organization_id,
       COUNT(*) as remaining_records
FROM company_settings
GROUP BY organization_id
UNION ALL
SELECT 'tax_settings', organization_id, COUNT(*)
FROM tax_settings
GROUP BY organization_id
UNION ALL
SELECT 'pricing_settings', organization_id, COUNT(*)
FROM pricing_settings
GROUP BY organization_id
UNION ALL
SELECT 'notification_settings', organization_id, COUNT(*)
FROM notification_settings
GROUP BY organization_id
UNION ALL
SELECT 'claim_settings', organization_id, COUNT(*)
FROM claim_settings
GROUP BY organization_id
ORDER BY table_name, organization_id;
