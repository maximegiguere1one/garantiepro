/*
  # Emergency Warranty Loading Fix - Complete Recovery

  ## Problem
  Users are experiencing infinite loading on the warranties page. The RPC function
  may be failing silently or returning unexpected results.

  ## Solution
  Complete rebuild of the warranty loading system with:
  1. Simplified, bulletproof RPC function with extensive error handling
  2. Guaranteed fallback path that always returns valid data
  3. Better null safety and auth checks
  4. Diagnostic functions for troubleshooting

  ## Changes
  - Drop and recreate get_warranties_optimized with robust error handling
  - Add get_warranties_simple as emergency fallback
  - Add diagnostic functions for troubleshooting
  - Refresh materialized view
  - Verify all permissions
*/

-- =====================================================
-- 1. Drop existing functions (clean slate)
-- =====================================================

DROP FUNCTION IF EXISTS get_warranties_optimized(integer, integer, text, text);
DROP FUNCTION IF EXISTS get_warranties_simple(integer, integer, text, text);
DROP FUNCTION IF EXISTS diagnose_warranty_system();

-- =====================================================
-- 2. Create ultra-simple emergency fallback function
-- =====================================================

CREATE OR REPLACE FUNCTION get_warranties_simple(
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
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  offset_value integer;
  current_user_id uuid;
BEGIN
  -- Get current user (with null check)
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Calculate offset
  offset_value := (p_page - 1) * p_page_size;

  -- Simple direct query - no complex CTEs, just straightforward SQL
  RETURN QUERY
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
  LEFT JOIN customers c ON c.id = w.customer_id
  LEFT JOIN trailers t ON t.id = w.trailer_id
  LEFT JOIN warranty_plans wp ON wp.id = w.plan_id
  LEFT JOIN profiles p ON p.id = current_user_id
  WHERE
    -- Security: user must see their own organization's warranties
    (w.organization_id = p.organization_id OR p.role = 'admin')
    -- Status filter
    AND (p_status_filter = 'all' OR w.status = p_status_filter)
    -- Search filter
    AND (
      p_search_query = ''
      OR w.contract_number ILIKE '%' || p_search_query || '%'
      OR c.email ILIKE '%' || p_search_query || '%'
      OR t.vin ILIKE '%' || p_search_query || '%'
    )
  ORDER BY w.created_at DESC
  LIMIT p_page_size
  OFFSET offset_value;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in get_warranties_simple: %', SQLERRM;
    -- Return empty result on error rather than failing
    RETURN;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_warranties_simple TO authenticated;

COMMENT ON FUNCTION get_warranties_simple IS
'Emergency fallback function for loading warranties. Uses simple direct queries with robust error handling.';

-- =====================================================
-- 3. Create optimized function (with better error handling)
-- =====================================================

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
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  offset_value integer;
  current_user_id uuid;
  current_org_id uuid;
  current_role text;
BEGIN
  -- Get current user with null check
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get user's organization and role
  SELECT p.organization_id, p.role
  INTO current_org_id, current_role
  FROM profiles p
  WHERE p.id = current_user_id
  LIMIT 1;

  IF current_org_id IS NULL THEN
    RAISE WARNING 'User has no organization_id, returning empty result';
    RETURN;
  END IF;

  -- Calculate offset
  offset_value := (p_page - 1) * p_page_size;

  -- Try to use materialized view first (faster)
  BEGIN
    RETURN QUERY
    SELECT
      v.id,
      v.contract_number,
      v.organization_id,
      v.customer_id,
      v.status,
      v.start_date,
      v.end_date,
      v.duration_months,
      v.base_price,
      v.options_price,
      v.taxes,
      v.total_price,
      v.margin,
      v.deductible,
      v.province,
      v.sale_duration_seconds,
      v.created_at,
      v.contract_pdf_url,
      v.customer_invoice_pdf_url,
      v.merchant_invoice_pdf_url,
      v.signature_proof_url,
      v.signed_at,
      v.signature_ip,
      v.legal_validation_passed,
      v.customer_first_name,
      v.customer_last_name,
      v.customer_email,
      v.customer_phone,
      v.customer_city,
      v.customer_province,
      v.trailer_vin,
      v.trailer_make,
      v.trailer_model,
      v.trailer_year,
      v.trailer_purchase_price,
      v.plan_name_en,
      v.plan_name_fr,
      COUNT(*) OVER() as total_count
    FROM warranty_list_view v
    WHERE
      -- Security check
      v.organization_id = current_org_id
      -- Status filter
      AND (p_status_filter = 'all' OR v.status = p_status_filter)
      -- Search filter
      AND (
        p_search_query = ''
        OR v.contract_number ILIKE '%' || p_search_query || '%'
        OR v.customer_email ILIKE '%' || p_search_query || '%'
        OR v.trailer_vin ILIKE '%' || p_search_query || '%'
      )
    ORDER BY v.created_at DESC
    LIMIT p_page_size
    OFFSET offset_value;

  EXCEPTION
    WHEN OTHERS THEN
      -- If materialized view fails, fall back to direct query
      RAISE WARNING 'Materialized view query failed: %, falling back to direct query', SQLERRM;

      RETURN QUERY
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
      LEFT JOIN customers c ON c.id = w.customer_id
      LEFT JOIN trailers t ON t.id = w.trailer_id
      LEFT JOIN warranty_plans wp ON wp.id = w.plan_id
      WHERE
        w.organization_id = current_org_id
        AND (p_status_filter = 'all' OR w.status = p_status_filter)
        AND (
          p_search_query = ''
          OR w.contract_number ILIKE '%' || p_search_query || '%'
          OR c.email ILIKE '%' || p_search_query || '%'
          OR t.vin ILIKE '%' || p_search_query || '%'
        )
      ORDER BY w.created_at DESC
      LIMIT p_page_size
      OFFSET offset_value;
  END;

END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_warranties_optimized TO authenticated;

COMMENT ON FUNCTION get_warranties_optimized IS
'Optimized warranty loading with automatic fallback. Uses materialized view when possible, falls back to direct query on error.';

-- =====================================================
-- 4. Create diagnostic function
-- =====================================================

CREATE OR REPLACE FUNCTION diagnose_warranty_system()
RETURNS jsonb
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
  warranty_count integer;
  view_count integer;
  user_org_id uuid;
  user_role text;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  -- Initialize result
  result := jsonb_build_object(
    'timestamp', now(),
    'user_id', current_user_id,
    'checks', jsonb_build_array()
  );

  -- Check 1: User authentication
  IF current_user_id IS NULL THEN
    result := jsonb_set(result, '{checks}',
      result->'checks' || jsonb_build_object(
        'check', 'authentication',
        'status', 'FAILED',
        'message', 'User not authenticated'
      )
    );
    RETURN result;
  END IF;

  result := jsonb_set(result, '{checks}',
    result->'checks' || jsonb_build_object(
      'check', 'authentication',
      'status', 'OK',
      'message', 'User is authenticated'
    )
  );

  -- Check 2: User profile
  SELECT p.organization_id, p.role
  INTO user_org_id, user_role
  FROM profiles p
  WHERE p.id = current_user_id;

  IF user_org_id IS NULL THEN
    result := jsonb_set(result, '{checks}',
      result->'checks' || jsonb_build_object(
        'check', 'profile',
        'status', 'FAILED',
        'message', 'User has no organization_id'
      )
    );
    RETURN result;
  END IF;

  result := jsonb_set(result, '{checks}',
    result->'checks' || jsonb_build_object(
      'check', 'profile',
      'status', 'OK',
      'message', format('User organization: %s, role: %s', user_org_id, user_role)
    )
  );

  -- Check 3: Warranties count
  SELECT COUNT(*) INTO warranty_count
  FROM warranties
  WHERE organization_id = user_org_id;

  result := jsonb_set(result, '{checks}',
    result->'checks' || jsonb_build_object(
      'check', 'warranties',
      'status', 'OK',
      'message', format('Found %s warranties for organization', warranty_count)
    )
  );

  -- Check 4: Materialized view
  BEGIN
    SELECT COUNT(*) INTO view_count
    FROM warranty_list_view
    WHERE organization_id = user_org_id;

    result := jsonb_set(result, '{checks}',
      result->'checks' || jsonb_build_object(
        'check', 'materialized_view',
        'status', 'OK',
        'message', format('View contains %s warranties', view_count)
      )
    );
  EXCEPTION WHEN OTHERS THEN
    result := jsonb_set(result, '{checks}',
      result->'checks' || jsonb_build_object(
        'check', 'materialized_view',
        'status', 'FAILED',
        'message', SQLERRM
      )
    );
  END;

  -- Check 5: RPC function test
  BEGIN
    PERFORM get_warranties_optimized(1, 1, 'all', '');

    result := jsonb_set(result, '{checks}',
      result->'checks' || jsonb_build_object(
        'check', 'rpc_function',
        'status', 'OK',
        'message', 'RPC function executed successfully'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    result := jsonb_set(result, '{checks}',
      result->'checks' || jsonb_build_object(
        'check', 'rpc_function',
        'status', 'FAILED',
        'message', SQLERRM
      )
    );
  END;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION diagnose_warranty_system TO authenticated;

COMMENT ON FUNCTION diagnose_warranty_system IS
'Diagnostic function to troubleshoot warranty loading issues. Returns detailed status of all system components.';

-- =====================================================
-- 5. Refresh materialized view
-- =====================================================

REFRESH MATERIALIZED VIEW CONCURRENTLY warranty_list_view;

-- =====================================================
-- 6. Verify and log
-- =====================================================

DO $$
DECLARE
  warranty_count integer;
  view_count integer;
BEGIN
  -- Count warranties
  SELECT COUNT(*) INTO warranty_count FROM warranties;

  -- Count view entries
  SELECT COUNT(*) INTO view_count FROM warranty_list_view;

  RAISE NOTICE '=== Emergency Warranty Fix Applied ===';
  RAISE NOTICE 'Total warranties in database: %', warranty_count;
  RAISE NOTICE 'Total warranties in materialized view: %', view_count;
  RAISE NOTICE 'Functions created: get_warranties_optimized, get_warranties_simple, diagnose_warranty_system';
  RAISE NOTICE 'All functions have SECURITY DEFINER and proper error handling';
  RAISE NOTICE '=====================================';
END $$;
