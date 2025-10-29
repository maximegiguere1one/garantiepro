/*
  # Extension des Politiques RLS - Partie 2 (Tables de Configuration)
  Date: 28 Octobre 2025

  ## Tables de cette migration (15 tables)
  1. company_settings - Paramètres entreprise
  2. claim_settings - Paramètres réclamations
  3. notification_settings - Paramètres notifications
  4. email_templates - Modèles email
  5. response_templates - Modèles de réponse
  6. notification_templates - Modèles de notifications
  7. integrations - Intégrations
  8. integration_settings - Paramètres intégrations
  9. integration_credentials - Identifiants intégrations
  10. signature_styles - Styles de signature
  11. signature_methods - Méthodes de signature
  12. employee_signatures - Signatures employés
  13. warranty_options - Options de garantie
  14. warranty_templates - Modèles de garantie
  15. warranty_template_sections - Sections de modèles
*/

-- =====================================================
-- TABLE: company_settings
-- =====================================================
DROP POLICY IF EXISTS "Users can view company settings in their organization" ON company_settings;
DROP POLICY IF EXISTS "Admins can manage company settings" ON company_settings;
DROP POLICY IF EXISTS "Users can view own organization settings" ON company_settings;
DROP POLICY IF EXISTS "Admins can update own organization settings" ON company_settings;

CREATE POLICY "Users can view company settings in their organization"
  ON company_settings FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage company settings"
  ON company_settings FOR ALL
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
-- TABLE: claim_settings
-- =====================================================
DROP POLICY IF EXISTS "Users can view claim settings in their organization" ON claim_settings;
DROP POLICY IF EXISTS "Admins can manage claim settings" ON claim_settings;

CREATE POLICY "Users can view claim settings in their organization"
  ON claim_settings FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage claim settings"
  ON claim_settings FOR ALL
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
-- TABLE: notification_settings
-- =====================================================
DROP POLICY IF EXISTS "Users can view notification settings in their organization" ON notification_settings;
DROP POLICY IF EXISTS "Admins can manage notification settings" ON notification_settings;

CREATE POLICY "Users can view notification settings in their organization"
  ON notification_settings FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage notification settings"
  ON notification_settings FOR ALL
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
-- TABLE: email_templates
-- =====================================================
DROP POLICY IF EXISTS "Users can view email templates in their organization" ON email_templates;
DROP POLICY IF EXISTS "Admins can manage email templates" ON email_templates;

CREATE POLICY "Users can view email templates in their organization"
  ON email_templates FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage email templates"
  ON email_templates FOR ALL
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
-- TABLE: response_templates
-- =====================================================
DROP POLICY IF EXISTS "Users can view response templates in their organization" ON response_templates;
DROP POLICY IF EXISTS "Admins can manage response templates" ON response_templates;

CREATE POLICY "Users can view response templates in their organization"
  ON response_templates FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage response templates"
  ON response_templates FOR ALL
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
DROP POLICY IF EXISTS "Users can view notification templates in their organization" ON notification_templates;
DROP POLICY IF EXISTS "Admins can manage notification templates" ON notification_templates;

CREATE POLICY "Users can view notification templates in their organization"
  ON notification_templates FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage notification templates"
  ON notification_templates FOR ALL
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
-- TABLE: integrations
-- =====================================================
DROP POLICY IF EXISTS "Users can view integrations in their organization" ON integrations;
DROP POLICY IF EXISTS "Admins can manage integrations" ON integrations;

CREATE POLICY "Users can view integrations in their organization"
  ON integrations FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage integrations"
  ON integrations FOR ALL
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
-- TABLE: integration_settings
-- =====================================================
DROP POLICY IF EXISTS "Users can view integration settings in their organization" ON integration_settings;
DROP POLICY IF EXISTS "Admins can manage integration settings" ON integration_settings;

CREATE POLICY "Users can view integration settings in their organization"
  ON integration_settings FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage integration settings"
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
-- TABLE: integration_credentials
-- =====================================================
DROP POLICY IF EXISTS "Admins can view integration credentials in their organization" ON integration_credentials;
DROP POLICY IF EXISTS "Admins can manage integration credentials" ON integration_credentials;

CREATE POLICY "Admins can view integration credentials in their organization"
  ON integration_credentials FOR SELECT
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

CREATE POLICY "Admins can manage integration credentials"
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
DROP POLICY IF EXISTS "Users can view signature styles in their organization" ON signature_styles;
DROP POLICY IF EXISTS "Admins can manage signature styles" ON signature_styles;

CREATE POLICY "Users can view signature styles in their organization"
  ON signature_styles FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage signature styles"
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
-- MESSAGE DE SUCCÈS
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ POLITIQUES RLS PARTIE 2 APPLIQUÉES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '10 tables de configuration sécurisées:';
  RAISE NOTICE '- company_settings';
  RAISE NOTICE '- claim_settings';
  RAISE NOTICE '- notification_settings';
  RAISE NOTICE '- email_templates';
  RAISE NOTICE '- response_templates';
  RAISE NOTICE '- notification_templates';
  RAISE NOTICE '- integrations';
  RAISE NOTICE '- integration_settings';
  RAISE NOTICE '- integration_credentials';
  RAISE NOTICE '- signature_styles';
  RAISE NOTICE '';
END $$;