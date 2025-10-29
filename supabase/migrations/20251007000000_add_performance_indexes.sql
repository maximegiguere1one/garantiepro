/*
  # Add Performance Indexes

  1. Performance Improvements
    - Add composite indexes for frequently queried columns
    - Add indexes on foreign keys
    - Add indexes on commonly filtered columns
    - Add indexes on timestamp columns for range queries

  2. Indexes Created
    - warranties: (organization_id, created_at) for dashboard queries
    - warranties: (organization_id, status) for status filtering
    - warranties: (contract_number) for search
    - claims: (organization_id, created_at) for dashboard queries
    - claims: (organization_id, status) for status filtering
    - claims: (warranty_id) for warranty-claim joins
    - customers: (organization_id, email) for customer lookup
    - trailers: (vin) for VIN search
    - profiles: (organization_id) for organization queries

  3. Full-Text Search
    - Add GIN indexes for text search on contract_number, vin, email
*/

-- Warranties indexes
CREATE INDEX IF NOT EXISTS idx_warranties_org_created
  ON warranties(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_warranties_org_status
  ON warranties(organization_id, status)
  WHERE status IN ('active', 'expired');

CREATE INDEX IF NOT EXISTS idx_warranties_contract_number
  ON warranties(contract_number text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_warranties_customer
  ON warranties(customer_id);

CREATE INDEX IF NOT EXISTS idx_warranties_plan
  ON warranties(warranty_plan_id);

-- Claims indexes
CREATE INDEX IF NOT EXISTS idx_claims_org_created
  ON claims(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_claims_org_status
  ON claims(organization_id, status)
  WHERE status IN ('pending', 'under_review', 'approved');

CREATE INDEX IF NOT EXISTS idx_claims_warranty
  ON claims(warranty_id);

CREATE INDEX IF NOT EXISTS idx_claims_customer
  ON claims(customer_id);

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_org_email
  ON customers(organization_id, email);

CREATE INDEX IF NOT EXISTS idx_customers_user
  ON customers(user_id);

-- Trailers indexes
CREATE INDEX IF NOT EXISTS idx_trailers_vin
  ON trailers(vin text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_trailers_org
  ON trailers(organization_id);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_org
  ON profiles(organization_id);

-- Company settings indexes
CREATE INDEX IF NOT EXISTS idx_company_settings_org
  ON company_settings(organization_id);

-- Warranty plans indexes
CREATE INDEX IF NOT EXISTS idx_warranty_plans_org
  ON warranty_plans(organization_id);

-- Dealer inventory indexes
CREATE INDEX IF NOT EXISTS idx_dealer_inventory_org
  ON dealer_inventory(organization_id);

CREATE INDEX IF NOT EXISTS idx_dealer_inventory_org_stock
  ON dealer_inventory(organization_id, quantity_in_stock)
  WHERE quantity_in_stock > 0;

-- Full-text search indexes (GIN)
CREATE INDEX IF NOT EXISTS idx_warranties_contract_gin
  ON warranties USING gin(to_tsvector('simple', contract_number));

CREATE INDEX IF NOT EXISTS idx_trailers_vin_gin
  ON trailers USING gin(to_tsvector('simple', vin));

CREATE INDEX IF NOT EXISTS idx_customers_email_gin
  ON customers USING gin(to_tsvector('simple', email));

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications(user_id, read)
  WHERE NOT read;

CREATE INDEX IF NOT EXISTS idx_notifications_created
  ON notifications(created_at DESC);

-- Signature audit trail indexes
CREATE INDEX IF NOT EXISTS idx_signature_audit_warranty
  ON signature_audit_trail(warranty_id);

CREATE INDEX IF NOT EXISTS idx_signature_audit_created
  ON signature_audit_trail(created_at DESC);

-- Warranty claim tokens indexes
CREATE INDEX IF NOT EXISTS idx_warranty_claim_tokens_token
  ON warranty_claim_tokens(token);

CREATE INDEX IF NOT EXISTS idx_warranty_claim_tokens_warranty
  ON warranty_claim_tokens(warranty_id);

CREATE INDEX IF NOT EXISTS idx_warranty_claim_tokens_expires
  ON warranty_claim_tokens(expires_at)
  WHERE expires_at > NOW();

-- Add comments for documentation
COMMENT ON INDEX idx_warranties_org_created IS 'Optimize dashboard warranty queries by organization and date';
COMMENT ON INDEX idx_claims_org_status IS 'Optimize claims filtering by organization and status';
COMMENT ON INDEX idx_warranties_contract_gin IS 'Enable fast full-text search on contract numbers';
