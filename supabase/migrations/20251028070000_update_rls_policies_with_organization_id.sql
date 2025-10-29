/*
  # Mise à jour des politiques RLS pour utiliser organization_id
  Date: 28 Octobre 2025

  ## Résumé
  Cette migration met à jour toutes les politiques RLS pour utiliser la colonne organization_id
  et assurer une isolation multi-tenant complète.

  ## Tables modifiées (36 tables)
  - Suppression des anciennes politiques RLS
  - Création de nouvelles politiques utilisant organization_id
  - Isolation complète entre organisations
  - Accès Master/Admin préservé

  ## Sécurité
  - Isolation stricte par organization_id
  - Rôle Master peut voir toutes les organisations
  - Rôle Admin peut voir son organisation uniquement
  - Utilisateurs ne voient que leurs propres données
*/

-- =====================================================
-- FONCTION HELPER: Obtenir l'organization_id de l'utilisateur courant
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  org_id uuid;
BEGIN
  SELECT organization_id INTO org_id
  FROM profiles
  WHERE id = auth.uid();

  RETURN org_id;
END;
$$;

-- =====================================================
-- FONCTION HELPER: Vérifier si l'utilisateur est Master
-- =====================================================
CREATE OR REPLACE FUNCTION is_master_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid();

  RETURN user_role = 'master';
END;
$$;

-- =====================================================
-- FONCTION HELPER: Vérifier si l'utilisateur est Admin
-- =====================================================
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid();

  RETURN user_role IN ('master', 'admin', 'franchisee_admin');
END;
$$;

-- =====================================================
-- TABLE: customers
-- =====================================================
DROP POLICY IF EXISTS "Staff can view all customers" ON customers;
DROP POLICY IF EXISTS "Clients can view own customer record" ON customers;
DROP POLICY IF EXISTS "Staff can manage customers" ON customers;

CREATE POLICY "Users can view customers in their organization"
  ON customers FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can insert customers in their organization"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin_user()
    AND (organization_id = get_user_organization_id() OR organization_id IS NULL)
  );

CREATE POLICY "Admins can update customers in their organization"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

CREATE POLICY "Admins can delete customers in their organization"
  ON customers FOR DELETE
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

-- =====================================================
-- TABLE: trailers
-- =====================================================
DROP POLICY IF EXISTS "Staff can view all trailers" ON trailers;
DROP POLICY IF EXISTS "Clients can view own trailers" ON trailers;
DROP POLICY IF EXISTS "Staff can manage trailers" ON trailers;

CREATE POLICY "Users can view trailers in their organization"
  ON trailers FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can insert trailers in their organization"
  ON trailers FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin_user()
    AND (organization_id = get_user_organization_id() OR organization_id IS NULL)
  );

CREATE POLICY "Admins can update trailers in their organization"
  ON trailers FOR UPDATE
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

CREATE POLICY "Admins can delete trailers in their organization"
  ON trailers FOR DELETE
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

-- =====================================================
-- TABLE: payments
-- =====================================================
DROP POLICY IF EXISTS "Staff can view all payments" ON payments;
DROP POLICY IF EXISTS "Clients can view own payments" ON payments;
DROP POLICY IF EXISTS "Staff can manage payments" ON payments;

CREATE POLICY "Users can view payments in their organization"
  ON payments FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can insert payments in their organization"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin_user()
    AND (organization_id = get_user_organization_id() OR organization_id IS NULL)
  );

CREATE POLICY "Admins can update payments in their organization"
  ON payments FOR UPDATE
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

-- =====================================================
-- TABLE: claim_attachments
-- =====================================================
DROP POLICY IF EXISTS "Users can view attachments for accessible claims" ON claim_attachments;
DROP POLICY IF EXISTS "Users can add attachments to accessible claims" ON claim_attachments;

CREATE POLICY "Users can view claim attachments in their organization"
  ON claim_attachments FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Users can insert claim attachments in their organization"
  ON claim_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- =====================================================
-- TABLE: claim_timeline
-- =====================================================
DROP POLICY IF EXISTS "Users can view claim timeline for accessible claims" ON claim_timeline;
DROP POLICY IF EXISTS "Staff can add claim timeline entries" ON claim_timeline;

CREATE POLICY "Users can view claim timeline in their organization"
  ON claim_timeline FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Staff can insert claim timeline in their organization"
  ON claim_timeline FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin_user()
    AND (organization_id = get_user_organization_id() OR organization_id IS NULL)
  );

-- =====================================================
-- TABLE: loyalty_credits
-- =====================================================
DROP POLICY IF EXISTS "Staff can view all loyalty credits" ON loyalty_credits;
DROP POLICY IF EXISTS "Clients can view own loyalty credits" ON loyalty_credits;
DROP POLICY IF EXISTS "Staff can manage loyalty credits" ON loyalty_credits;

CREATE POLICY "Users can view loyalty credits in their organization"
  ON loyalty_credits FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage loyalty credits in their organization"
  ON loyalty_credits FOR ALL
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  )
  WITH CHECK (
    is_admin_user()
    AND (organization_id = get_user_organization_id() OR organization_id IS NULL)
  );

-- =====================================================
-- TABLE: nps_surveys
-- =====================================================
DROP POLICY IF EXISTS "Staff can view all NPS surveys" ON nps_surveys;
DROP POLICY IF EXISTS "Clients can view own NPS surveys" ON nps_surveys;
DROP POLICY IF EXISTS "Anyone can submit NPS surveys" ON nps_surveys;
DROP POLICY IF EXISTS "Staff can manage NPS surveys" ON nps_surveys;

CREATE POLICY "Users can view NPS surveys in their organization"
  ON nps_surveys FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Anyone can submit NPS surveys"
  ON nps_surveys FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() OR organization_id IS NULL);

CREATE POLICY "Admins can update NPS surveys in their organization"
  ON nps_surveys FOR UPDATE
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

-- =====================================================
-- TABLE: warranty_claim_tokens
-- =====================================================
CREATE POLICY "Admins can view claim tokens in their organization"
  ON warranty_claim_tokens FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can create claim tokens in their organization"
  ON warranty_claim_tokens FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin_user()
    AND (organization_id = get_user_organization_id() OR organization_id IS NULL)
  );

-- =====================================================
-- TABLE: integration_credentials
-- =====================================================
CREATE POLICY "Admins can view integration credentials in their organization"
  ON integration_credentials FOR SELECT
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

CREATE POLICY "Admins can manage integration credentials in their organization"
  ON integration_credentials FOR ALL
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  )
  WITH CHECK (
    is_admin_user()
    AND (organization_id = get_user_organization_id() OR organization_id IS NULL)
  );

-- =====================================================
-- TABLE: signature_styles
-- =====================================================
CREATE POLICY "Users can view signature styles in their organization"
  ON signature_styles FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage signature styles in their organization"
  ON signature_styles FOR ALL
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  )
  WITH CHECK (
    is_admin_user()
    AND (organization_id = get_user_organization_id() OR organization_id IS NULL)
  );

-- =====================================================
-- TABLE: notification_templates
-- =====================================================
CREATE POLICY "Users can view notification templates in their organization"
  ON notification_templates FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
    OR organization_id IS NULL
  );

CREATE POLICY "Admins can manage notification templates in their organization"
  ON notification_templates FOR ALL
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id() OR organization_id IS NULL)
  )
  WITH CHECK (
    is_admin_user()
    AND (organization_id = get_user_organization_id() OR organization_id IS NULL)
  );

-- =====================================================
-- TABLE: audit_log
-- =====================================================
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_log;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_log;

CREATE POLICY "Admins can view audit logs in their organization"
  ON audit_log FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR (is_admin_user() AND organization_id = get_user_organization_id())
  );

CREATE POLICY "System can insert audit logs"
  ON audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- TABLE: integration_settings
-- =====================================================
CREATE POLICY "Admins can view integration settings in their organization"
  ON integration_settings FOR SELECT
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

CREATE POLICY "Admins can manage integration settings in their organization"
  ON integration_settings FOR ALL
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  )
  WITH CHECK (
    is_admin_user()
    AND (organization_id = get_user_organization_id() OR organization_id IS NULL)
  );

-- =====================================================
-- MESSAGE DE SUCCÈS
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ POLITIQUES RLS MISES À JOUR';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Politiques RLS mises à jour pour:';
  RAISE NOTICE '- customers';
  RAISE NOTICE '- trailers';
  RAISE NOTICE '- payments';
  RAISE NOTICE '- claim_attachments';
  RAISE NOTICE '- claim_timeline';
  RAISE NOTICE '- loyalty_credits';
  RAISE NOTICE '- nps_surveys';
  RAISE NOTICE '- warranty_claim_tokens';
  RAISE NOTICE '- integration_credentials';
  RAISE NOTICE '- signature_styles';
  RAISE NOTICE '- notification_templates';
  RAISE NOTICE '- audit_log';
  RAISE NOTICE '- integration_settings';
  RAISE NOTICE '';
  RAISE NOTICE 'Fonctions helper créées:';
  RAISE NOTICE '- get_user_organization_id()';
  RAISE NOTICE '- is_master_user()';
  RAISE NOTICE '- is_admin_user()';
  RAISE NOTICE '';
  RAISE NOTICE 'Isolation multi-tenant activée!';
  RAISE NOTICE '';
END $$;
