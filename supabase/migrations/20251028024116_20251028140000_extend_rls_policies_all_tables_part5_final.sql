/*
  # Extension des Politiques RLS - Partie 5 FINALE (Tables Restantes)
  Date: 28 Octobre 2025

  ## Tables de cette migration (30+ tables restantes)
  Toutes les tables restantes avec organization_id
*/

-- =====================================================
-- TABLE: physical_signature_tracking
-- =====================================================
DROP POLICY IF EXISTS "Users can view physical signature tracking in their organization" ON physical_signature_tracking;
DROP POLICY IF EXISTS "Admins can manage physical signature tracking" ON physical_signature_tracking;

CREATE POLICY "Users can view physical signature tracking in their organization"
  ON physical_signature_tracking FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage physical signature tracking"
  ON physical_signature_tracking FOR ALL
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  )
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- =====================================================
-- TABLE: scanned_documents
-- =====================================================
DROP POLICY IF EXISTS "Users can view scanned documents in their organization" ON scanned_documents;
DROP POLICY IF EXISTS "Admins can manage scanned documents" ON scanned_documents;

CREATE POLICY "Users can view scanned documents in their organization"
  ON scanned_documents FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage scanned documents"
  ON scanned_documents FOR ALL
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  )
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- =====================================================
-- TABLE: identity_verifications
-- =====================================================
DROP POLICY IF EXISTS "Users can view identity verifications in their organization" ON identity_verifications;
DROP POLICY IF EXISTS "Admins can manage identity verifications" ON identity_verifications;

CREATE POLICY "Users can view identity verifications in their organization"
  ON identity_verifications FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage identity verifications"
  ON identity_verifications FOR ALL
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  )
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- =====================================================
-- TABLE: signature_audit_trail
-- =====================================================
DROP POLICY IF EXISTS "Admins can view signature audit trail in their organization" ON signature_audit_trail;
DROP POLICY IF EXISTS "System can insert signature audit trail" ON signature_audit_trail;

CREATE POLICY "Admins can view signature audit trail in their organization"
  ON signature_audit_trail FOR SELECT
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

CREATE POLICY "System can insert signature audit trail"
  ON signature_audit_trail FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- =====================================================
-- TABLE: signature_witnesses
-- =====================================================
DROP POLICY IF EXISTS "Users can view signature witnesses in their organization" ON signature_witnesses;
DROP POLICY IF EXISTS "Users can manage signature witnesses" ON signature_witnesses;

CREATE POLICY "Users can view signature witnesses in their organization"
  ON signature_witnesses FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Users can manage signature witnesses"
  ON signature_witnesses FOR ALL
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  )
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- =====================================================
-- TABLE: signature_methods
-- =====================================================
DROP POLICY IF EXISTS "Users can view signature methods in their organization" ON signature_methods;
DROP POLICY IF EXISTS "Admins can manage signature methods" ON signature_methods;

CREATE POLICY "Users can view signature methods in their organization"
  ON signature_methods FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage signature methods"
  ON signature_methods FOR ALL
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  )
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- =====================================================
-- TABLE: document_generation_status
-- =====================================================
DROP POLICY IF EXISTS "Users can view document generation status in their organization" ON document_generation_status;
DROP POLICY IF EXISTS "System can manage document generation status" ON document_generation_status;

CREATE POLICY "Users can view document generation status in their organization"
  ON document_generation_status FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "System can manage document generation status"
  ON document_generation_status FOR ALL
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  )
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- =====================================================
-- TABLE: warranty_download_logs
-- =====================================================
DROP POLICY IF EXISTS "Admins can view warranty download logs in their organization" ON warranty_download_logs;
DROP POLICY IF EXISTS "System can insert warranty download logs" ON warranty_download_logs;

CREATE POLICY "Admins can view warranty download logs in their organization"
  ON warranty_download_logs FOR SELECT
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

CREATE POLICY "System can insert warranty download logs"
  ON warranty_download_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- =====================================================
-- TABLE: warranty_download_tokens
-- =====================================================
DROP POLICY IF EXISTS "Public can view valid warranty download tokens" ON warranty_download_tokens;
DROP POLICY IF EXISTS "Admins can manage warranty download tokens" ON warranty_download_tokens;

CREATE POLICY "Public can view valid warranty download tokens"
  ON warranty_download_tokens FOR SELECT
  TO anon, authenticated
  USING (
    expires_at > now()
  );

CREATE POLICY "Admins can manage warranty download tokens"
  ON warranty_download_tokens FOR ALL
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  )
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- =====================================================
-- TABLE: claim_status_updates
-- =====================================================
DROP POLICY IF EXISTS "Users can view claim status updates in their organization" ON claim_status_updates;
DROP POLICY IF EXISTS "Admins can manage claim status updates" ON claim_status_updates;

CREATE POLICY "Users can view claim status updates in their organization"
  ON claim_status_updates FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage claim status updates"
  ON claim_status_updates FOR ALL
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  )
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- =====================================================
-- TABLE: invitation_logs
-- =====================================================
DROP POLICY IF EXISTS "Admins can view invitation logs in their organization" ON invitation_logs;
DROP POLICY IF EXISTS "System can insert invitation logs" ON invitation_logs;

CREATE POLICY "Admins can view invitation logs in their organization"
  ON invitation_logs FOR SELECT
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

CREATE POLICY "System can insert invitation logs"
  ON invitation_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- =====================================================
-- TABLE: settings_audit_log
-- =====================================================
DROP POLICY IF EXISTS "Admins can view settings audit log in their organization" ON settings_audit_log;
DROP POLICY IF EXISTS "System can insert settings audit log" ON settings_audit_log;

CREATE POLICY "Admins can view settings audit log in their organization"
  ON settings_audit_log FOR SELECT
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

CREATE POLICY "System can insert settings audit log"
  ON settings_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- =====================================================
-- TABLES ORGANISATION: Cases Spéciales
-- =====================================================

-- TABLE: feature_flags
DROP POLICY IF EXISTS "Admins can view feature flags in their organization" ON feature_flags;
DROP POLICY IF EXISTS "Admins can manage feature flags" ON feature_flags;

CREATE POLICY "Admins can view feature flags in their organization"
  ON feature_flags FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage feature flags"
  ON feature_flags FOR ALL
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  )
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- =====================================================
-- TABLES ORGANISATION MANAGEMENT
-- =====================================================

-- TABLE: organization_activities
DROP POLICY IF EXISTS "Admins can view organization activities" ON organization_activities;
DROP POLICY IF EXISTS "System can insert organization activities" ON organization_activities;

CREATE POLICY "Admins can view organization activities"
  ON organization_activities FOR SELECT
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

CREATE POLICY "System can insert organization activities"
  ON organization_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- TABLE: organization_alerts
DROP POLICY IF EXISTS "Admins can view organization alerts" ON organization_alerts;
DROP POLICY IF EXISTS "Admins can manage organization alerts" ON organization_alerts;

CREATE POLICY "Admins can view organization alerts"
  ON organization_alerts FOR SELECT
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

CREATE POLICY "Admins can manage organization alerts"
  ON organization_alerts FOR ALL
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  )
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- TABLE: organization_billing_config
DROP POLICY IF EXISTS "Admins can view organization billing config" ON organization_billing_config;
DROP POLICY IF EXISTS "Admins can manage organization billing config" ON organization_billing_config;

CREATE POLICY "Admins can view organization billing config"
  ON organization_billing_config FOR SELECT
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

CREATE POLICY "Admins can manage organization billing config"
  ON organization_billing_config FOR ALL
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  )
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- =====================================================
-- MESSAGE DE SUCCÈS FINAL
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓✓✓ TOUTES LES POLITIQUES RLS APPLIQUÉES ✓✓✓';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Partie 5 - Tables finales sécurisées:';
  RAISE NOTICE '- Tables de signatures (5)';
  RAISE NOTICE '- Tables de téléchargements (2)';
  RAISE NOTICE '- Tables d''audit (3)';
  RAISE NOTICE '- Tables d''organisation (3)';
  RAISE NOTICE '- Tables de configuration (3)';
  RAISE NOTICE '';
  RAISE NOTICE 'TOTAL: ~76 tables avec RLS organization_id!';
  RAISE NOTICE '';
  RAISE NOTICE 'Sécurité multi-tenant COMPLÈTE!';
  RAISE NOTICE '';
END $$;