/*
  # Création des fonctions RPC optimisées pour les garanties

  1. Fonctions
    - `get_warranties_optimized` - Fonction optimisée avec tous les joins
    - `get_warranties_simple` - Fonction simple de fallback
  
  2. Sécurité
    - Utilise l'organization_id de l'utilisateur pour filtrer
    - Respecte l'isolation multi-tenant
*/

-- Fonction optimisée avec tous les détails
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
  trailer_vin TEXT,
  trailer_make TEXT,
  trailer_model TEXT,
  plan_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Récupérer l'organization_id de l'utilisateur
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
    t.vin AS trailer_vin,
    t.make AS trailer_make,
    t.model AS trailer_model,
    COALESCE(wp.name_en, wp.name_fr) AS plan_name
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

-- Fonction simple de fallback
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
  -- Récupérer l'organization_id de l'utilisateur
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
