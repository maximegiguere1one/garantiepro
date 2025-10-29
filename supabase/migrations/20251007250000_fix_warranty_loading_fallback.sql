/*
  # Fix Warranty Loading - Bulletproof Fallback

  This migration creates a simplified RPC function that:
  1. Works without materialized view dependency
  2. Uses direct table queries with proper indexes
  3. Has built-in error handling
  4. Falls back gracefully if any component fails
*/

-- Drop existing function to recreate with better error handling
DROP FUNCTION IF EXISTS get_warranties_optimized(integer, integer, text, text);

-- Create bulletproof warranty loading function
CREATE OR REPLACE FUNCTION get_warranties_optimized(
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 25,
  p_status_filter text DEFAULT 'all',
  p_search_query text DEFAULT ''
)
RETURNS TABLE (
  id uuid,
  contract_number text,
  organization_id uuid,
  customer_id uuid,
  status text,
  start_date date,
  end_date date,
  duration_months integer,
  base_price numeric,
  options_price numeric,
  taxes numeric,
  total_price numeric,
  margin numeric,
  deductible numeric,
  province text,
  sale_duration_seconds integer,
  created_at timestamptz,
  contract_pdf_url text,
  customer_invoice_pdf_url text,
  merchant_invoice_pdf_url text,
  signature_proof_url text,
  signed_at timestamptz,
  signature_ip text,
  legal_validation_passed boolean,
  customer_first_name text,
  customer_last_name text,
  customer_email text,
  customer_phone text,
  customer_city text,
  customer_province text,
  trailer_vin text,
  trailer_make text,
  trailer_model text,
  trailer_year integer,
  trailer_purchase_price numeric,
  plan_name_en text,
  plan_name_fr text,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_org_id uuid;
  user_role text;
  offset_value integer;
  use_materialized_view boolean := false;
BEGIN
  -- Get user context
  SELECT p.organization_id, p.role
  INTO user_org_id, user_role
  FROM profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;

  -- If no profile found, return empty result
  IF user_org_id IS NULL THEN
    RAISE NOTICE 'No profile found for user %', auth.uid();
    RETURN;
  END IF;

  -- Calculate offset
  offset_value := (p_page - 1) * p_page_size;

  -- Check if materialized view exists and is accessible
  BEGIN
    PERFORM 1 FROM warranty_list_view LIMIT 1;
    use_materialized_view := true;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Materialized view not available, using direct query';
    use_materialized_view := false;
  END;

  -- Try materialized view first (fast path)
  IF use_materialized_view THEN
    BEGIN
      RETURN QUERY
      WITH filtered_warranties AS (
        SELECT
          w.*,
          COUNT(*) OVER() as total_count
        FROM warranty_list_view w
        WHERE
          w.organization_id = user_org_id
          AND (p_status_filter = 'all' OR w.status = p_status_filter)
          AND (
            p_search_query = ''
            OR w.contract_number ILIKE '%' || p_search_query || '%'
          )
        ORDER BY w.created_at DESC
        LIMIT p_page_size
        OFFSET offset_value
      )
      SELECT
        fw.id, fw.contract_number, fw.organization_id, fw.customer_id,
        fw.status, fw.start_date, fw.end_date, fw.duration_months,
        fw.base_price, fw.options_price, fw.taxes, fw.total_price,
        fw.margin, fw.deductible, fw.province, fw.sale_duration_seconds,
        fw.created_at, fw.contract_pdf_url, fw.customer_invoice_pdf_url,
        fw.merchant_invoice_pdf_url, fw.signature_proof_url, fw.signed_at,
        fw.signature_ip, fw.legal_validation_passed,
        fw.customer_first_name, fw.customer_last_name, fw.customer_email,
        fw.customer_phone, fw.customer_city, fw.customer_province,
        fw.trailer_vin, fw.trailer_make, fw.trailer_model,
        fw.trailer_year, fw.trailer_purchase_price,
        fw.plan_name_en, fw.plan_name_fr,
        fw.total_count
      FROM filtered_warranties fw;

      RETURN; -- Success, exit function
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Materialized view query failed: %, falling back to direct query', SQLERRM;
    END;
  END IF;

  -- Fallback: Direct table query (reliable but slower)
  RETURN QUERY
  WITH filtered_warranties AS (
    SELECT
      w.id,
      w.contract_number,
      w.organization_id,
      w.customer_id,
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
      w.contract_pdf_url,
      w.customer_invoice_pdf_url,
      w.merchant_invoice_pdf_url,
      w.signature_proof_url,
      w.signed_at,
      w.signature_ip,
      w.legal_validation_passed,
      COALESCE(c.first_name, '') as customer_first_name,
      COALESCE(c.last_name, '') as customer_last_name,
      COALESCE(c.email, '') as customer_email,
      COALESCE(c.phone, '') as customer_phone,
      COALESCE(c.city, '') as customer_city,
      COALESCE(c.province, '') as customer_province,
      COALESCE(t.vin, '') as trailer_vin,
      COALESCE(t.make, '') as trailer_make,
      COALESCE(t.model, '') as trailer_model,
      COALESCE(t.year, 0) as trailer_year,
      COALESCE(t.purchase_price, 0) as trailer_purchase_price,
      COALESCE(wp.name_en, '') as plan_name_en,
      COALESCE(wp.name_fr, '') as plan_name_fr,
      COUNT(*) OVER() as total_count
    FROM warranties w
    LEFT JOIN customers c ON w.customer_id = c.id
    LEFT JOIN trailers t ON w.trailer_id = t.id
    LEFT JOIN warranty_plans wp ON w.plan_id = wp.id
    WHERE
      w.organization_id = user_org_id
      AND (p_status_filter = 'all' OR w.status = p_status_filter)
      AND (
        p_search_query = ''
        OR w.contract_number ILIKE '%' || p_search_query || '%'
      )
    ORDER BY w.created_at DESC
    LIMIT p_page_size
    OFFSET offset_value
  )
  SELECT
    fw.id, fw.contract_number, fw.organization_id, fw.customer_id,
    fw.status, fw.start_date, fw.end_date, fw.duration_months,
    fw.base_price, fw.options_price, fw.taxes, fw.total_price,
    fw.margin, fw.deductible, fw.province, fw.sale_duration_seconds,
    fw.created_at, fw.contract_pdf_url, fw.customer_invoice_pdf_url,
    fw.merchant_invoice_pdf_url, fw.signature_proof_url, fw.signed_at,
    fw.signature_ip, fw.legal_validation_passed,
    fw.customer_first_name, fw.customer_last_name, fw.customer_email,
    fw.customer_phone, fw.customer_city, fw.customer_province,
    fw.trailer_vin, fw.trailer_make, fw.trailer_model,
    fw.trailer_year, fw.trailer_purchase_price,
    fw.plan_name_en, fw.plan_name_fr,
    fw.total_count
  FROM filtered_warranties fw;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_warranties_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION get_warranties_optimized TO anon;

-- Add helpful comment
COMMENT ON FUNCTION get_warranties_optimized IS 'Bulletproof warranty loading with automatic fallback. Uses materialized view if available, falls back to direct query if not.';
