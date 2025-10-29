/*
  # Performance Optimization with Strategic Indexes

  1. New Indexes
    - Add composite indexes on frequently queried columns
    - Add partial indexes for filtered queries
    - Add indexes for foreign key relationships
    - Add GIN indexes for full-text search

  2. Performance Improvements
    - Faster warranty lookups by customer
    - Faster claim queries by status and date
    - Optimized organization queries
    - Improved search performance

  3. Query Optimization
    - Covering indexes for common queries
    - Partial indexes to reduce index size
    - Composite indexes for complex WHERE clauses
*/

CREATE INDEX IF NOT EXISTS idx_warranties_customer_status
  ON warranties(customer_id, status)
  WHERE status IN ('active', 'pending');

CREATE INDEX IF NOT EXISTS idx_warranties_dates
  ON warranties(start_date DESC, end_date DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_warranties_organization
  ON warranties(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_warranty_claims_status_date
  ON warranty_claims(status, incident_date DESC);

CREATE INDEX IF NOT EXISTS idx_warranty_claims_warranty
  ON warranty_claims(warranty_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_warranty_claims_priority
  ON warranty_claims(priority, status)
  WHERE status IN ('submitted', 'under_review');

CREATE INDEX IF NOT EXISTS idx_customers_email_lower
  ON customers(LOWER(email));

CREATE INDEX IF NOT EXISTS idx_customers_organization
  ON customers(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customers_search
  ON customers USING gin(to_tsvector('english',
    COALESCE(first_name, '') || ' ' ||
    COALESCE(last_name, '') || ' ' ||
    COALESCE(email, '')
  ));

CREATE INDEX IF NOT EXISTS idx_trailers_vin_upper
  ON trailers(UPPER(vin));

CREATE INDEX IF NOT EXISTS idx_trailers_customer
  ON trailers(customer_id);

CREATE INDEX IF NOT EXISTS idx_profiles_organization_role
  ON profiles(organization_id, role)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_profiles_email_lower
  ON profiles(LOWER(email));

CREATE INDEX IF NOT EXISTS idx_organizations_type_active
  ON organizations(type, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_warranty_plans_active
  ON warranty_plans(organization_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_billing_transactions_org_date
  ON billing_transactions(organization_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_signature_audit_warranty
  ON signature_audit_trail(warranty_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_queue_status
  ON email_queue(status, scheduled_at)
  WHERE status IN ('pending', 'retrying');

CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications(user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_franchisee_invitations_status
  ON franchisee_invitations(status, expires_at)
  WHERE status = 'pending';

ANALYZE warranties;
ANALYZE warranty_claims;
ANALYZE customers;
ANALYZE trailers;
ANALYZE profiles;
ANALYZE organizations;
