/*
  # Create Helper Functions and Update RLS Policies

  ## Summary
  Creates SQL helper functions for multi-tenant isolation and updates all RLS policies
  to use organization_id instead of dealer_id.

  ## Functions Created
  1. get_user_organization_id() - Returns the organization_id of current user
  2. is_owner() - Returns true if current user is Phil (owner type)
  3. set_organization_id() - Trigger function to auto-set organization_id on insert

  ## RLS Policies
  - Updates all existing policies to use organization-based isolation
  - Owners can see all data
  - Franchisees can only see their organization's data
*/

-- =====================================================
-- 1. Create get_user_organization_id() function
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT organization_id
    FROM profiles
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- 2. Create is_owner() function
-- =====================================================
CREATE OR REPLACE FUNCTION is_owner()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles p
    JOIN organizations o ON p.organization_id = o.id
    WHERE p.id = auth.uid()
    AND o.type = 'owner'
    AND p.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- 3. Create set_organization_id() trigger function
-- =====================================================
CREATE OR REPLACE FUNCTION set_organization_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If organization_id is not set, use current user's organization
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := get_user_organization_id();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. Apply triggers to auto-set organization_id
-- =====================================================

-- Customers
DROP TRIGGER IF EXISTS set_customer_organization_id ON customers;
CREATE TRIGGER set_customer_organization_id
  BEFORE INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION set_organization_id();

-- Trailers
DROP TRIGGER IF EXISTS set_trailer_organization_id ON trailers;
CREATE TRIGGER set_trailer_organization_id
  BEFORE INSERT ON trailers
  FOR EACH ROW
  EXECUTE FUNCTION set_organization_id();

-- Warranties
DROP TRIGGER IF EXISTS set_warranty_organization_id ON warranties;
CREATE TRIGGER set_warranty_organization_id
  BEFORE INSERT ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION set_organization_id();

-- Claims
DROP TRIGGER IF EXISTS set_claim_organization_id ON claims;
CREATE TRIGGER set_claim_organization_id
  BEFORE INSERT ON claims
  FOR EACH ROW
  EXECUTE FUNCTION set_organization_id();

-- Payments
DROP TRIGGER IF EXISTS set_payment_organization_id ON payments;
CREATE TRIGGER set_payment_organization_id
  BEFORE INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION set_organization_id();

-- Dealer Inventory
DROP TRIGGER IF EXISTS set_dealer_inventory_organization_id ON dealer_inventory;
CREATE TRIGGER set_dealer_inventory_organization_id
  BEFORE INSERT ON dealer_inventory
  FOR EACH ROW
  EXECUTE FUNCTION set_organization_id();

-- =====================================================
-- 5. Update RLS policies for customers table
-- =====================================================

DROP POLICY IF EXISTS "Staff can view own dealer customers" ON customers;
DROP POLICY IF EXISTS "Staff can manage own dealer customers" ON customers;
DROP POLICY IF EXISTS "Dealers can view own customers" ON customers;
DROP POLICY IF EXISTS "Dealers can manage own customers" ON customers;

CREATE POLICY "Users can view own org customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR organization_id = get_user_organization_id()
    OR is_owner()
  );

CREATE POLICY "Staff can manage own org customers"
  ON customers FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    OR is_owner()
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    OR is_owner()
  );

-- =====================================================
-- 6. Update RLS policies for trailers table
-- =====================================================

DROP POLICY IF EXISTS "Staff can view own dealer trailers" ON trailers;
DROP POLICY IF EXISTS "Staff can manage own dealer trailers" ON trailers;
DROP POLICY IF EXISTS "Dealers can view own trailers" ON trailers;
DROP POLICY IF EXISTS "Dealers can manage own trailers" ON trailers;

CREATE POLICY "Users can view own org trailers"
  ON trailers FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    OR is_owner()
    OR EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = trailers.customer_id
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage own org trailers"
  ON trailers FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    OR is_owner()
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    OR is_owner()
  );

-- =====================================================
-- 7. Update RLS policies for warranties table
-- =====================================================

DROP POLICY IF EXISTS "Staff can view own dealer warranties" ON warranties;
DROP POLICY IF EXISTS "Staff can manage own dealer warranties" ON warranties;
DROP POLICY IF EXISTS "Dealers can view own warranties" ON warranties;
DROP POLICY IF EXISTS "Dealers can manage own warranties" ON warranties;

CREATE POLICY "Users can view own org warranties"
  ON warranties FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    OR is_owner()
    OR EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = warranties.customer_id
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage own org warranties"
  ON warranties FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    OR is_owner()
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    OR is_owner()
  );

-- =====================================================
-- 8. Update RLS policies for claims table
-- =====================================================

DROP POLICY IF EXISTS "Staff can view own dealer claims" ON claims;
DROP POLICY IF EXISTS "Operations staff can manage own dealer claims" ON claims;
DROP POLICY IF EXISTS "Dealers can view own claims" ON claims;
DROP POLICY IF EXISTS "Dealers can manage own claims" ON claims;

CREATE POLICY "Users can view own org claims"
  ON claims FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    OR is_owner()
    OR EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = claims.customer_id
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Operations staff can manage own org claims"
  ON claims FOR ALL
  TO authenticated
  USING (
    (organization_id = get_user_organization_id() AND get_user_role() IN ('admin', 'f_and_i', 'operations'))
    OR is_owner()
  )
  WITH CHECK (
    (organization_id = get_user_organization_id() AND get_user_role() IN ('admin', 'f_and_i', 'operations'))
    OR is_owner()
  );

-- =====================================================
-- 9. Update RLS policies for payments table
-- =====================================================

DROP POLICY IF EXISTS "Staff can view own dealer payments" ON payments;
DROP POLICY IF EXISTS "Staff can manage own dealer payments" ON payments;
DROP POLICY IF EXISTS "Dealers can view own payments" ON payments;
DROP POLICY IF EXISTS "Dealers can manage own payments" ON payments;

CREATE POLICY "Users can view own org payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    OR is_owner()
  );

CREATE POLICY "Staff can manage own org payments"
  ON payments FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    OR is_owner()
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    OR is_owner()
  );

-- =====================================================
-- 10. Update RLS policies for dealer_inventory table
-- =====================================================

DROP POLICY IF EXISTS "Dealers can view own inventory" ON dealer_inventory;
DROP POLICY IF EXISTS "Dealers can manage own inventory" ON dealer_inventory;

CREATE POLICY "Users can view own org inventory"
  ON dealer_inventory FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    OR is_owner()
  );

CREATE POLICY "Staff can manage own org inventory"
  ON dealer_inventory FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    OR is_owner()
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    OR is_owner()
  );

-- =====================================================
-- 11. Update RLS policies for settings tables
-- =====================================================

-- Company Settings
DROP POLICY IF EXISTS "Dealers can view own company settings" ON company_settings;
DROP POLICY IF EXISTS "Dealers can insert own company settings" ON company_settings;
DROP POLICY IF EXISTS "Dealers can update own company settings" ON company_settings;

CREATE POLICY "Users can view own org company settings"
  ON company_settings FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    OR organization_id IS NULL
    OR is_owner()
  );

CREATE POLICY "Admins can manage own org company settings"
  ON company_settings FOR ALL
  TO authenticated
  USING (
    (organization_id = get_user_organization_id() AND get_user_role() = 'admin')
    OR is_owner()
  )
  WITH CHECK (
    (organization_id = get_user_organization_id() AND get_user_role() = 'admin')
    OR is_owner()
  );

-- Tax Settings
DROP POLICY IF EXISTS "Dealers can view own tax settings" ON tax_settings;
DROP POLICY IF EXISTS "Dealers can insert own tax settings" ON tax_settings;
DROP POLICY IF EXISTS "Dealers can update own tax settings" ON tax_settings;

CREATE POLICY "Users can view own org tax settings"
  ON tax_settings FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    OR is_owner()
  );

CREATE POLICY "Admins can manage own org tax settings"
  ON tax_settings FOR ALL
  TO authenticated
  USING (
    (organization_id = get_user_organization_id() AND get_user_role() = 'admin')
    OR is_owner()
  )
  WITH CHECK (
    (organization_id = get_user_organization_id() AND get_user_role() = 'admin')
    OR is_owner()
  );

-- Pricing Settings
DROP POLICY IF EXISTS "Dealers can view own pricing settings" ON pricing_settings;
DROP POLICY IF EXISTS "Dealers can insert own pricing settings" ON pricing_settings;
DROP POLICY IF EXISTS "Dealers can update own pricing settings" ON pricing_settings;

CREATE POLICY "Users can view own org pricing settings"
  ON pricing_settings FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    OR is_owner()
  );

CREATE POLICY "Admins can manage own org pricing settings"
  ON pricing_settings FOR ALL
  TO authenticated
  USING (
    (organization_id = get_user_organization_id() AND get_user_role() = 'admin')
    OR is_owner()
  )
  WITH CHECK (
    (organization_id = get_user_organization_id() AND get_user_role() = 'admin')
    OR is_owner()
  );

-- Notification Settings
DROP POLICY IF EXISTS "Dealers can view own notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Dealers can insert own notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Dealers can update own notification settings" ON notification_settings;

CREATE POLICY "Users can view own org notification settings"
  ON notification_settings FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    OR is_owner()
  );

CREATE POLICY "Admins can manage own org notification settings"
  ON notification_settings FOR ALL
  TO authenticated
  USING (
    (organization_id = get_user_organization_id() AND get_user_role() = 'admin')
    OR is_owner()
  )
  WITH CHECK (
    (organization_id = get_user_organization_id() AND get_user_role() = 'admin')
    OR is_owner()
  );

-- Warranty Plans
DROP POLICY IF EXISTS "Dealers can view own warranty plans" ON warranty_plans;
DROP POLICY IF EXISTS "Dealers can manage own warranty plans" ON warranty_plans;

CREATE POLICY "Users can view own org warranty plans"
  ON warranty_plans FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    OR organization_id IS NULL
    OR is_owner()
  );

CREATE POLICY "Staff can manage own org warranty plans"
  ON warranty_plans FOR ALL
  TO authenticated
  USING (
    (organization_id = get_user_organization_id() AND get_user_role() IN ('admin', 'f_and_i'))
    OR is_owner()
  )
  WITH CHECK (
    (organization_id = get_user_organization_id() AND get_user_role() IN ('admin', 'f_and_i'))
    OR is_owner()
  );

-- Warranty Options
DROP POLICY IF EXISTS "Dealers can view own warranty options" ON warranty_options;
DROP POLICY IF EXISTS "Dealers can insert own warranty options" ON warranty_options;
DROP POLICY IF EXISTS "Dealers can update own warranty options" ON warranty_options;
DROP POLICY IF EXISTS "Dealers can delete own warranty options" ON warranty_options;

CREATE POLICY "Users can view own org warranty options"
  ON warranty_options FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    OR organization_id IS NULL
    OR is_owner()
  );

CREATE POLICY "Staff can manage own org warranty options"
  ON warranty_options FOR ALL
  TO authenticated
  USING (
    (organization_id = get_user_organization_id() AND get_user_role() IN ('admin', 'f_and_i'))
    OR is_owner()
  )
  WITH CHECK (
    (organization_id = get_user_organization_id() AND get_user_role() IN ('admin', 'f_and_i'))
    OR is_owner()
  );
