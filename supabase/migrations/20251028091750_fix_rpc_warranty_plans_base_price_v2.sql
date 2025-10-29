/*
  # Fix RPC function - Use base_price instead of price
  
  1. Changes
    - Drop and recreate get_warranties_optimized function
    - Replace wp.price with wp.base_price
*/

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
  created_at TIMESTAMPTZ,
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
  trailer_vin TEXT,
  trailer_make TEXT,
  trailer_model TEXT,
  trailer_year INTEGER,
  trailer_length NUMERIC,
  trailer_gvwr NUMERIC,
  trailer_color TEXT,
  plan_name TEXT,
  plan_price NUMERIC,
  base_price NUMERIC,
  options_price NUMERIC,
  taxes NUMERIC,
  margin NUMERIC,
  add_ons TEXT[],
  selected_options TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM profiles
  WHERE id = auth.uid();

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
    t.vin AS trailer_vin,
    t.make AS trailer_make,
    t.model AS trailer_model,
    t.year AS trailer_year,
    t.length AS trailer_length,
    t.gvwr AS trailer_gvwr,
    t.color AS trailer_color,
    wp.name AS plan_name,
    wp.base_price AS plan_price,
    w.base_price,
    w.options_price,
    w.taxes,
    w.margin,
    w.add_ons,
    w.selected_options
  FROM warranties w
  LEFT JOIN customers c ON w.customer_id = c.id
  LEFT JOIN trailers t ON w.trailer_id = t.id
  LEFT JOIN warranty_plans wp ON w.plan_id = wp.id
  WHERE w.organization_id = v_org_id
    AND (p_status IS NULL OR w.status = p_status)
    AND (
      p_search IS NULL OR 
      w.contract_number ILIKE '%' || p_search || '%' OR
      c.first_name ILIKE '%' || p_search || '%' OR
      c.last_name ILIKE '%' || p_search || '%' OR
      t.vin ILIKE '%' || p_search || '%'
    )
  ORDER BY w.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
