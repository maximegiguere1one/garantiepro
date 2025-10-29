/*
  # Optimize Warranties RLS Performance

  1. Problem
    - Current RLS policies call expensive functions for every row
    - Multiple joins and subqueries create performance bottlenecks
    - Query execution scales poorly with data volume

  2. Solution
    - Add specialized composite indexes for common query patterns
    - Rewrite functions to use SQL instead of PL/pgSQL for better optimization
    - Add partial indexes for filtered queries

  3. Performance Improvements
    - Faster index scans for organization-filtered queries
    - Better query plan optimization
    - Reduced function call overhead
*/

-- =====================================================
-- 1. Add specialized composite indexes for warranties
-- =====================================================

-- This index helps the RLS policy quickly filter warranties by organization
-- and supports the ORDER BY created_at DESC in the application query
CREATE INDEX IF NOT EXISTS idx_warranties_org_created_desc
  ON warranties(organization_id, created_at DESC)
  WHERE organization_id IS NOT NULL;

-- This index helps when filtering by customer (for client role users)
CREATE INDEX IF NOT EXISTS idx_warranties_customer_created_desc
  ON warranties(customer_id, created_at DESC)
  WHERE customer_id IS NOT NULL;

-- Composite index for common filters (status + organization + date)
CREATE INDEX IF NOT EXISTS idx_warranties_org_status_created
  ON warranties(organization_id, status, created_at DESC)
  WHERE status IN ('active', 'draft', 'expired', 'cancelled');

-- Index for contract number searches (used in search functionality)
CREATE INDEX IF NOT EXISTS idx_warranties_contract_search
  ON warranties(contract_number text_pattern_ops)
  WHERE contract_number IS NOT NULL;

-- =====================================================
-- 2. Add indexes for related tables to speed up joins
-- =====================================================

-- Index for customer lookups by email (used in search)
CREATE INDEX IF NOT EXISTS idx_customers_email_search
  ON customers(email text_pattern_ops)
  WHERE email IS NOT NULL;

-- Index for customer by user_id (used in RLS policies)
CREATE INDEX IF NOT EXISTS idx_customers_user_org
  ON customers(user_id, organization_id)
  WHERE user_id IS NOT NULL;

-- Index for trailer VIN searches
CREATE INDEX IF NOT EXISTS idx_trailers_vin_search
  ON trailers(vin text_pattern_ops)
  WHERE vin IS NOT NULL;

-- Index for trailer by customer and organization
CREATE INDEX IF NOT EXISTS idx_trailers_customer_org
  ON trailers(customer_id, organization_id)
  WHERE customer_id IS NOT NULL;

-- Index for warranty plans by organization
CREATE INDEX IF NOT EXISTS idx_warranty_plans_org_active
  ON warranty_plans(organization_id, is_active)
  WHERE is_active = true;

-- =====================================================
-- 3. Optimize helper functions to use SQL language
-- =====================================================

-- Recreate get_user_organization_id using SQL for better inlining
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid AS $$
  SELECT organization_id
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Recreate is_owner using SQL for better optimization
CREATE OR REPLACE FUNCTION is_owner()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    INNER JOIN organizations o ON p.organization_id = o.id
    WHERE p.id = auth.uid()
    AND o.type = 'owner'
    AND p.role = 'admin'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Create a helper to get user role (for use in policies)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT role
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =====================================================
-- 4. Create a materialized view for fast warranty listings
-- =====================================================

-- This materialized view pre-joins warranty data for faster queries
-- Refresh this periodically (e.g., every minute) for near-real-time data
CREATE MATERIALIZED VIEW IF NOT EXISTS warranty_list_view AS
SELECT
  w.id,
  w.contract_number,
  w.organization_id,
  w.customer_id,
  w.trailer_id,
  w.plan_id,
  w.status,
  w.start_date,
  w.end_date,
  w.duration_months,
  w.base_price,
  w.options_price,
  w.taxes,
  w.total_price,
  w.margin,
  w.deductible,
  w.province,
  w.sale_duration_seconds,
  w.created_at,
  w.updated_at,
  w.contract_pdf_url,
  w.customer_invoice_pdf_url,
  w.merchant_invoice_pdf_url,
  w.signature_proof_url,
  w.signed_at,
  w.signature_ip,
  w.legal_validation_passed,
  -- Customer info
  c.first_name as customer_first_name,
  c.last_name as customer_last_name,
  c.email as customer_email,
  c.phone as customer_phone,
  c.city as customer_city,
  c.province as customer_province,
  -- Trailer info
  t.vin as trailer_vin,
  t.make as trailer_make,
  t.model as trailer_model,
  t.year as trailer_year,
  t.purchase_price as trailer_purchase_price,
  -- Plan info
  wp.name_en as plan_name_en,
  wp.name_fr as plan_name_fr
FROM warranties w
LEFT JOIN customers c ON w.customer_id = c.id
LEFT JOIN trailers t ON w.trailer_id = t.id
LEFT JOIN warranty_plans wp ON w.plan_id = wp.id;

-- Create indexes on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_warranty_list_view_id
  ON warranty_list_view(id);

CREATE INDEX IF NOT EXISTS idx_warranty_list_view_org_created
  ON warranty_list_view(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_warranty_list_view_org_status
  ON warranty_list_view(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_warranty_list_view_contract
  ON warranty_list_view(contract_number text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_warranty_list_view_customer_email
  ON warranty_list_view(customer_email text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_warranty_list_view_vin
  ON warranty_list_view(trailer_vin text_pattern_ops);

-- =====================================================
-- 5. Create function to refresh materialized view
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_warranty_list_view()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY warranty_list_view;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. Update table statistics for better query planning
-- =====================================================

ANALYZE warranties;
ANALYZE customers;
ANALYZE trailers;
ANALYZE warranty_plans;
ANALYZE profiles;
ANALYZE organizations;

-- =====================================================
-- 7. Add helpful comments for documentation
-- =====================================================

COMMENT ON INDEX idx_warranties_org_created_desc IS 'Optimized index for warranty list queries filtered by organization and sorted by date';
COMMENT ON INDEX idx_warranties_customer_created_desc IS 'Optimized index for client users viewing their own warranties';
COMMENT ON INDEX idx_warranties_org_status_created IS 'Composite index for status filtering within organizations';
COMMENT ON MATERIALIZED VIEW warranty_list_view IS 'Pre-joined warranty data for fast list queries. Refresh every 1-5 minutes.';
COMMENT ON FUNCTION refresh_warranty_list_view() IS 'Refreshes the warranty list materialized view. Call this periodically or after bulk data changes.';
