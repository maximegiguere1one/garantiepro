/*
  # Add organization_id to All Existing Tables

  ## Summary
  Adds organization_id column to all main tables for complete multi-tenant isolation.
  This replaces the existing dealer_id approach with organization-based isolation.

  ## Tables Updated
  - customers
  - trailers
  - warranties
  - claims
  - payments
  - loyalty_credits
  - nps_surveys
  - dealer_inventory
  - All settings tables

  ## Migration Strategy
  - Add organization_id column
  - Create indexes for performance
  - Data migration handled in separate migration
*/

-- =====================================================
-- 1. Add organization_id to customers table
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON customers(organization_id);

-- =====================================================
-- 2. Add organization_id to trailers table
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trailers' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE trailers ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_trailers_organization_id ON trailers(organization_id);

-- =====================================================
-- 3. Add organization_id to warranties table
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warranties' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE warranties ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_warranties_organization_id ON warranties(organization_id);

-- =====================================================
-- 4. Add organization_id to claims table
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claims' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE claims ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_claims_organization_id ON claims(organization_id);

-- =====================================================
-- 5. Add organization_id to payments table
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_organization_id ON payments(organization_id);

-- =====================================================
-- 6. Add organization_id to loyalty_credits table
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loyalty_credits' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE loyalty_credits ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_loyalty_credits_organization_id ON loyalty_credits(organization_id);

-- =====================================================
-- 7. Add organization_id to nps_surveys table
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nps_surveys' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE nps_surveys ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_nps_surveys_organization_id ON nps_surveys(organization_id);

-- =====================================================
-- 8. Add organization_id to dealer_inventory table
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dealer_inventory' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE dealer_inventory ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_dealer_inventory_organization_id ON dealer_inventory(organization_id);

-- =====================================================
-- 9. Add organization_id to company_settings table
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_company_settings_organization_id ON company_settings(organization_id);

-- =====================================================
-- 10. Add organization_id to tax_settings table
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tax_settings' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE tax_settings ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tax_settings_organization_id ON tax_settings(organization_id);

-- =====================================================
-- 11. Add organization_id to pricing_settings table
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pricing_settings' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE pricing_settings ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pricing_settings_organization_id ON pricing_settings(organization_id);

-- =====================================================
-- 12. Add organization_id to notification_settings table
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_settings' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE notification_settings ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notification_settings_organization_id ON notification_settings(organization_id);

-- =====================================================
-- 13. Add organization_id to claim_settings table
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claim_settings' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE claim_settings ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_claim_settings_organization_id ON claim_settings(organization_id);

-- =====================================================
-- 14. Add organization_id to warranty_plans table
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warranty_plans' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE warranty_plans ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_warranty_plans_organization_id ON warranty_plans(organization_id);

-- =====================================================
-- 15. Add organization_id to warranty_options table
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warranty_options' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE warranty_options ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_warranty_options_organization_id ON warranty_options(organization_id);

-- =====================================================
-- 16. Add organization_id to notification_templates table
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_templates' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE notification_templates ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notification_templates_organization_id ON notification_templates(organization_id);

-- =====================================================
-- 17. Add organization_id to integration_settings table
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_settings' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE integration_settings ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_integration_settings_organization_id ON integration_settings(organization_id);

-- =====================================================
-- 18. Add organization_id to customer_products table
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_products' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE customer_products ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customer_products_organization_id ON customer_products(organization_id);
