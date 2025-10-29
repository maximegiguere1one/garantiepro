/*
  # Création de Toutes les Tables Manquantes - PARTIE 4: COMMUNICATION, INTÉGRATIONS, ORGANISATIONS
  Date: 28 Octobre 2025
  
  Tables créées (18 tables):
  
  COMMUNICATION (5):
  1. chat_conversations
  2. chat_messages
  3. claim_status_updates
  4. push_subscriptions
  5. typing_indicators
  
  INTÉGRATIONS (4):
  6. integrations
  7. integration_credentials
  8. integration_logs
  9. webhook_endpoints
  
  ORGANISATIONS (6):
  10. organization_activities
  11. organization_alerts
  12. organization_communications
  13. organization_notes
  14. organization_tags
  15. organization_tag_assignments
  
  PRÉFÉRENCES (3):
  16. user_notification_preferences
  17. tour_progress
  18. ab_test_assignments
*/

-- =====================================================
-- COMMUNICATION TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid REFERENCES claims(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  participants uuid[] NOT NULL,
  subject text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_claim ON chat_conversations(claim_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_org ON chat_conversations(organization_id);

ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org conversations"
  ON chat_conversations FOR SELECT
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    OR auth.uid() = ANY(participants)
  );

CREATE POLICY "Users can manage conversations"
  ON chat_conversations FOR ALL
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND auth.uid() = ANY(participants)
  );

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES chat_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conversation messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE id = chat_messages.conversation_id
      AND auth.uid() = ANY(participants)
    )
  );

CREATE POLICY "Users can send messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE id = conversation_id
      AND auth.uid() = ANY(participants)
    )
  );

CREATE TABLE IF NOT EXISTS claim_status_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid REFERENCES claims(id) ON DELETE CASCADE NOT NULL,
  old_status text,
  new_status text NOT NULL,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claim_status_updates_claim ON claim_status_updates(claim_id);

ALTER TABLE claim_status_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view claim status updates"
  ON claim_status_updates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM claims c
      JOIN warranties w ON w.id = c.warranty_id
      JOIN profiles p ON p.organization_id = w.organization_id
      WHERE c.id = claim_status_updates.claim_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert status updates"
  ON claim_status_updates FOR INSERT
  TO authenticated
  WITH CHECK (updated_by = auth.uid());

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own subscriptions"
  ON push_subscriptions FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS typing_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES chat_conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_typing boolean DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_typing_indicators_conversation ON typing_indicators(conversation_id);

ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view typing indicators"
  ON typing_indicators FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE id = typing_indicators.conversation_id
      AND auth.uid() = ANY(participants)
    )
  );

CREATE POLICY "Users can manage own typing status"
  ON typing_indicators FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- INTÉGRATIONS TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  integration_type text NOT NULL CHECK (integration_type IN ('quickbooks', 'stripe', 'mailchimp', 'twilio', 'other')),
  name text NOT NULL,
  is_enabled boolean DEFAULT false,
  config jsonb DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, integration_type)
);

CREATE INDEX IF NOT EXISTS idx_integrations_org ON integrations(organization_id);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage integrations"
  ON integrations FOR ALL
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin', 'franchisee_admin')
    )
  );

CREATE TABLE IF NOT EXISTS integration_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid REFERENCES integrations(id) ON DELETE CASCADE NOT NULL,
  credential_type text NOT NULL,
  encrypted_value text NOT NULL,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_credentials_integration ON integration_credentials(integration_id);

ALTER TABLE integration_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage credentials"
  ON integration_credentials FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM integrations i
      JOIN profiles p ON p.organization_id = i.organization_id
      WHERE i.id = integration_credentials.integration_id
      AND p.id = auth.uid()
      AND p.role IN ('master', 'admin')
    )
  );

CREATE TABLE IF NOT EXISTS integration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid REFERENCES integrations(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  request_data jsonb,
  response_data jsonb,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_logs_integration ON integration_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_created_at ON integration_logs(created_at);

ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view integration logs"
  ON integration_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM integrations i
      JOIN profiles p ON p.organization_id = i.organization_id
      WHERE i.id = integration_logs.integration_id
      AND p.id = auth.uid()
      AND p.role IN ('master', 'admin', 'franchisee_admin')
    )
  );

CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  endpoint_url text NOT NULL,
  events text[] NOT NULL,
  secret text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_org ON webhook_endpoints(organization_id);

ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage webhooks"
  ON webhook_endpoints FOR ALL
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin')
    )
  );

-- =====================================================
-- ORGANISATIONS AVANCÉES TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS organization_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL,
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organization_activities_org ON organization_activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_activities_created_at ON organization_activities(created_at);

ALTER TABLE organization_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org activities"
  ON organization_activities FOR SELECT
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS organization_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  alert_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organization_alerts_org ON organization_alerts(organization_id);

ALTER TABLE organization_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org alerts"
  ON organization_alerts FOR SELECT
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS organization_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  from_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  subject text NOT NULL,
  message text NOT NULL,
  sent_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organization_communications_org ON organization_communications(organization_id);

ALTER TABLE organization_communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org communications"
  ON organization_communications FOR SELECT
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS organization_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  note text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organization_notes_org ON organization_notes(organization_id);

ALTER TABLE organization_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage org notes"
  ON organization_notes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin')
    )
  );

CREATE TABLE IF NOT EXISTS organization_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE organization_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tags"
  ON organization_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage tags"
  ON organization_tags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin')
    )
  );

CREATE TABLE IF NOT EXISTS organization_tag_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  tag_id uuid REFERENCES organization_tags(id) ON DELETE CASCADE NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_tag_assignments_org ON organization_tag_assignments(organization_id);

ALTER TABLE organization_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tag assignments"
  ON organization_tag_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin')
    )
  );

-- =====================================================
-- PRÉFÉRENCES UTILISATEUR TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  sms_notifications boolean DEFAULT false,
  warranty_created boolean DEFAULT true,
  claim_submitted boolean DEFAULT true,
  claim_status_changed boolean DEFAULT true,
  payment_received boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user ON user_notification_preferences(user_id);

ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences"
  ON user_notification_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS tour_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  tour_id text NOT NULL,
  completed boolean DEFAULT false,
  current_step integer DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tour_id)
);

CREATE INDEX IF NOT EXISTS idx_tour_progress_user ON tour_progress(user_id);

ALTER TABLE tour_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tour progress"
  ON tour_progress FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS ab_test_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  test_id text NOT NULL,
  variant text NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, test_id)
);

CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_user ON ab_test_assignments(user_id);

ALTER TABLE ab_test_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own test assignments"
  ON ab_test_assignments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can assign tests"
  ON ab_test_assignments FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✓ PARTIE 4 TERMINÉE: 18 tables de communication, intégrations et organisations créées';
END $$;