/*
  # Fix Missing Warranty Fields - Nov 11 2025

  1. Problem
    - Migration 20251103180000 removed critical fields from RPC functions
    - Missing fields: trailer_purchase_price, trailer_length, trailer_gvwr, trailer_color
    - Missing fields: customer_address, customer_postal_code
    - Missing fields: plan_name_en, plan_name_fr
    - Missing fields: add_ons, selected_options

  2. Solution
    - Restore all missing fields to get_warranties_optimized
    - Restore all missing fields to get_warranties_simple
    - Maintain organization switching functionality for master users
    - Keep performance optimizations and security

  3. Impact
    - Prix d'achat will display correctly instead of "Non spécifié"
    - All warranty details will show complete information
    - No breaking changes to existing functionality
*/

-- Fix get_warranties_optimized with ALL fields
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
  add_ons jsonb,
  selected_options jsonb,
  customer_first_name text,
  customer_last_name text,
  customer_email text,
  customer_phone text,
  customer_address text,
  customer_city text,
  customer_province text,
  customer_postal_code text,
  trailer_vin text,
  trailer_year integer,
  trailer_make text,
  trailer_model text,
  trailer_purchase_price numeric,
  trailer_length numeric,
  trailer_gvwr numeric,
  trailer_color text,
  plan_name text,
  plan_name_en text,
  plan_name_fr text,
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

    -- Master can access any org, others only their own
    IF v_user_role != 'master' AND p_organization_id != v_user_org_id THEN
      RAISE EXCEPTION 'Permission denied: cannot access organization %', p_organization_id;
    END IF;
  ELSE
    -- No org specified, use user's org
    v_target_org_id := v_user_org_id;
  END IF;

  -- Execute query with ALL fields
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
    w.add_ons,
    w.selected_options,
    c.first_name as customer_first_name,
    c.last_name as customer_last_name,
    c.email as customer_email,
    c.phone as customer_phone,
    c.address as customer_address,
    c.city as customer_city,
    c.province as customer_province,
    c.postal_code as customer_postal_code,
    t.vin as trailer_vin,
    t.year as trailer_year,
    t.make as trailer_make,
    t.model as trailer_model,
    t.purchase_price as trailer_purchase_price,
    t.length as trailer_length,
    t.gvwr as trailer_gvwr,
    t.color as trailer_color,
    wp.name_en as plan_name,
    wp.name_en as plan_name_en,
    wp.name_fr as plan_name_fr,
    COUNT(*) OVER() as total_count
  FROM warranties w
  INNER JOIN customers c ON c.id = w.customer_id
  INNER JOIN trailers t ON t.id = w.trailer_id
  INNER JOIN warranty_plans wp ON wp.id = w.plan_id
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

-- Fix get_warranties_simple with ALL fields
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
  add_ons jsonb,
  selected_options jsonb,
  customer_first_name text,
  customer_last_name text,
  customer_email text,
  customer_phone text,
  customer_address text,
  customer_city text,
  customer_province text,
  customer_postal_code text,
  trailer_vin text,
  trailer_year integer,
  trailer_make text,
  trailer_model text,
  trailer_purchase_price numeric,
  trailer_length numeric,
  trailer_gvwr numeric,
  trailer_color text,
  plan_name text,
  plan_name_en text,
  plan_name_fr text,
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

    -- Master can access any org, others only their own
    IF v_user_role != 'master' AND p_organization_id != v_user_org_id THEN
      RAISE EXCEPTION 'Permission denied: cannot access organization %', p_organization_id;
    END IF;
  ELSE
    v_target_org_id := v_user_org_id;
  END IF;

  -- Execute query with ALL fields
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
    w.add_ons,
    w.selected_options,
    c.first_name,
    c.last_name,
    c.email,
    c.phone,
    c.address,
    c.city,
    c.province,
    c.postal_code,
    t.vin,
    t.year,
    t.make,
    t.model,
    t.purchase_price,
    t.length,
    t.gvwr,
    t.color,
    wp.name_en,
    wp.name_en,
    wp.name_fr,
    COUNT(*) OVER() as total_count
  FROM warranties w
  INNER JOIN customers c ON c.id = w.customer_id
  INNER JOIN trailers t ON t.id = w.trailer_id
  INNER JOIN warranty_plans wp ON wp.id = w.plan_id
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

COMMENT ON FUNCTION get_warranties_optimized IS 'Fonction RPC optimisée pour récupérer les garanties avec TOUS les champs nécessaires - Fixed Nov 11 2025';
COMMENT ON FUNCTION get_warranties_simple IS 'Fonction RPC simple de secours pour récupérer les garanties avec TOUS les champs - Fixed Nov 11 2025';
