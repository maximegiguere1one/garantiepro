/*
  # Fix Système de Garanties - Vue Matérialisée
  
  Correction: warranty_list_view est une vue MATÉRIALISÉE, pas une vue normale
*/

-- Ajouter colonnes manquantes à trailers
ALTER TABLE trailers
ADD COLUMN IF NOT EXISTS length numeric,
ADD COLUMN IF NOT EXISTS gvwr numeric,
ADD COLUMN IF NOT EXISTS color text;

-- Supprimer la vue MATÉRIALISÉE
DROP MATERIALIZED VIEW IF EXISTS warranty_list_view CASCADE;

-- Recréer comme vue MATÉRIALISÉE
CREATE MATERIALIZED VIEW warranty_list_view AS
SELECT
  w.id,
  w.contract_number,
  w.organization_id,
  w.customer_id,
  w.plan_id,
  w.trailer_id,
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
  -- Client
  c.first_name as customer_first_name,
  c.last_name as customer_last_name,
  c.email as customer_email,
  c.phone as customer_phone,
  c.city as customer_city,
  c.province as customer_province,
  -- Trailer (avec nouvelles colonnes)
  t.vin as trailer_vin,
  t.make as trailer_make,
  t.model as trailer_model,
  t.year as trailer_year,
  t.purchase_price as trailer_purchase_price,
  t.length as trailer_length,
  t.gvwr as trailer_gvwr,
  t.color as trailer_color,
  -- Plan
  wp.name_en as plan_name_en,
  wp.name_fr as plan_name_fr
FROM warranties w
INNER JOIN customers c ON c.id = w.customer_id
INNER JOIN trailers t ON t.id = w.trailer_id
INNER JOIN warranty_plans wp ON wp.id = w.plan_id;

-- Index sur la vue matérialisée
CREATE UNIQUE INDEX IF NOT EXISTS idx_warranty_list_view_id ON warranty_list_view(id);
CREATE INDEX IF NOT EXISTS idx_warranty_list_view_org ON warranty_list_view(organization_id);
CREATE INDEX IF NOT EXISTS idx_warranty_list_view_created ON warranty_list_view(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_warranty_list_view_status ON warranty_list_view(status);

-- Refresh la vue immédiatement
REFRESH MATERIALIZED VIEW CONCURRENTLY warranty_list_view;

-- Fonction fallback get_warranties_simple
CREATE OR REPLACE FUNCTION get_warranties_simple(
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  contract_number text,
  status text,
  total_price numeric,
  created_at timestamptz,
  customer_name text,
  customer_email text,
  trailer_info text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.contract_number,
    w.status,
    w.total_price,
    w.created_at,
    CONCAT(c.first_name, ' ', c.last_name),
    c.email,
    CONCAT(t.year::text, ' ', t.make, ' ', t.model)
  FROM warranties w
  INNER JOIN customers c ON c.id = w.customer_id
  INNER JOIN trailers t ON t.id = w.trailer_id
  WHERE
    w.organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN organizations o ON o.id = p.organization_id
      WHERE p.id = auth.uid() AND o.type = 'owner'
    )
    OR (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'client')
      AND c.user_id = auth.uid()
    )
  ORDER BY w.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Index sur tables principales pour performance
CREATE INDEX IF NOT EXISTS idx_warranties_customer_id ON warranties(customer_id);
CREATE INDEX IF NOT EXISTS idx_warranties_trailer_id ON warranties(trailer_id);
CREATE INDEX IF NOT EXISTS idx_warranties_plan_id ON warranties(plan_id);

COMMENT ON MATERIALIZED VIEW warranty_list_view IS 'Vue matérialisée optimisée pour requêtes rapides de warranties';
COMMENT ON FUNCTION get_warranties_simple IS 'Fonction fallback simple pour récupérer garanties';
