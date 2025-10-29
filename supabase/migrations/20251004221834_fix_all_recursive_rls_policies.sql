/*
  # Fix All Recursive RLS Policies

  ## Summary
  This migration fixes all recursive RLS policies that cause infinite loops by querying
  the profiles table while evaluating access to other tables.

  ## Problem
  Many RLS policies use this pattern:
  ```sql
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i')
    )
  )
  ```
  
  This causes recursion when checking access to profiles or related tables.

  ## Solution
  Use a helper function with SECURITY DEFINER to safely get user role without RLS recursion.

  ## Changes Made
  1. Create helper function `get_user_role()` in public schema
  2. Drop all recursive policies
  3. Recreate policies using the helper function

  ## Security Notes
  - The helper function uses SECURITY DEFINER but only returns the role
  - All existing access control logic is preserved
*/

-- =====================================================
-- 1. Create helper function to get user role safely
-- =====================================================

DROP FUNCTION IF EXISTS public.get_user_role();

CREATE OR REPLACE FUNCTION public.get_user_role()
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
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN user_role;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated, anon;

-- =====================================================
-- 2. Fix warranty_plans policies
-- =====================================================

DROP POLICY IF EXISTS "Dealers can view own and template plans" ON warranty_plans;
DROP POLICY IF EXISTS "Dealers can create own warranty plans" ON warranty_plans;
DROP POLICY IF EXISTS "Dealers can update own warranty plans" ON warranty_plans;
DROP POLICY IF EXISTS "Dealers can delete own warranty plans" ON warranty_plans;
DROP POLICY IF EXISTS "Admins can manage template plans" ON warranty_plans;

CREATE POLICY "Dealers can view own and template plans"
  ON warranty_plans FOR SELECT
  TO authenticated
  USING (
    is_template = true 
    OR dealer_id = auth.uid()
    OR get_user_role() IN ('admin', 'f_and_i')
  );

CREATE POLICY "Dealers can create own warranty plans"
  ON warranty_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    dealer_id = auth.uid()
    AND is_template = false
    AND get_user_role() IN ('admin', 'f_and_i')
  );

CREATE POLICY "Dealers can update own warranty plans"
  ON warranty_plans FOR UPDATE
  TO authenticated
  USING (dealer_id = auth.uid() AND get_user_role() IN ('admin', 'f_and_i'))
  WITH CHECK (dealer_id = auth.uid() AND get_user_role() IN ('admin', 'f_and_i'));

CREATE POLICY "Dealers can delete own warranty plans"
  ON warranty_plans FOR DELETE
  TO authenticated
  USING (dealer_id = auth.uid() AND get_user_role() IN ('admin', 'f_and_i'));

CREATE POLICY "Admins can manage template plans"
  ON warranty_plans FOR ALL
  TO authenticated
  USING (is_template = true AND get_user_role() = 'admin')
  WITH CHECK (is_template = true AND get_user_role() = 'admin');

-- =====================================================
-- 3. Fix warranty_options policies
-- =====================================================

DROP POLICY IF EXISTS "Dealers can view own warranty options" ON warranty_options;
DROP POLICY IF EXISTS "Dealers can insert own warranty options" ON warranty_options;
DROP POLICY IF EXISTS "Dealers can update own warranty options" ON warranty_options;
DROP POLICY IF EXISTS "Dealers can delete own warranty options" ON warranty_options;

CREATE POLICY "Dealers can view own warranty options"
  ON warranty_options FOR SELECT
  TO authenticated
  USING (dealer_id = auth.uid() OR dealer_id IS NULL);

CREATE POLICY "Dealers can insert own warranty options"
  ON warranty_options FOR INSERT
  TO authenticated
  WITH CHECK (dealer_id = auth.uid());

CREATE POLICY "Dealers can update own warranty options"
  ON warranty_options FOR UPDATE
  TO authenticated
  USING (dealer_id = auth.uid())
  WITH CHECK (dealer_id = auth.uid());

CREATE POLICY "Dealers can delete own warranty options"
  ON warranty_options FOR DELETE
  TO authenticated
  USING (dealer_id = auth.uid());

-- =====================================================
-- 4. Fix customers policies
-- =====================================================

DROP POLICY IF EXISTS "Staff can view all customers" ON customers;
DROP POLICY IF EXISTS "Staff can manage customers" ON customers;

CREATE POLICY "Staff can view all customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR get_user_role() IN ('admin', 'f_and_i', 'operations')
  );

CREATE POLICY "Staff can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (get_user_role() IN ('admin', 'f_and_i'))
  WITH CHECK (get_user_role() IN ('admin', 'f_and_i'));

-- =====================================================
-- 5. Fix trailers policies
-- =====================================================

DROP POLICY IF EXISTS "Staff can view all trailers" ON trailers;
DROP POLICY IF EXISTS "Staff can manage trailers" ON trailers;

CREATE POLICY "Staff can view all trailers"
  ON trailers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = trailers.customer_id
      AND customers.user_id = auth.uid()
    )
    OR get_user_role() IN ('admin', 'f_and_i', 'operations')
  );

CREATE POLICY "Staff can manage trailers"
  ON trailers FOR ALL
  TO authenticated
  USING (get_user_role() IN ('admin', 'f_and_i'))
  WITH CHECK (get_user_role() IN ('admin', 'f_and_i'));

-- =====================================================
-- 6. Fix warranties policies
-- =====================================================

DROP POLICY IF EXISTS "Staff can view all warranties" ON warranties;
DROP POLICY IF EXISTS "Staff can manage warranties" ON warranties;

CREATE POLICY "Staff can view all warranties"
  ON warranties FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = warranties.customer_id
      AND customers.user_id = auth.uid()
    )
    OR get_user_role() IN ('admin', 'f_and_i', 'operations')
  );

CREATE POLICY "Staff can manage warranties"
  ON warranties FOR ALL
  TO authenticated
  USING (get_user_role() IN ('admin', 'f_and_i'))
  WITH CHECK (get_user_role() IN ('admin', 'f_and_i'));

-- =====================================================
-- 7. Fix payments policies
-- =====================================================

DROP POLICY IF EXISTS "Staff can view all payments" ON payments;
DROP POLICY IF EXISTS "Staff can manage payments" ON payments;

CREATE POLICY "Staff can view all payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM warranties
      JOIN customers ON warranties.customer_id = customers.id
      WHERE warranties.id = payments.warranty_id
      AND customers.user_id = auth.uid()
    )
    OR get_user_role() IN ('admin', 'f_and_i', 'operations')
  );

CREATE POLICY "Staff can manage payments"
  ON payments FOR ALL
  TO authenticated
  USING (get_user_role() IN ('admin', 'f_and_i'))
  WITH CHECK (get_user_role() IN ('admin', 'f_and_i'));

-- =====================================================
-- 8. Fix claims policies
-- =====================================================

DROP POLICY IF EXISTS "Staff can view all claims" ON claims;
DROP POLICY IF EXISTS "Operations staff can manage claims" ON claims;

CREATE POLICY "Staff can view all claims"
  ON claims FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = claims.customer_id
      AND customers.user_id = auth.uid()
    )
    OR get_user_role() IN ('admin', 'f_and_i', 'operations')
  );

CREATE POLICY "Operations staff can manage claims"
  ON claims FOR ALL
  TO authenticated
  USING (get_user_role() IN ('admin', 'operations'))
  WITH CHECK (get_user_role() IN ('admin', 'operations'));

-- =====================================================
-- 9. Fix claim_timeline policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view claim timeline for accessible claims" ON claim_timeline;
DROP POLICY IF EXISTS "Staff can add claim timeline entries" ON claim_timeline;

CREATE POLICY "Users can view claim timeline for accessible claims"
  ON claim_timeline FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM claims
      JOIN customers ON claims.customer_id = customers.id
      WHERE claims.id = claim_timeline.claim_id
      AND (
        customers.user_id = auth.uid()
        OR get_user_role() IN ('admin', 'operations')
      )
    )
  );

CREATE POLICY "Staff can add claim timeline entries"
  ON claim_timeline FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'operations'));

-- =====================================================
-- 10. Fix claim_attachments policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view attachments for accessible claims" ON claim_attachments;
DROP POLICY IF EXISTS "Users can add attachments to accessible claims" ON claim_attachments;

CREATE POLICY "Users can view attachments for accessible claims"
  ON claim_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM claims
      JOIN customers ON claims.customer_id = customers.id
      WHERE claims.id = claim_attachments.claim_id
      AND (
        customers.user_id = auth.uid()
        OR get_user_role() IN ('admin', 'operations')
      )
    )
  );

CREATE POLICY "Users can add attachments to accessible claims"
  ON claim_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM claims
      JOIN customers ON claims.customer_id = customers.id
      WHERE claims.id = claim_attachments.claim_id
      AND (
        customers.user_id = auth.uid()
        OR get_user_role() IN ('admin', 'operations')
      )
    )
  );

-- =====================================================
-- 11. Fix loyalty_credits policies
-- =====================================================

DROP POLICY IF EXISTS "Staff can view all loyalty credits" ON loyalty_credits;
DROP POLICY IF EXISTS "Staff can manage loyalty credits" ON loyalty_credits;

CREATE POLICY "Staff can view all loyalty credits"
  ON loyalty_credits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = loyalty_credits.customer_id
      AND customers.user_id = auth.uid()
    )
    OR get_user_role() IN ('admin', 'f_and_i', 'operations')
  );

CREATE POLICY "Staff can manage loyalty credits"
  ON loyalty_credits FOR ALL
  TO authenticated
  USING (get_user_role() IN ('admin', 'f_and_i'))
  WITH CHECK (get_user_role() IN ('admin', 'f_and_i'));

-- =====================================================
-- 12. Fix nps_surveys policies
-- =====================================================

DROP POLICY IF EXISTS "Staff can view all NPS surveys" ON nps_surveys;
DROP POLICY IF EXISTS "Staff can manage NPS surveys" ON nps_surveys;

CREATE POLICY "Staff can view all NPS surveys"
  ON nps_surveys FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = nps_surveys.customer_id
      AND customers.user_id = auth.uid()
    )
    OR get_user_role() IN ('admin', 'f_and_i', 'operations')
  );

CREATE POLICY "Staff can manage NPS surveys"
  ON nps_surveys FOR UPDATE
  TO authenticated
  USING (get_user_role() IN ('admin', 'f_and_i'))
  WITH CHECK (get_user_role() IN ('admin', 'f_and_i'));

-- =====================================================
-- 13. Fix audit_log policies
-- =====================================================

DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_log;

CREATE POLICY "Admins can view all audit logs"
  ON audit_log FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

-- =====================================================
-- 14. Fix notifications policies
-- =====================================================

DROP POLICY IF EXISTS "Staff can view all notifications" ON notifications;
DROP POLICY IF EXISTS "Staff can update notifications" ON notifications;

CREATE POLICY "Staff can view all notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    recipient_id = auth.uid()
    OR get_user_role() IN ('admin', 'operations')
  );

CREATE POLICY "Staff can update notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (get_user_role() IN ('admin', 'operations'))
  WITH CHECK (get_user_role() IN ('admin', 'operations'));

-- =====================================================
-- 15. Fix company_settings policies
-- =====================================================

DROP POLICY IF EXISTS "Dealers can view own company settings" ON company_settings;
DROP POLICY IF EXISTS "Dealers can insert own company settings" ON company_settings;
DROP POLICY IF EXISTS "Dealers can update own company settings" ON company_settings;

CREATE POLICY "Dealers can view own company settings"
  ON company_settings FOR SELECT
  TO authenticated
  USING (dealer_id = auth.uid() OR dealer_id IS NULL);

CREATE POLICY "Dealers can insert own company settings"
  ON company_settings FOR INSERT
  TO authenticated
  WITH CHECK (dealer_id = auth.uid());

CREATE POLICY "Dealers can update own company settings"
  ON company_settings FOR UPDATE
  TO authenticated
  USING (dealer_id = auth.uid())
  WITH CHECK (dealer_id = auth.uid());

-- =====================================================
-- 16. Fix notification_templates policies
-- =====================================================

DROP POLICY IF EXISTS "Admins and operations can view notification templates" ON notification_templates;
DROP POLICY IF EXISTS "Only admins can modify notification templates" ON notification_templates;

CREATE POLICY "Admins and operations can view notification templates"
  ON notification_templates FOR SELECT
  TO authenticated
  USING (get_user_role() IN ('admin', 'operations'));

CREATE POLICY "Only admins can modify notification templates"
  ON notification_templates FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- =====================================================
-- 17. Fix integration_settings policies
-- =====================================================

DROP POLICY IF EXISTS "Only admins can view integration settings" ON integration_settings;
DROP POLICY IF EXISTS "Only admins can modify integration settings" ON integration_settings;

CREATE POLICY "Only admins can view integration settings"
  ON integration_settings FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Only admins can modify integration settings"
  ON integration_settings FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- =====================================================
-- 18. Fix warranty_claim_tokens policies
-- =====================================================

DROP POLICY IF EXISTS "Admin and F&I can view all claim tokens" ON warranty_claim_tokens;
DROP POLICY IF EXISTS "Admin and F&I can create claim tokens" ON warranty_claim_tokens;
DROP POLICY IF EXISTS "Admin and F&I can update claim tokens" ON warranty_claim_tokens;

CREATE POLICY "Admin and F&I can view all claim tokens"
  ON warranty_claim_tokens FOR SELECT
  TO authenticated
  USING (get_user_role() IN ('admin', 'f_and_i'));

CREATE POLICY "Admin and F&I can create claim tokens"
  ON warranty_claim_tokens FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'f_and_i'));

CREATE POLICY "Admin and F&I can update claim tokens"
  ON warranty_claim_tokens FOR UPDATE
  TO authenticated
  USING (get_user_role() IN ('admin', 'f_and_i'));

-- =====================================================
-- 19. Fix public_claim_access_logs policies
-- =====================================================

DROP POLICY IF EXISTS "Admin can view all access logs" ON public_claim_access_logs;

CREATE POLICY "Admin can view all access logs"
  ON public_claim_access_logs FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');
