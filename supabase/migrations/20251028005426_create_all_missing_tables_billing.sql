/*
  # Création de Toutes les Tables Manquantes - PARTIE 2: FACTURATION
  Date: 28 Octobre 2025
  
  Tables créées:
  1. organization_billing_config - Configuration de facturation
  2. franchise_invoices - Factures de franchise
  3. warranty_transactions - Transactions de garantie
  4. franchise_payments - Paiements de franchise
  5. stripe_customer_organizations - Clients Stripe
  6. dealer_inventory - Inventaire du dealer
  7. customer_products - Produits clients
*/

-- =====================================================
-- TABLE 1: organization_billing_config
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
      WHERE id = auth.uid()
      AND role IN ('master', 'admin')
    )
  );

CREATE POLICY "Users can view own org billing config"
  ON organization_billing_config FOR SELECT
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- =====================================================
-- TABLE 2: franchise_invoices
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
      WHERE id = auth.uid()
      AND role IN ('master', 'admin')
    )
  );

CREATE POLICY "Users can view own org invoices"
  ON franchise_invoices FOR SELECT
  TO authenticated
  USING (
    franchisee_organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- =====================================================
-- TABLE 3: warranty_transactions
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
      WHERE id = auth.uid()
      AND role IN ('master', 'admin')
    )
  );

CREATE POLICY "Users can view own org warranty transactions"
  ON warranty_transactions FOR SELECT
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- =====================================================
-- TABLE 4: franchise_payments
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
      WHERE id = auth.uid()
      AND role IN ('master', 'admin')
    )
  );

CREATE POLICY "Users can view own org payments"
  ON franchise_payments FOR SELECT
  TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM franchise_invoices
      WHERE franchisee_organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
  );

-- =====================================================
-- TABLE 5: stripe_customer_organizations
-- =====================================================
CREATE TABLE IF NOT EXISTS stripe_customer_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id)
);

CREATE INDEX IF NOT EXISTS idx_stripe_customers_org ON stripe_customer_organizations(organization_id);

ALTER TABLE stripe_customer_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage stripe customers"
  ON stripe_customer_organizations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin')
    )
  );

-- =====================================================
-- TABLE 6: dealer_inventory
-- =====================================================
CREATE TABLE IF NOT EXISTS dealer_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  vin text NOT NULL,
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  type text NOT NULL,
  color text,
  purchase_date date,
  purchase_price numeric(12,2),
  asking_price numeric(12,2),
  status text DEFAULT 'available' CHECK (status IN ('available', 'sold', 'reserved', 'pending')),
  location text,
  notes text,
  sold_date date,
  sold_price numeric(12,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dealer_inventory_org ON dealer_inventory(organization_id);
CREATE INDEX IF NOT EXISTS idx_dealer_inventory_vin ON dealer_inventory(vin);
CREATE INDEX IF NOT EXISTS idx_dealer_inventory_status ON dealer_inventory(status);

ALTER TABLE dealer_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org inventory"
  ON dealer_inventory FOR SELECT
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage own org inventory"
  ON dealer_inventory FOR ALL
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin', 'franchisee_admin', 'employee')
    )
  );

-- =====================================================
-- TABLE 7: customer_products
-- =====================================================
CREATE TABLE IF NOT EXISTS customer_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  product_type text NOT NULL,
  brand text,
  model text,
  serial_number text,
  purchase_date date,
  purchase_price numeric(12,2),
  warranty_id uuid REFERENCES warranties(id) ON DELETE SET NULL,
  manufacturer_warranty_end_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_products_customer ON customer_products(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_products_org ON customer_products(organization_id);
CREATE INDEX IF NOT EXISTS idx_customer_products_warranty ON customer_products(warranty_id);

ALTER TABLE customer_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org customer products"
  ON customer_products FOR SELECT
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage own org customer products"
  ON customer_products FOR ALL
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✓ PARTIE 2 TERMINÉE: 7 tables de facturation et inventaire créées';
  RAISE NOTICE '  - organization_billing_config';
  RAISE NOTICE '  - franchise_invoices';
  RAISE NOTICE '  - warranty_transactions';
  RAISE NOTICE '  - franchise_payments';
  RAISE NOTICE '  - stripe_customer_organizations';
  RAISE NOTICE '  - dealer_inventory';
  RAISE NOTICE '  - customer_products';
END $$;