/*
  # Deduplicate Settings Tables Before Schema Cleanup
  
  ## Summary
  Removes duplicate records from all settings tables, keeping only the most recent one
  for each organization_id. This prepares the data for adding UNIQUE constraints.
  
  ## Changes Made
  - Deduplicate company_settings
  - Deduplicate tax_settings
  - Deduplicate pricing_settings
  - Deduplicate notification_settings
  - Deduplicate claim_settings
*/

-- =====================================================
-- 1. Deduplicate company_settings
-- =====================================================
DELETE FROM company_settings
WHERE id NOT IN (
  SELECT DISTINCT ON (organization_id) id
  FROM company_settings
  WHERE organization_id IS NOT NULL
  ORDER BY organization_id, updated_at DESC NULLS LAST, id
);

-- =====================================================
-- 2. Deduplicate tax_settings
-- =====================================================
DELETE FROM tax_settings
WHERE id NOT IN (
  SELECT DISTINCT ON (organization_id) id
  FROM tax_settings
  WHERE organization_id IS NOT NULL
  ORDER BY organization_id, updated_at DESC NULLS LAST, id
);

-- =====================================================
-- 3. Deduplicate pricing_settings
-- =====================================================
DELETE FROM pricing_settings
WHERE id NOT IN (
  SELECT DISTINCT ON (organization_id) id
  FROM pricing_settings
  WHERE organization_id IS NOT NULL
  ORDER BY organization_id, updated_at DESC NULLS LAST, id
);

-- =====================================================
-- 4. Deduplicate notification_settings
-- =====================================================
DELETE FROM notification_settings
WHERE id NOT IN (
  SELECT DISTINCT ON (organization_id) id
  FROM notification_settings
  WHERE organization_id IS NOT NULL
  ORDER BY organization_id, updated_at DESC NULLS LAST, id
);

-- =====================================================
-- 5. Deduplicate claim_settings
-- =====================================================
DELETE FROM claim_settings
WHERE id NOT IN (
  SELECT DISTINCT ON (organization_id) id
  FROM claim_settings
  WHERE organization_id IS NOT NULL
  ORDER BY organization_id, updated_at DESC NULLS LAST, id
);
