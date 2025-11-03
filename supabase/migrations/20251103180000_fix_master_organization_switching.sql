/*
  # Fix Master Organization Switching

  1. Changes
    - Allow master users to view ANY organization's data
    - Admin users can only view their own organization
    - Simplify permission logic for better reliability

  2. Security
    - Master role = full access to all organizations
    - Admin/Franchisee roles = own organization only
*/

CREATE OR REPLACE FUNCTION get_warranties_optimized(
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 25,
  p_status_filter text DEFAULT 'all',
  p_search_query text DEFAULT '',
  p_organization_id uuid DEFAULT NULL
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
  trailer_year integer,
  trailer_make text,
  trailer_model text,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '10s'
AS $$
DECLARE
  v_offset integer;
  v_user_org_id uuid;
  v_user_role text;
  v_target_org_id uuid;
BEGIN
  -- Calculate offset for pagination
  v_offset := (p_page - 1) * p_page_size;

  -- Get user's organization_id and role
  SELECT profiles.organization_id, profiles.role
  INTO v_user_org_id, v_user_role
  FROM profiles
  WHERE profiles.id = auth.uid();

  -- Determine which organization to query
  IF p_organization_id IS NOT NULL THEN
    v_target_org_id := p_organization_id;

    -- CRITICAL FIX: Master can access any org, others only their own
    IF v_user_role != 'master' AND p_organization_id != v_user_org_id THEN
      RAISE EXCEPTION 'Permission denied: cannot access organization %', p_organization_id;
    END IF;
  ELSE
    -- No org specified, use user's org
    v_target_org_id := v_user_org_id;
  END IF;

  -- Execute query with organization filter
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
    c.first_name as customer_first_name,
    c.last_name as customer_last_name,
    c.email as customer_email,
    c.phone as customer_phone,
    c.city as customer_city,
    c.province as customer_province,
    t.vin as trailer_vin,
    t.year as trailer_year,
    t.make as trailer_make,
    t.model as trailer_model,
    COUNT(*) OVER() as total_count
  FROM warranties w
  INNER JOIN customers c ON c.id = w.customer_id
  INNER JOIN trailers t ON t.id = w.trailer_id
  WHERE
    w.organization_id = v_target_org_id
    AND (p_status_filter = 'all' OR w.status = p_status_filter)
    AND (
      p_search_query = ''
      OR w.contract_number ILIKE '%' || p_search_query || '%'
      OR c.first_name ILIKE '%' || p_search_query || '%'
      OR c.last_name ILIKE '%' || p_search_query || '%'
      OR c.email ILIKE '%' || p_search_query || '%'
      OR t.vin ILIKE '%' || p_search_query || '%'
    )
  ORDER BY w.created_at DESC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$$;

-- Also fix get_warranties_simple
CREATE OR REPLACE FUNCTION get_warranties_simple(
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 25,
  p_status_filter text DEFAULT 'all',
  p_search_query text DEFAULT '',
  p_organization_id uuid DEFAULT NULL
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
  trailer_year integer,
  trailer_make text,
  trailer_model text,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '20s'
AS $$
DECLARE
  v_offset integer;
  v_user_org_id uuid;
  v_user_role text;
  v_target_org_id uuid;
BEGIN
  v_offset := (p_page - 1) * p_page_size;

  -- Get user's organization_id and role
  SELECT profiles.organization_id, profiles.role
  INTO v_user_org_id, v_user_role
  FROM profiles
  WHERE profiles.id = auth.uid();

  -- Determine target organization
  IF p_organization_id IS NOT NULL THEN
    v_target_org_id := p_organization_id;

    -- CRITICAL FIX: Master can access any org, others only their own
    IF v_user_role != 'master' AND p_organization_id != v_user_org_id THEN
      RAISE EXCEPTION 'Permission denied: cannot access organization %', p_organization_id;
    END IF;
  ELSE
    v_target_org_id := v_user_org_id;
  END IF;

  -- Execute query
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
    c.first_name,
    c.last_name,
    c.email,
    c.phone,
    c.city,
    c.province,
    t.vin,
    t.year,
    t.make,
    t.model,
    COUNT(*) OVER() as total_count
  FROM warranties w
  INNER JOIN customers c ON c.id = w.customer_id
  INNER JOIN trailers t ON t.id = w.trailer_id
  WHERE
    w.organization_id = v_target_org_id
    AND (p_status_filter = 'all' OR w.status = p_status_filter)
    AND (
      p_search_query = ''
      OR w.contract_number ILIKE '%' || p_search_query || '%'
      OR c.first_name ILIKE '%' || p_search_query || '%'
      OR c.last_name ILIKE '%' || p_search_query || '%'
      OR c.email ILIKE '%' || p_search_query || '%'
      OR t.vin ILIKE '%' || p_search_query || '%'
    )
  ORDER BY w.created_at DESC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$$;
