/*
  # Create Billing and Transaction Tables

  ## Summary
  Creates all tables needed for franchise billing system:
  - Billing configuration (50% commission)
  - Warranty transactions tracking
  - Invoice generation
  - Payment processing
  - Stripe integration

  ## Tables Created
  1. organization_billing_config - Billing settings per franchisee
  2. franchise_invoices - Monthly invoices
  3. warranty_transactions - Track every warranty sold
  4. franchise_payments - Payment history
  5. stripe_customer_organizations - Stripe integration
*/

-- =====================================================
-- 1. Create organization_billing_config table
-- =====================================================
CREATE TABLE IF NOT EXISTS organization_billing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  billing_type text NOT NULL DEFAULT 'percentage_of_warranty' CHECK (billing_type IN ('percentage_of_warranty', 'fixed_per_warranty')),
  percentage_rate numeric(5,2) NOT NULL DEFAULT 50.0,
  fixed_amount numeric(10,2) DEFAULT 0,
  minimum_monthly_fee numeric(10,2) DEFAULT 0,
  setup_fee numeric(10,2) DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_config_org ON organization_billing_config(organization_id);

ALTER TABLE organization_billing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all billing configs"
  ON organization_billing_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can view own org billing config"
  ON organization_billing_config FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE profiles.id = auth.uid()
    )
  );

-- =====================================================
-- 2. Create franchise_invoices table
-- =====================================================
CREATE TABLE IF NOT EXISTS franchise_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franchisee_organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_number text NOT NULL UNIQUE,
  billing_period_start date NOT NULL,
  billing_period_end date NOT NULL,
  total_warranties_sold integer NOT NULL DEFAULT 0,
  subtotal_amount numeric(10,2) NOT NULL DEFAULT 0,
  taxes numeric(10,2) NOT NULL DEFAULT 0,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  due_date date NOT NULL,
  paid_at timestamptz,
  stripe_invoice_id text,
  pdf_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_franchise_invoices_org ON franchise_invoices(franchisee_organization_id);
CREATE INDEX IF NOT EXISTS idx_franchise_invoices_status ON franchise_invoices(status);
CREATE INDEX IF NOT EXISTS idx_franchise_invoices_period ON franchise_invoices(billing_period_start, billing_period_end);
CREATE INDEX IF NOT EXISTS idx_franchise_invoices_due_date ON franchise_invoices(due_date);

ALTER TABLE franchise_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all invoices"
  ON franchise_invoices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can view own org invoices"
  ON franchise_invoices FOR SELECT
  TO authenticated
  USING (
    franchisee_organization_id IN (
      SELECT organization_id FROM profiles
      WHERE profiles.id = auth.uid()
    )
  );

-- =====================================================
-- 3. Create warranty_transactions table
-- =====================================================
CREATE TABLE IF NOT EXISTS warranty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id uuid NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  warranty_total_price numeric(10,2) NOT NULL,
  commission_percentage numeric(5,2) NOT NULL DEFAULT 50.0,
  commission_amount numeric(10,2) NOT NULL,
  transaction_date timestamptz NOT NULL DEFAULT now(),
  billing_status text NOT NULL DEFAULT 'pending' CHECK (billing_status IN ('pending', 'invoiced', 'paid')),
  invoice_id uuid REFERENCES franchise_invoices(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(warranty_id)
);

CREATE INDEX IF NOT EXISTS idx_warranty_transactions_org ON warranty_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_warranty_transactions_status ON warranty_transactions(billing_status);
CREATE INDEX IF NOT EXISTS idx_warranty_transactions_date ON warranty_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_warranty_transactions_invoice ON warranty_transactions(invoice_id);

ALTER TABLE warranty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all warranty transactions"
  ON warranty_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can view own org warranty transactions"
  ON warranty_transactions FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE profiles.id = auth.uid()
    )
  );

-- =====================================================
-- 4. Create franchise_payments table
-- =====================================================
CREATE TABLE IF NOT EXISTS franchise_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES franchise_invoices(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  payment_method text NOT NULL DEFAULT 'stripe' CHECK (payment_method IN ('stripe', 'manual', 'bank_transfer', 'check')),
  stripe_payment_id text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  payment_status text NOT NULL DEFAULT 'succeeded' CHECK (payment_status IN ('succeeded', 'failed', 'refunded', 'pending')),
  receipt_url text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_franchise_payments_invoice ON franchise_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_franchise_payments_status ON franchise_payments(payment_status);

ALTER TABLE franchise_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all payments"
  ON franchise_payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can view own org payments"
  ON franchise_payments FOR SELECT
  TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM franchise_invoices
      WHERE franchisee_organization_id IN (
        SELECT organization_id FROM profiles
        WHERE profiles.id = auth.uid()
      )
    )
  );

-- =====================================================
-- 5. Create stripe_customer_organizations table
-- =====================================================
CREATE TABLE IF NOT EXISTS stripe_customer_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL,
  stripe_subscription_id text,
  payment_method_id text,
  auto_pay_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id),
  UNIQUE(stripe_customer_id)
);

CREATE INDEX IF NOT EXISTS idx_stripe_customer_org ON stripe_customer_organizations(organization_id);

ALTER TABLE stripe_customer_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all stripe customers"
  ON stripe_customer_organizations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can view own org stripe customer"
  ON stripe_customer_organizations FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE profiles.id = auth.uid()
    )
  );
