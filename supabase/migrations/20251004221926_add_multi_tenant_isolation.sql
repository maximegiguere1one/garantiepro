/*
  # Add Complete Multi-Tenant Isolation

  ## Summary
  This migration adds dealer_id columns to all customer-facing tables to ensure
  proper data isolation between dealers. Each dealer can only see their own data.

  ## Problem
  Currently, tables like customers, trailers, warranties, and claims don't have
  dealer_id, which means:
  - One dealer can see another dealer's customers
  - No way to properly filter data by dealer
  - Security and privacy risks

  ## Solution
  Add dealer_id to all relevant tables and update RLS policies to enforce isolation.

  ## Changes Made

  ### 1. Add dealer_id to customers table
  - Links customer to the dealer who created them
  - Required for proper data isolation

  ### 2. Add dealer_id to trailers table  
  - Inherited from customer's dealer_id
  - Allows filtering trailers by dealer

  ### 3. Add dealer_id to warranties table
  - Links warranty to the dealer who sold it
  - Critical for revenue tracking per dealer

  ### 4. Add dealer_id to claims table
  - Links claim to the dealer who handles it
  - Allows claim management per dealer

  ### 5. Update RLS Policies
  - Add dealer isolation to all SELECT policies
  - Ensure dealers can only see their own data
  - Keep admin access to all data

  ### 6. Add Indexes
  - Index all new dealer_id columns for performance

  ## Security Notes
  - Admins can still see all data across dealers
  - Dealers are strictly isolated from each other
  - Client users can only see their own data within their dealer
*/

-- =====================================================
-- 1. Add dealer_id to customers table
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'dealer_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN dealer_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
    
    -- Set dealer_id to the user_id for existing customers (they are their own dealer)
    UPDATE customers SET dealer_id = user_id WHERE dealer_id IS NULL AND user_id IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customers_dealer_id ON customers(dealer_id);

-- Update customers RLS policies for dealer isolation
DROP POLICY IF EXISTS "Staff can view all customers" ON customers;
DROP POLICY IF EXISTS "Staff can manage customers" ON customers;

CREATE POLICY "Staff can view own dealer customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR dealer_id = auth.uid()
    OR get_user_role() = 'admin'
  );

CREATE POLICY "Staff can manage own dealer customers"
  ON customers FOR ALL
  TO authenticated
  USING (
    dealer_id = auth.uid()
    OR get_user_role() = 'admin'
  )
  WITH CHECK (
    dealer_id = auth.uid()
    OR get_user_role() = 'admin'
  );

-- =====================================================
-- 2. Add dealer_id to trailers table
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trailers' AND column_name = 'dealer_id'
  ) THEN
    ALTER TABLE trailers ADD COLUMN dealer_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
    
    -- Set dealer_id from customer's dealer_id for existing trailers
    UPDATE trailers t
    SET dealer_id = c.dealer_id
    FROM customers c
    WHERE t.customer_id = c.id
    AND t.dealer_id IS NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_trailers_dealer_id ON trailers(dealer_id);

-- Update trailers RLS policies for dealer isolation
DROP POLICY IF EXISTS "Staff can view all trailers" ON trailers;
DROP POLICY IF EXISTS "Staff can manage trailers" ON trailers;

CREATE POLICY "Staff can view own dealer trailers"
  ON trailers FOR SELECT
  TO authenticated
  USING (
    dealer_id = auth.uid()
    OR get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = trailers.customer_id
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage own dealer trailers"
  ON trailers FOR ALL
  TO authenticated
  USING (
    dealer_id = auth.uid()
    OR get_user_role() = 'admin'
  )
  WITH CHECK (
    dealer_id = auth.uid()
    OR get_user_role() = 'admin'
  );

-- =====================================================
-- 3. Add dealer_id to warranties table
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warranties' AND column_name = 'dealer_id'
  ) THEN
    ALTER TABLE warranties ADD COLUMN dealer_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
    
    -- Set dealer_id from customer's dealer_id or created_by
    UPDATE warranties w
    SET dealer_id = COALESCE(w.created_by, c.dealer_id)
    FROM customers c
    WHERE w.customer_id = c.id
    AND w.dealer_id IS NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_warranties_dealer_id ON warranties(dealer_id);

-- Update warranties RLS policies for dealer isolation
DROP POLICY IF EXISTS "Staff can view all warranties" ON warranties;
DROP POLICY IF EXISTS "Staff can manage warranties" ON warranties;

CREATE POLICY "Staff can view own dealer warranties"
  ON warranties FOR SELECT
  TO authenticated
  USING (
    dealer_id = auth.uid()
    OR get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = warranties.customer_id
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage own dealer warranties"
  ON warranties FOR ALL
  TO authenticated
  USING (
    dealer_id = auth.uid()
    OR get_user_role() = 'admin'
  )
  WITH CHECK (
    dealer_id = auth.uid()
    OR get_user_role() = 'admin'
  );

-- =====================================================
-- 4. Add dealer_id to claims table
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claims' AND column_name = 'dealer_id'
  ) THEN
    ALTER TABLE claims ADD COLUMN dealer_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
    
    -- Set dealer_id from warranty's dealer_id
    UPDATE claims cl
    SET dealer_id = w.dealer_id
    FROM warranties w
    WHERE cl.warranty_id = w.id
    AND cl.dealer_id IS NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_claims_dealer_id ON claims(dealer_id);

-- Update claims RLS policies for dealer isolation
DROP POLICY IF EXISTS "Staff can view all claims" ON claims;
DROP POLICY IF EXISTS "Operations staff can manage claims" ON claims;

CREATE POLICY "Staff can view own dealer claims"
  ON claims FOR SELECT
  TO authenticated
  USING (
    dealer_id = auth.uid()
    OR get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = claims.customer_id
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Operations staff can manage own dealer claims"
  ON claims FOR ALL
  TO authenticated
  USING (
    (dealer_id = auth.uid() AND get_user_role() IN ('admin', 'f_and_i', 'operations'))
    OR get_user_role() = 'admin'
  )
  WITH CHECK (
    (dealer_id = auth.uid() AND get_user_role() IN ('admin', 'f_and_i', 'operations'))
    OR get_user_role() = 'admin'
  );

-- =====================================================
-- 5. Add dealer_id to payments table
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'dealer_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN dealer_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
    
    -- Set dealer_id from warranty's dealer_id
    UPDATE payments p
    SET dealer_id = w.dealer_id
    FROM warranties w
    WHERE p.warranty_id = w.id
    AND p.dealer_id IS NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_dealer_id ON payments(dealer_id);

-- Update payments RLS policies for dealer isolation
DROP POLICY IF EXISTS "Staff can view all payments" ON payments;
DROP POLICY IF EXISTS "Staff can manage payments" ON payments;

CREATE POLICY "Staff can view own dealer payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    dealer_id = auth.uid()
    OR get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM warranties
      JOIN customers ON warranties.customer_id = customers.id
      WHERE warranties.id = payments.warranty_id
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage own dealer payments"
  ON payments FOR ALL
  TO authenticated
  USING (
    dealer_id = auth.uid()
    OR get_user_role() = 'admin'
  )
  WITH CHECK (
    dealer_id = auth.uid()
    OR get_user_role() = 'admin'
  );

-- =====================================================
-- 6. Add dealer_id to loyalty_credits table
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loyalty_credits' AND column_name = 'dealer_id'
  ) THEN
    ALTER TABLE loyalty_credits ADD COLUMN dealer_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
    
    -- Set dealer_id from warranty's dealer_id
    UPDATE loyalty_credits lc
    SET dealer_id = w.dealer_id
    FROM warranties w
    WHERE lc.warranty_id = w.id
    AND lc.dealer_id IS NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_loyalty_credits_dealer_id ON loyalty_credits(dealer_id);

-- Update loyalty_credits RLS policies for dealer isolation
DROP POLICY IF EXISTS "Staff can view all loyalty credits" ON loyalty_credits;
DROP POLICY IF EXISTS "Staff can manage loyalty credits" ON loyalty_credits;

CREATE POLICY "Staff can view own dealer loyalty credits"
  ON loyalty_credits FOR SELECT
  TO authenticated
  USING (
    dealer_id = auth.uid()
    OR get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = loyalty_credits.customer_id
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage own dealer loyalty credits"
  ON loyalty_credits FOR ALL
  TO authenticated
  USING (
    dealer_id = auth.uid()
    OR get_user_role() = 'admin'
  )
  WITH CHECK (
    dealer_id = auth.uid()
    OR get_user_role() = 'admin'
  );

-- =====================================================
-- 7. Add dealer_id to nps_surveys table
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nps_surveys' AND column_name = 'dealer_id'
  ) THEN
    ALTER TABLE nps_surveys ADD COLUMN dealer_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
    
    -- Set dealer_id from warranty's dealer_id
    UPDATE nps_surveys ns
    SET dealer_id = w.dealer_id
    FROM warranties w
    WHERE ns.warranty_id = w.id
    AND ns.dealer_id IS NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_nps_surveys_dealer_id ON nps_surveys(dealer_id);

-- Update nps_surveys RLS policies for dealer isolation
DROP POLICY IF EXISTS "Staff can view all NPS surveys" ON nps_surveys;
DROP POLICY IF EXISTS "Staff can manage NPS surveys" ON nps_surveys;

CREATE POLICY "Staff can view own dealer NPS surveys"
  ON nps_surveys FOR SELECT
  TO authenticated
  USING (
    dealer_id = auth.uid()
    OR get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = nps_surveys.customer_id
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage own dealer NPS surveys"
  ON nps_surveys FOR UPDATE
  TO authenticated
  USING (
    dealer_id = auth.uid()
    OR get_user_role() = 'admin'
  )
  WITH CHECK (
    dealer_id = auth.uid()
    OR get_user_role() = 'admin'
  );

-- =====================================================
-- 8. Create trigger to auto-set dealer_id on insert
-- =====================================================

-- Function to auto-set dealer_id for new records
CREATE OR REPLACE FUNCTION set_dealer_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If dealer_id is not set, use current user's ID
  IF NEW.dealer_id IS NULL THEN
    NEW.dealer_id := auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to customers
DROP TRIGGER IF EXISTS set_customer_dealer_id ON customers;
CREATE TRIGGER set_customer_dealer_id
  BEFORE INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION set_dealer_id();

-- Apply trigger to trailers
DROP TRIGGER IF EXISTS set_trailer_dealer_id ON trailers;
CREATE TRIGGER set_trailer_dealer_id
  BEFORE INSERT ON trailers
  FOR EACH ROW
  EXECUTE FUNCTION set_dealer_id();

-- Apply trigger to warranties
DROP TRIGGER IF EXISTS set_warranty_dealer_id ON warranties;
CREATE TRIGGER set_warranty_dealer_id
  BEFORE INSERT ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION set_dealer_id();

-- Apply trigger to claims
DROP TRIGGER IF EXISTS set_claim_dealer_id ON claims;
CREATE TRIGGER set_claim_dealer_id
  BEFORE INSERT ON claims
  FOR EACH ROW
  EXECUTE FUNCTION set_dealer_id();

-- Apply trigger to payments
DROP TRIGGER IF EXISTS set_payment_dealer_id ON payments;
CREATE TRIGGER set_payment_dealer_id
  BEFORE INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION set_dealer_id();
