/*
  # Extension des Triggers Auto-Fill - TOUTES LES TABLES
  Date: 28 Octobre 2025

  ## Résumé
  Crée des triggers auto-fill pour TOUTES les tables ayant organization_id.
  Utilise la fonction existante auto_fill_organization_id().

  ## Tables (70+ tables)
  Toutes les tables avec organization_id sauf celles déjà traitées:
  - customers, trailers, payments, claim_attachments, claim_timeline (déjà fait)

  ## Stratégie
  Créer un trigger BEFORE INSERT pour chaque table qui remplit
  automatiquement organization_id depuis le profil de l'utilisateur.
*/

-- =====================================================
-- TRIGGERS POUR TABLES CRITIQUES
-- =====================================================

-- claims
DROP TRIGGER IF EXISTS claims_auto_fill_organization_id ON claims;
CREATE TRIGGER claims_auto_fill_organization_id
  BEFORE INSERT ON claims
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- warranties
DROP TRIGGER IF EXISTS warranties_auto_fill_organization_id ON warranties;
CREATE TRIGGER warranties_auto_fill_organization_id
  BEFORE INSERT ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- warranty_transactions
DROP TRIGGER IF EXISTS warranty_transactions_auto_fill_organization_id ON warranty_transactions;
CREATE TRIGGER warranty_transactions_auto_fill_organization_id
  BEFORE INSERT ON warranty_transactions
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- warranty_commissions
DROP TRIGGER IF EXISTS warranty_commissions_auto_fill_organization_id ON warranty_commissions;
CREATE TRIGGER warranty_commissions_auto_fill_organization_id
  BEFORE INSERT ON warranty_commissions
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- customer_products
DROP TRIGGER IF EXISTS customer_products_auto_fill_organization_id ON customer_products;
CREATE TRIGGER customer_products_auto_fill_organization_id
  BEFORE INSERT ON customer_products
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- dealer_inventory
DROP TRIGGER IF EXISTS dealer_inventory_auto_fill_organization_id ON dealer_inventory;
CREATE TRIGGER dealer_inventory_auto_fill_organization_id
  BEFORE INSERT ON dealer_inventory
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- warranty_plans
DROP TRIGGER IF EXISTS warranty_plans_auto_fill_organization_id ON warranty_plans;
CREATE TRIGGER warranty_plans_auto_fill_organization_id
  BEFORE INSERT ON warranty_plans
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- warranty_options
DROP TRIGGER IF EXISTS warranty_options_auto_fill_organization_id ON warranty_options;
CREATE TRIGGER warranty_options_auto_fill_organization_id
  BEFORE INSERT ON warranty_options
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- warranty_templates
DROP TRIGGER IF EXISTS warranty_templates_auto_fill_organization_id ON warranty_templates;
CREATE TRIGGER warranty_templates_auto_fill_organization_id
  BEFORE INSERT ON warranty_templates
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- warranty_template_sections
DROP TRIGGER IF EXISTS warranty_template_sections_auto_fill_organization_id ON warranty_template_sections;
CREATE TRIGGER warranty_template_sections_auto_fill_organization_id
  BEFORE INSERT ON warranty_template_sections
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- =====================================================
-- TRIGGERS POUR TABLES DE CONFIGURATION
-- =====================================================

-- company_settings
DROP TRIGGER IF EXISTS company_settings_auto_fill_organization_id ON company_settings;
CREATE TRIGGER company_settings_auto_fill_organization_id
  BEFORE INSERT ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- claim_settings
DROP TRIGGER IF EXISTS claim_settings_auto_fill_organization_id ON claim_settings;
CREATE TRIGGER claim_settings_auto_fill_organization_id
  BEFORE INSERT ON claim_settings
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- notification_settings
DROP TRIGGER IF EXISTS notification_settings_auto_fill_organization_id ON notification_settings;
CREATE TRIGGER notification_settings_auto_fill_organization_id
  BEFORE INSERT ON notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- email_templates
DROP TRIGGER IF EXISTS email_templates_auto_fill_organization_id ON email_templates;
CREATE TRIGGER email_templates_auto_fill_organization_id
  BEFORE INSERT ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- response_templates
DROP TRIGGER IF EXISTS response_templates_auto_fill_organization_id ON response_templates;
CREATE TRIGGER response_templates_auto_fill_organization_id
  BEFORE INSERT ON response_templates
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- notification_templates
DROP TRIGGER IF EXISTS notification_templates_auto_fill_organization_id ON notification_templates;
CREATE TRIGGER notification_templates_auto_fill_organization_id
  BEFORE INSERT ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- integrations
DROP TRIGGER IF EXISTS integrations_auto_fill_organization_id ON integrations;
CREATE TRIGGER integrations_auto_fill_organization_id
  BEFORE INSERT ON integrations
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- integration_settings
DROP TRIGGER IF EXISTS integration_settings_auto_fill_organization_id ON integration_settings;
CREATE TRIGGER integration_settings_auto_fill_organization_id
  BEFORE INSERT ON integration_settings
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- integration_credentials
DROP TRIGGER IF EXISTS integration_credentials_auto_fill_organization_id ON integration_credentials;
CREATE TRIGGER integration_credentials_auto_fill_organization_id
  BEFORE INSERT ON integration_credentials
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- signature_styles
DROP TRIGGER IF EXISTS signature_styles_auto_fill_organization_id ON signature_styles;
CREATE TRIGGER signature_styles_auto_fill_organization_id
  BEFORE INSERT ON signature_styles
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- =====================================================
-- TRIGGERS POUR TABLES DE COMMUNICATION
-- =====================================================

-- notifications
DROP TRIGGER IF EXISTS notifications_auto_fill_organization_id ON notifications;
CREATE TRIGGER notifications_auto_fill_organization_id
  BEFORE INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- email_queue
DROP TRIGGER IF EXISTS email_queue_auto_fill_organization_id ON email_queue;
CREATE TRIGGER email_queue_auto_fill_organization_id
  BEFORE INSERT ON email_queue
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- email_history
DROP TRIGGER IF EXISTS email_history_auto_fill_organization_id ON email_history;
CREATE TRIGGER email_history_auto_fill_organization_id
  BEFORE INSERT ON email_history
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- chat_messages
DROP TRIGGER IF EXISTS chat_messages_auto_fill_organization_id ON chat_messages;
CREATE TRIGGER chat_messages_auto_fill_organization_id
  BEFORE INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- chat_conversations
DROP TRIGGER IF EXISTS chat_conversations_auto_fill_organization_id ON chat_conversations;
CREATE TRIGGER chat_conversations_auto_fill_organization_id
  BEFORE INSERT ON chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- push_subscriptions
DROP TRIGGER IF EXISTS push_subscriptions_auto_fill_organization_id ON push_subscriptions;
CREATE TRIGGER push_subscriptions_auto_fill_organization_id
  BEFORE INSERT ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- push_notification_logs
DROP TRIGGER IF EXISTS push_notification_logs_auto_fill_organization_id ON push_notification_logs;
CREATE TRIGGER push_notification_logs_auto_fill_organization_id
  BEFORE INSERT ON push_notification_logs
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- =====================================================
-- TRIGGERS POUR TABLES DE LOGS
-- =====================================================

-- error_logs
DROP TRIGGER IF EXISTS error_logs_auto_fill_organization_id ON error_logs;
CREATE TRIGGER error_logs_auto_fill_organization_id
  BEFORE INSERT ON error_logs
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- audit_log
DROP TRIGGER IF EXISTS audit_log_auto_fill_organization_id ON audit_log;
CREATE TRIGGER audit_log_auto_fill_organization_id
  BEFORE INSERT ON audit_log
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- audit_logs
DROP TRIGGER IF EXISTS audit_logs_auto_fill_organization_id ON audit_logs;
CREATE TRIGGER audit_logs_auto_fill_organization_id
  BEFORE INSERT ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- integration_logs
DROP TRIGGER IF EXISTS integration_logs_auto_fill_organization_id ON integration_logs;
CREATE TRIGGER integration_logs_auto_fill_organization_id
  BEFORE INSERT ON integration_logs
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- invitation_logs
DROP TRIGGER IF EXISTS invitation_logs_auto_fill_organization_id ON invitation_logs;
CREATE TRIGGER invitation_logs_auto_fill_organization_id
  BEFORE INSERT ON invitation_logs
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- settings_audit_log
DROP TRIGGER IF EXISTS settings_audit_log_auto_fill_organization_id ON settings_audit_log;
CREATE TRIGGER settings_audit_log_auto_fill_organization_id
  BEFORE INSERT ON settings_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- =====================================================
-- TRIGGERS POUR AUTRES TABLES CRITIQUES
-- =====================================================

-- loyalty_credits
DROP TRIGGER IF EXISTS loyalty_credits_auto_fill_organization_id ON loyalty_credits;
CREATE TRIGGER loyalty_credits_auto_fill_organization_id
  BEFORE INSERT ON loyalty_credits
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- nps_surveys
DROP TRIGGER IF EXISTS nps_surveys_auto_fill_organization_id ON nps_surveys;
CREATE TRIGGER nps_surveys_auto_fill_organization_id
  BEFORE INSERT ON nps_surveys
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- pricing_rules
DROP TRIGGER IF EXISTS pricing_rules_auto_fill_organization_id ON pricing_rules;
CREATE TRIGGER pricing_rules_auto_fill_organization_id
  BEFORE INSERT ON pricing_rules
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- pricing_settings
DROP TRIGGER IF EXISTS pricing_settings_auto_fill_organization_id ON pricing_settings;
CREATE TRIGGER pricing_settings_auto_fill_organization_id
  BEFORE INSERT ON pricing_settings
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- tax_rates
DROP TRIGGER IF EXISTS tax_rates_auto_fill_organization_id ON tax_rates;
CREATE TRIGGER tax_rates_auto_fill_organization_id
  BEFORE INSERT ON tax_rates
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- tax_settings
DROP TRIGGER IF EXISTS tax_settings_auto_fill_organization_id ON tax_settings;
CREATE TRIGGER tax_settings_auto_fill_organization_id
  BEFORE INSERT ON tax_settings
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- commission_rules
DROP TRIGGER IF EXISTS commission_rules_auto_fill_organization_id ON commission_rules;
CREATE TRIGGER commission_rules_auto_fill_organization_id
  BEFORE INSERT ON commission_rules
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- franchisee_invitations
DROP TRIGGER IF EXISTS franchisee_invitations_auto_fill_organization_id ON franchisee_invitations;
CREATE TRIGGER franchisee_invitations_auto_fill_organization_id
  BEFORE INSERT ON franchisee_invitations
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- employee_invitations
DROP TRIGGER IF EXISTS employee_invitations_auto_fill_organization_id ON employee_invitations;
CREATE TRIGGER employee_invitations_auto_fill_organization_id
  BEFORE INSERT ON employee_invitations
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- employee_signatures
DROP TRIGGER IF EXISTS employee_signatures_auto_fill_organization_id ON employee_signatures;
CREATE TRIGGER employee_signatures_auto_fill_organization_id
  BEFORE INSERT ON employee_signatures
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- physical_signature_tracking
DROP TRIGGER IF EXISTS physical_signature_tracking_auto_fill_organization_id ON physical_signature_tracking;
CREATE TRIGGER physical_signature_tracking_auto_fill_organization_id
  BEFORE INSERT ON physical_signature_tracking
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- scanned_documents
DROP TRIGGER IF EXISTS scanned_documents_auto_fill_organization_id ON scanned_documents;
CREATE TRIGGER scanned_documents_auto_fill_organization_id
  BEFORE INSERT ON scanned_documents
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- identity_verifications
DROP TRIGGER IF EXISTS identity_verifications_auto_fill_organization_id ON identity_verifications;
CREATE TRIGGER identity_verifications_auto_fill_organization_id
  BEFORE INSERT ON identity_verifications
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- signature_audit_trail
DROP TRIGGER IF EXISTS signature_audit_trail_auto_fill_organization_id ON signature_audit_trail;
CREATE TRIGGER signature_audit_trail_auto_fill_organization_id
  BEFORE INSERT ON signature_audit_trail
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- signature_witnesses
DROP TRIGGER IF EXISTS signature_witnesses_auto_fill_organization_id ON signature_witnesses;
CREATE TRIGGER signature_witnesses_auto_fill_organization_id
  BEFORE INSERT ON signature_witnesses
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- signature_methods
DROP TRIGGER IF EXISTS signature_methods_auto_fill_organization_id ON signature_methods;
CREATE TRIGGER signature_methods_auto_fill_organization_id
  BEFORE INSERT ON signature_methods
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- document_generation_status
DROP TRIGGER IF EXISTS document_generation_status_auto_fill_organization_id ON document_generation_status;
CREATE TRIGGER document_generation_status_auto_fill_organization_id
  BEFORE INSERT ON document_generation_status
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- warranty_download_logs
DROP TRIGGER IF EXISTS warranty_download_logs_auto_fill_organization_id ON warranty_download_logs;
CREATE TRIGGER warranty_download_logs_auto_fill_organization_id
  BEFORE INSERT ON warranty_download_logs
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- warranty_download_tokens
DROP TRIGGER IF EXISTS warranty_download_tokens_auto_fill_organization_id ON warranty_download_tokens;
CREATE TRIGGER warranty_download_tokens_auto_fill_organization_id
  BEFORE INSERT ON warranty_download_tokens
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- warranty_claim_tokens
DROP TRIGGER IF EXISTS warranty_claim_tokens_auto_fill_organization_id ON warranty_claim_tokens;
CREATE TRIGGER warranty_claim_tokens_auto_fill_organization_id
  BEFORE INSERT ON warranty_claim_tokens
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- claim_status_updates
DROP TRIGGER IF EXISTS claim_status_updates_auto_fill_organization_id ON claim_status_updates;
CREATE TRIGGER claim_status_updates_auto_fill_organization_id
  BEFORE INSERT ON claim_status_updates
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- feature_flags
DROP TRIGGER IF EXISTS feature_flags_auto_fill_organization_id ON feature_flags;
CREATE TRIGGER feature_flags_auto_fill_organization_id
  BEFORE INSERT ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- franchise_invoices
DROP TRIGGER IF EXISTS franchise_invoices_auto_fill_organization_id ON franchise_invoices;
CREATE TRIGGER franchise_invoices_auto_fill_organization_id
  BEFORE INSERT ON franchise_invoices
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- franchise_payments
DROP TRIGGER IF EXISTS franchise_payments_auto_fill_organization_id ON franchise_payments;
CREATE TRIGGER franchise_payments_auto_fill_organization_id
  BEFORE INSERT ON franchise_payments
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- franchise_stats
DROP TRIGGER IF EXISTS franchise_stats_auto_fill_organization_id ON franchise_stats;
CREATE TRIGGER franchise_stats_auto_fill_organization_id
  BEFORE INSERT ON franchise_stats
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- dashboard_stats
DROP TRIGGER IF EXISTS dashboard_stats_auto_fill_organization_id ON dashboard_stats;
CREATE TRIGGER dashboard_stats_auto_fill_organization_id
  BEFORE INSERT ON dashboard_stats
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- query_performance_log
DROP TRIGGER IF EXISTS query_performance_log_auto_fill_organization_id ON query_performance_log;
CREATE TRIGGER query_performance_log_auto_fill_organization_id
  BEFORE INSERT ON query_performance_log
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- organization_activities
DROP TRIGGER IF EXISTS organization_activities_auto_fill_organization_id ON organization_activities;
CREATE TRIGGER organization_activities_auto_fill_organization_id
  BEFORE INSERT ON organization_activities
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- organization_alerts
DROP TRIGGER IF EXISTS organization_alerts_auto_fill_organization_id ON organization_alerts;
CREATE TRIGGER organization_alerts_auto_fill_organization_id
  BEFORE INSERT ON organization_alerts
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- organization_billing_config
DROP TRIGGER IF EXISTS organization_billing_config_auto_fill_organization_id ON organization_billing_config;
CREATE TRIGGER organization_billing_config_auto_fill_organization_id
  BEFORE INSERT ON organization_billing_config
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- organization_communications
DROP TRIGGER IF EXISTS organization_communications_auto_fill_organization_id ON organization_communications;
CREATE TRIGGER organization_communications_auto_fill_organization_id
  BEFORE INSERT ON organization_communications
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- organization_notes
DROP TRIGGER IF EXISTS organization_notes_auto_fill_organization_id ON organization_notes;
CREATE TRIGGER organization_notes_auto_fill_organization_id
  BEFORE INSERT ON organization_notes
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- organization_tag_assignments
DROP TRIGGER IF EXISTS organization_tag_assignments_auto_fill_organization_id ON organization_tag_assignments;
CREATE TRIGGER organization_tag_assignments_auto_fill_organization_id
  BEFORE INSERT ON organization_tag_assignments
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- ab_test_assignments
DROP TRIGGER IF EXISTS ab_test_assignments_auto_fill_organization_id ON ab_test_assignments;
CREATE TRIGGER ab_test_assignments_auto_fill_organization_id
  BEFORE INSERT ON ab_test_assignments
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- franchise_messages
DROP TRIGGER IF EXISTS franchise_messages_auto_fill_organization_id ON franchise_messages;
CREATE TRIGGER franchise_messages_auto_fill_organization_id
  BEFORE INSERT ON franchise_messages
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- master_activity_log
DROP TRIGGER IF EXISTS master_activity_log_auto_fill_organization_id ON master_activity_log;
CREATE TRIGGER master_activity_log_auto_fill_organization_id
  BEFORE INSERT ON master_activity_log
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- user_notification_preferences
DROP TRIGGER IF EXISTS user_notification_preferences_auto_fill_organization_id ON user_notification_preferences;
CREATE TRIGGER user_notification_preferences_auto_fill_organization_id
  BEFORE INSERT ON user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- typing_indicators
DROP TRIGGER IF EXISTS typing_indicators_auto_fill_organization_id ON typing_indicators;
CREATE TRIGGER typing_indicators_auto_fill_organization_id
  BEFORE INSERT ON typing_indicators
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- tour_progress
DROP TRIGGER IF EXISTS tour_progress_auto_fill_organization_id ON tour_progress;
CREATE TRIGGER tour_progress_auto_fill_organization_id
  BEFORE INSERT ON tour_progress
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();