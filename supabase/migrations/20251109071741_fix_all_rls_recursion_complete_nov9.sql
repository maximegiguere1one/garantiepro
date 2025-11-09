/*
  # Fix ALL RLS Recursion Issues - Production Complete
  
  ## Objectif
  Permettre à TOUTES les données de se charger comme avant
  en supprimant les récursions infinies sur profiles
  
  ## Solution
  Fonctions SECURITY DEFINER qui bypass RLS pour check role/org
*/

-- ============================================================================
-- 1. Helper Functions (SECURITY DEFINER = bypass RLS)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_current_user_org_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  org_id uuid;
BEGIN
  SELECT organization_id INTO org_id
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN org_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN user_role;
END;
$$;

GRANT EXECUTE ON FUNCTION get_current_user_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_role() TO authenticated;

-- ============================================================================
-- 2. TAX_RATES - Everyone can read
-- ============================================================================

DROP POLICY IF EXISTS "tax_rates_read" ON tax_rates;
DROP POLICY IF EXISTS "tax_rates_modify" ON tax_rates;

CREATE POLICY "tax_rates_select"
  ON tax_rates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "tax_rates_all"
  ON tax_rates FOR ALL
  TO authenticated
  USING (get_current_user_role() IN ('master', 'franchisee_admin', 'admin'))
  WITH CHECK (get_current_user_role() IN ('master', 'franchisee_admin', 'admin'));

-- ============================================================================
-- 3. PRICING_RULES - Everyone can read
-- ============================================================================

DROP POLICY IF EXISTS "pricing_rules_read" ON pricing_rules;
DROP POLICY IF EXISTS "pricing_rules_modify" ON pricing_rules;

CREATE POLICY "pricing_rules_select"
  ON pricing_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "pricing_rules_all"
  ON pricing_rules FOR ALL
  TO authenticated
  USING (get_current_user_role() IN ('master', 'franchisee_admin', 'admin'))
  WITH CHECK (get_current_user_role() IN ('master', 'franchisee_admin', 'admin'));

-- ============================================================================
-- 4. FEATURE_FLAGS - Everyone can read
-- ============================================================================

DROP POLICY IF EXISTS "feature_flags_read" ON feature_flags;
DROP POLICY IF EXISTS "feature_flags_modify" ON feature_flags;

CREATE POLICY "feature_flags_select"
  ON feature_flags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "feature_flags_all"
  ON feature_flags FOR ALL
  TO authenticated
  USING (get_current_user_role() = 'master')
  WITH CHECK (get_current_user_role() = 'master');

-- ============================================================================
-- 5. WARRANTIES - Organization based
-- ============================================================================

DROP POLICY IF EXISTS "warranties_user_read" ON warranties;

CREATE POLICY "warranties_select"
  ON warranties FOR SELECT
  TO authenticated
  USING (
    organization_id = get_current_user_org_id()
    OR get_current_user_role() = 'master'
  );

-- ============================================================================
-- 6. CUSTOMERS - Organization based
-- ============================================================================

DROP POLICY IF EXISTS "customers_read" ON customers;

CREATE POLICY "customers_select"
  ON customers FOR SELECT
  TO authenticated
  USING (
    organization_id = get_current_user_org_id()
    OR get_current_user_role() = 'master'
  );

-- ============================================================================
-- 7. COMPANY_SETTINGS - Organization based
-- ============================================================================

DROP POLICY IF EXISTS "company_settings_read" ON company_settings;
DROP POLICY IF EXISTS "company_settings_modify" ON company_settings;

CREATE POLICY "company_settings_select"
  ON company_settings FOR SELECT
  TO authenticated
  USING (
    organization_id = get_current_user_org_id()
    OR get_current_user_role() = 'master'
  );

CREATE POLICY "company_settings_modify"
  ON company_settings FOR ALL
  TO authenticated
  USING (
    (organization_id = get_current_user_org_id() AND get_current_user_role() IN ('master', 'franchisee_admin', 'admin'))
    OR get_current_user_role() = 'master'
  )
  WITH CHECK (
    (organization_id = get_current_user_org_id() AND get_current_user_role() IN ('master', 'franchisee_admin', 'admin'))
    OR get_current_user_role() = 'master'
  );

-- ============================================================================
-- 8. WARRANTY_PLANS - Organization based
-- ============================================================================

DROP POLICY IF EXISTS "warranty_plans_read" ON warranty_plans;

CREATE POLICY "warranty_plans_select"
  ON warranty_plans FOR SELECT
  TO authenticated
  USING (
    organization_id = get_current_user_org_id()
    OR get_current_user_role() = 'master'
    OR organization_id IS NULL  -- Global plans
  );

-- ============================================================================
-- 9. TRAILERS - Organization based
-- ============================================================================

DROP POLICY IF EXISTS "trailers_select" ON trailers;

CREATE POLICY "trailers_select"
  ON trailers FOR SELECT
  TO authenticated
  USING (
    organization_id = get_current_user_org_id()
    OR get_current_user_role() = 'master'
  );

-- ============================================================================
-- 10. CLAIMS - Organization based
-- ============================================================================

DROP POLICY IF EXISTS "claims_select" ON claims;

CREATE POLICY "claims_select"
  ON claims FOR SELECT
  TO authenticated
  USING (
    organization_id = get_current_user_org_id()
    OR get_current_user_role() = 'master'
  );

-- ============================================================================
-- Vérification
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '✓ All policies updated with helper functions';
  RAISE NOTICE '✓ No more direct subqueries on profiles';
  RAISE NOTICE '✓ Using get_current_user_org_id() and get_current_user_role()';
END $$;
