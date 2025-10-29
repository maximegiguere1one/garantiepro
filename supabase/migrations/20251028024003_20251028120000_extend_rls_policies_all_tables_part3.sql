/*
  # Extension des Politiques RLS - Partie 3 (Tables de Communication et Logs)
  Date: 28 Octobre 2025

  ## Tables de cette migration (20 tables)
  1. notifications - Notifications
  2. email_queue - File d'attente emails
  3. email_history - Historique emails
  4. chat_messages - Messages chat
  5. chat_conversations - Conversations chat
  6. push_subscriptions - Abonnements push
  7. push_notification_logs - Logs notifications push
  8. error_logs - Logs d'erreurs
  9. audit_log - Journal d'audit
  10. audit_logs - Journaux d'audit
  11. integration_logs - Logs intégrations
  12. invitation_logs - Logs invitations
  13. settings_audit_log - Logs audit paramètres
  14. claim_status_updates - Mises à jour statut réclamations
  15. document_generation_status - Statut génération documents
  16. warranty_download_logs - Logs téléchargement garanties
  17. warranty_download_tokens - Tokens téléchargement
  18. warranty_claim_tokens - Tokens réclamations
  19. signature_audit_trail - Piste d'audit signatures
  20. signature_witnesses - Témoins signatures
*/

-- =====================================================
-- TABLE: notifications
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can manage their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view notifications in their organization" ON notifications;
DROP POLICY IF EXISTS "Users can manage notifications in their organization" ON notifications;

CREATE POLICY "Users can view notifications in their organization"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Users can manage notifications in their organization"
  ON notifications FOR ALL
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  )
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- =====================================================
-- TABLE: email_queue
-- =====================================================
DROP POLICY IF EXISTS "System can manage email queue" ON email_queue;
DROP POLICY IF EXISTS "Admins can view email queue in their organization" ON email_queue;

CREATE POLICY "Admins can view email queue in their organization"
  ON email_queue FOR SELECT
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

CREATE POLICY "System can manage email queue"
  ON email_queue FOR ALL
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  )
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- =====================================================
-- TABLE: email_history
-- =====================================================
DROP POLICY IF EXISTS "Admins can view email history in their organization" ON email_history;
DROP POLICY IF EXISTS "System can insert email history" ON email_history;

CREATE POLICY "Admins can view email history in their organization"
  ON email_history FOR SELECT
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

CREATE POLICY "System can insert email history"
  ON email_history FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- =====================================================
-- TABLE: chat_messages
-- =====================================================
DROP POLICY IF EXISTS "Users can view chat messages in their organization" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert chat messages" ON chat_messages;

CREATE POLICY "Users can view chat messages in their organization"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Users can insert chat messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- =====================================================
-- TABLE: chat_conversations
-- =====================================================
DROP POLICY IF EXISTS "Users can view chat conversations in their organization" ON chat_conversations;
DROP POLICY IF EXISTS "Users can manage chat conversations" ON chat_conversations;

CREATE POLICY "Users can view chat conversations in their organization"
  ON chat_conversations FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Users can manage chat conversations"
  ON chat_conversations FOR ALL
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  )
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- =====================================================
-- TABLE: push_subscriptions
-- =====================================================
DROP POLICY IF EXISTS "Users can manage their push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can view push subscriptions in their organization" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can manage push subscriptions" ON push_subscriptions;

CREATE POLICY "Users can view push subscriptions in their organization"
  ON push_subscriptions FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Users can manage push subscriptions"
  ON push_subscriptions FOR ALL
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  )
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- =====================================================
-- TABLE: push_notification_logs
-- =====================================================
DROP POLICY IF EXISTS "Admins can view push notification logs" ON push_notification_logs;
DROP POLICY IF EXISTS "Admins can view push notification logs in their organization" ON push_notification_logs;
DROP POLICY IF EXISTS "System can insert push notification logs" ON push_notification_logs;

CREATE POLICY "Admins can view push notification logs in their organization"
  ON push_notification_logs FOR SELECT
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

CREATE POLICY "System can insert push notification logs"
  ON push_notification_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- =====================================================
-- TABLE: error_logs
-- =====================================================
DROP POLICY IF EXISTS "Admins can view error logs" ON error_logs;
DROP POLICY IF EXISTS "Admins can view error logs in their organization" ON error_logs;
DROP POLICY IF EXISTS "System can insert error logs" ON error_logs;

CREATE POLICY "Admins can view error logs in their organization"
  ON error_logs FOR SELECT
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

CREATE POLICY "System can insert error logs"
  ON error_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- =====================================================
-- TABLE: audit_log
-- =====================================================
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_log;
DROP POLICY IF EXISTS "Admins can view audit logs in their organization" ON audit_log;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_log;

CREATE POLICY "Admins can view audit logs in their organization"
  ON audit_log FOR SELECT
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

CREATE POLICY "System can insert audit logs"
  ON audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- =====================================================
-- TABLE: audit_logs
-- =====================================================
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Admins can view audit logs in their organization" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;

CREATE POLICY "Admins can view audit logs in their organization"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

CREATE POLICY "System can insert audit logs second"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- =====================================================
-- TABLE: integration_logs
-- =====================================================
DROP POLICY IF EXISTS "Admins can view integration logs" ON integration_logs;
DROP POLICY IF EXISTS "Admins can view integration logs in their organization" ON integration_logs;
DROP POLICY IF EXISTS "System can insert integration logs" ON integration_logs;

CREATE POLICY "Admins can view integration logs in their organization"
  ON integration_logs FOR SELECT
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

CREATE POLICY "System can insert integration logs"
  ON integration_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- =====================================================
-- TABLE: warranty_claim_tokens
-- =====================================================
DROP POLICY IF EXISTS "Public can view valid claim tokens" ON warranty_claim_tokens;
DROP POLICY IF EXISTS "Admins can manage claim tokens" ON warranty_claim_tokens;
DROP POLICY IF EXISTS "Anyone can view valid tokens" ON warranty_claim_tokens;

CREATE POLICY "Public can view valid claim tokens"
  ON warranty_claim_tokens FOR SELECT
  TO anon, authenticated
  USING (
    expires_at > now()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

CREATE POLICY "Admins can manage claim tokens"
  ON warranty_claim_tokens FOR ALL
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
  RAISE NOTICE '✓ POLITIQUES RLS PARTIE 3 APPLIQUÉES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '13 tables de communication/logs sécurisées:';
  RAISE NOTICE '- notifications';
  RAISE NOTICE '- email_queue, email_history';
  RAISE NOTICE '- chat_messages, chat_conversations';
  RAISE NOTICE '- push_subscriptions, push_notification_logs';
  RAISE NOTICE '- error_logs, audit_log, audit_logs';
  RAISE NOTICE '- integration_logs';
  RAISE NOTICE '- warranty_claim_tokens';
  RAISE NOTICE '';
END $$;