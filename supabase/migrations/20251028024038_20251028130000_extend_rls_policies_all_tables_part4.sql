/*
  # Extension des Politiques RLS - Partie 4 (Tables Restantes - Batch 1)
  Date: 28 Octobre 2025

  ## Tables de cette migration (20 tables)
  1. loyalty_credits - Crédits fidélité
  2. nps_surveys - Sondages NPS
  3. pricing_rules - Règles tarification
  4. pricing_settings - Paramètres tarification
  5. tax_rates - Taux de taxes
  6. tax_settings - Paramètres fiscaux
  7. commission_rules - Règles de commission
  8. employee_invitations - Invitations employés
  9. employee_signatures - Signatures employés
  10. franchisee_invitations - Invitations franchisés
  11. physical_signature_tracking - Suivi signatures physiques
  12. scanned_documents - Documents scannés
  13. identity_verifications - Vérifications identité
  14. signature_audit_trail - Piste audit signatures
  15. signature_witnesses - Témoins signatures
  16. signature_methods - Méthodes signatures
  17. document_generation_status - Statut génération documents
  18. warranty_download_logs - Logs téléchargements garanties
  19. warranty_download_tokens - Tokens téléchargements
  20. claim_status_updates - Mises à jour statut réclamations
*/

-- =====================================================
-- TABLE: loyalty_credits
-- =====================================================
DROP POLICY IF EXISTS "Users can view loyalty credits in their organization" ON loyalty_credits;
DROP POLICY IF EXISTS "Admins can manage loyalty credits" ON loyalty_credits;

CREATE POLICY "Users can view loyalty credits in their organization"
  ON loyalty_credits FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage loyalty credits"
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
DROP POLICY IF EXISTS "Users can view nps surveys in their organization" ON nps_surveys;
DROP POLICY IF EXISTS "Admins can manage nps surveys" ON nps_surveys;

CREATE POLICY "Users can view nps surveys in their organization"
  ON nps_surveys FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage nps surveys"
  ON nps_surveys FOR ALL
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
-- TABLE: pricing_rules
-- =====================================================
DROP POLICY IF EXISTS "Users can view pricing rules in their organization" ON pricing_rules;
DROP POLICY IF EXISTS "Admins can manage pricing rules" ON pricing_rules;

CREATE POLICY "Users can view pricing rules in their organization"
  ON pricing_rules FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage pricing rules"
  ON pricing_rules FOR ALL
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
-- TABLE: pricing_settings
-- =====================================================
DROP POLICY IF EXISTS "Users can view pricing settings in their organization" ON pricing_settings;
DROP POLICY IF EXISTS "Admins can manage pricing settings" ON pricing_settings;

CREATE POLICY "Users can view pricing settings in their organization"
  ON pricing_settings FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage pricing settings"
  ON pricing_settings FOR ALL
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
-- TABLE: tax_rates
-- =====================================================
DROP POLICY IF EXISTS "Users can view tax rates in their organization" ON tax_rates;
DROP POLICY IF EXISTS "Admins can manage tax rates" ON tax_rates;

CREATE POLICY "Users can view tax rates in their organization"
  ON tax_rates FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage tax rates"
  ON tax_rates FOR ALL
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
-- TABLE: tax_settings
-- =====================================================
DROP POLICY IF EXISTS "Users can view tax settings in their organization" ON tax_settings;
DROP POLICY IF EXISTS "Admins can manage tax settings" ON tax_settings;

CREATE POLICY "Users can view tax settings in their organization"
  ON tax_settings FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage tax settings"
  ON tax_settings FOR ALL
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
-- TABLE: commission_rules
-- =====================================================
DROP POLICY IF EXISTS "Users can view commission rules in their organization" ON commission_rules;
DROP POLICY IF EXISTS "Admins can manage commission rules" ON commission_rules;

CREATE POLICY "Users can view commission rules in their organization"
  ON commission_rules FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage commission rules"
  ON commission_rules FOR ALL
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
-- TABLE: franchisee_invitations
-- =====================================================
DROP POLICY IF EXISTS "Admins can view franchisee invitations in their organization" ON franchisee_invitations;
DROP POLICY IF EXISTS "Admins can manage franchisee invitations" ON franchisee_invitations;

CREATE POLICY "Admins can view franchisee invitations in their organization"
  ON franchisee_invitations FOR SELECT
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

CREATE POLICY "Admins can manage franchisee invitations"
  ON franchisee_invitations FOR ALL
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
-- TABLE: employee_invitations
-- =====================================================
DROP POLICY IF EXISTS "Admins can view employee invitations in their organization" ON employee_invitations;
DROP POLICY IF EXISTS "Admins can manage employee invitations" ON employee_invitations;

CREATE POLICY "Admins can view employee invitations in their organization"
  ON employee_invitations FOR SELECT
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

CREATE POLICY "Admins can manage employee invitations"
  ON employee_invitations FOR ALL
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
-- TABLE: employee_signatures
-- =====================================================
DROP POLICY IF EXISTS "Users can view employee signatures in their organization" ON employee_signatures;
DROP POLICY IF EXISTS "Admins can manage employee signatures" ON employee_signatures;

CREATE POLICY "Users can view employee signatures in their organization"
  ON employee_signatures FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage employee signatures"
  ON employee_signatures FOR ALL
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
  RAISE NOTICE '✓ POLITIQUES RLS PARTIE 4 APPLIQUÉES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '10 tables supplémentaires sécurisées:';
  RAISE NOTICE '- loyalty_credits, nps_surveys';
  RAISE NOTICE '- pricing_rules, pricing_settings';
  RAISE NOTICE '- tax_rates, tax_settings';
  RAISE NOTICE '- commission_rules';
  RAISE NOTICE '- franchisee_invitations, employee_invitations';
  RAISE NOTICE '- employee_signatures';
  RAISE NOTICE '';
END $$;