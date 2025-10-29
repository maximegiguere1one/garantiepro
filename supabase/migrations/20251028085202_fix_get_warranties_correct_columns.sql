/*
  # Fix get_warranties_optimized with correct column names

  1. Changes
    - Use selected_options instead of add_ons
    - Remove trailer columns that don't exist (length, gvwr, color)
    - Fix get_warranties_simple ambiguous id reference
    
  2. Security
    - Maintains organization_id filtering
*/

-- Fix get_warranties_optimized with correct columns
DROP FUNCTION IF EXISTS get_warranties_optimized(INT, INT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION get_warranties_optimized(
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0,
  p_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  contract_number TEXT,
  status TEXT,
  total_price NUMERIC,
  base_price NUMERIC,
  selected_options JSONB,
  options_price NUMERIC,
  taxes NUMERIC,
  margin NUMERIC,
  deductible NUMERIC,
  duration_months INT,
  created_at TIMESTAMPTZ,
  start_date DATE,
  end_date DATE,
  contract_pdf_url TEXT,
  customer_invoice_pdf_url TEXT,
  merchant_invoice_pdf_url TEXT,
  signature_proof_url TEXT,
  signed_at TIMESTAMPTZ,
  signature_ip TEXT,
  customer_first_name TEXT,
  customer_last_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  customer_city TEXT,
  customer_province TEXT,
  customer_postal_code TEXT,
  trailer_vin TEXT,
  trailer_make TEXT,
  trailer_model TEXT,
  trailer_year INT,
  trailer_purchase_price NUMERIC,
  plan_name TEXT,
  plan_duration_months INT,
  plan_price NUMERIC,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Récupérer l'organization_id de l'utilisateur
  SELECT p.organization_id INTO v_org_id
  FROM profiles p
  WHERE p.id = auth.uid();

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'User organization not found';
  END IF;

  RETURN QUERY
  SELECT 
    w.id,
    w.contract_number,
    w.status,
    w.total_price,
    w.base_price,
    w.selected_options,
    w.options_price,
    w.taxes,
    w.margin,
    w.deductible,
    w.duration_months,
    w.created_at,
    w.start_date,
    w.end_date,
    w.contract_pdf_url,
    w.customer_invoice_pdf_url,
    w.merchant_invoice_pdf_url,
    w.signature_proof_url,
    w.signed_at,
    w.signature_ip,
    c.first_name AS customer_first_name,
    c.last_name AS customer_last_name,
    c.email AS customer_email,
    c.phone AS customer_phone,
    c.address AS customer_address,
    c.city AS customer_city,
    c.province AS customer_province,
    c.postal_code AS customer_postal_code,
    t.vin AS trailer_vin,
    t.make AS trailer_make,
    t.model AS trailer_model,
    t.year AS trailer_year,
    t.purchase_price AS trailer_purchase_price,
    COALESCE(wp.name_en, wp.name_fr) AS plan_name,
    wp.duration_months AS plan_duration_months,
    wp.price AS plan_price,
    COUNT(*) OVER() AS total_count
  FROM warranties w
  INNER JOIN customers c ON c.id = w.customer_id
  INNER JOIN trailers t ON t.id = w.trailer_id
  INNER JOIN warranty_plans wp ON wp.id = w.plan_id
  WHERE w.organization_id = v_org_id
    AND (p_status IS NULL OR w.status = p_status)
    AND (p_search IS NULL OR 
         w.contract_number ILIKE '%' || p_search || '%' OR
         c.first_name ILIKE '%' || p_search || '%' OR
         c.last_name ILIKE '%' || p_search || '%' OR
         t.vin ILIKE '%' || p_search || '%')
  ORDER BY w.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Fix get_warranties_simple with correct column qualification
DROP FUNCTION IF EXISTS get_warranties_simple(INT, INT);

CREATE OR REPLACE FUNCTION get_warranties_simple(
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  contract_number TEXT,
  status TEXT,
  total_price NUMERIC,
  created_at TIMESTAMPTZ,
  contract_pdf_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Récupérer l'organization_id de l'utilisateur avec qualification explicite
  SELECT p.organization_id INTO v_org_id
  FROM profiles p
  WHERE p.id = auth.uid();

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'User organization not found';
  END IF;

  RETURN QUERY
  SELECT 
    w.id,
    w.contract_number,
    w.status,
    w.total_price,
    w.created_at,
    w.contract_pdf_url
  FROM warranties w
  WHERE w.organization_id = v_org_id
  ORDER BY w.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION get_warranties_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION get_warranties_simple TO authenticated;
