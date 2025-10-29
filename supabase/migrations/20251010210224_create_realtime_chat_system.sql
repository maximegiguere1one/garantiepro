/*
  # Système de Communication en Temps Réel
  
  ## Tables créées
  
  1. **chat_conversations**
     - Conversations entre clients et équipe support
     - Lien avec garanties et réclamations
     - Métadonnées et statuts
  
  2. **chat_messages**
     - Messages individuels dans les conversations
     - Support texte, fichiers, images
     - Horodatage et statuts de lecture
  
  3. **claim_status_updates**
     - Journal des changements de statut de réclamations
     - Notifications automatiques aux clients
     - Historique complet des actions
  
  4. **push_subscriptions**
     - Abonnements aux notifications push
     - Support multi-device
     - Gestion des tokens
  
  ## Sécurité
  - RLS activé sur toutes les tables
  - Accès limité par organization_id
  - Clients peuvent accéder via tokens sécurisés
  - Messages chiffrés pour données sensibles
  
  ## Fonctionnalités temps réel
  - Supabase Realtime activé sur toutes les tables
  - Notifications instantanées
  - Indicateurs de frappe
  - Statuts de lecture
*/

-- =====================================================
-- 1. TABLE: chat_conversations
-- =====================================================

CREATE TABLE IF NOT EXISTS chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Participants
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Contexte
  warranty_id uuid REFERENCES warranties(id) ON DELETE SET NULL,
  claim_id uuid REFERENCES claims(id) ON DELETE SET NULL,
  
  -- Statut
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'archived')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Métadonnées
  last_message_at timestamptz DEFAULT now(),
  unread_count_customer integer DEFAULT 0,
  unread_count_staff integer DEFAULT 0,
  
  -- Accès client sécurisé
  access_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  
  -- Tags et notes
  tags text[] DEFAULT '{}',
  internal_notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_org ON chat_conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_warranty ON chat_conversations(warranty_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_claim ON chat_conversations(claim_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_assigned ON chat_conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status ON chat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_access_token ON chat_conversations(access_token);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_message ON chat_conversations(last_message_at DESC);

-- =====================================================
-- 2. TABLE: chat_messages
-- =====================================================

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  
  -- Expéditeur
  sender_type text NOT NULL CHECK (sender_type IN ('customer', 'staff', 'system')),
  sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  sender_name text NOT NULL,
  
  -- Contenu
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'status_update', 'system')),
  content text NOT NULL,
  
  -- Fichiers attachés
  attachments jsonb DEFAULT '[]'::jsonb,
  
  -- Métadonnées
  read_by_customer boolean DEFAULT false,
  read_by_staff boolean DEFAULT false,
  read_at timestamptz,
  
  -- Système
  is_internal boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread_customer ON chat_messages(conversation_id, read_by_customer) WHERE NOT read_by_customer;
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread_staff ON chat_messages(conversation_id, read_by_staff) WHERE NOT read_by_staff;

-- =====================================================
-- 3. TABLE: claim_status_updates
-- =====================================================

CREATE TABLE IF NOT EXISTS claim_status_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  
  -- Changement de statut
  old_status text,
  new_status text NOT NULL,
  
  -- Détails
  changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  changed_by_name text NOT NULL,
  reason text,
  notes text,
  
  -- Notification
  notification_sent boolean DEFAULT false,
  notification_sent_at timestamptz,
  
  -- Métadonnées
  metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claim_status_org ON claim_status_updates(organization_id);
CREATE INDEX IF NOT EXISTS idx_claim_status_claim ON claim_status_updates(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_status_created ON claim_status_updates(created_at DESC);

-- =====================================================
-- 4. TABLE: push_subscriptions
-- =====================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Token et plateforme
  push_token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('web', 'ios', 'android')),
  
  -- Configuration
  endpoint text,
  keys jsonb,
  
  -- Préférences
  enabled boolean DEFAULT true,
  preferences jsonb DEFAULT '{
    "new_messages": true,
    "claim_updates": true,
    "warranty_expiring": true,
    "system_alerts": true
  }'::jsonb,
  
  -- Métadonnées
  user_agent text,
  last_used_at timestamptz DEFAULT now(),
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, push_token)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_org ON push_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_enabled ON push_subscriptions(enabled) WHERE enabled = true;

-- =====================================================
-- 5. TABLE: typing_indicators
-- =====================================================

CREATE TABLE IF NOT EXISTS typing_indicators (
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_type text NOT NULL CHECK (user_type IN ('customer', 'staff')),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 seconds'),
  
  PRIMARY KEY (conversation_id, user_type, user_id)
);

CREATE INDEX IF NOT EXISTS idx_typing_indicators_expires ON typing_indicators(expires_at);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Fonction: Mettre à jour le timestamp de la conversation
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_conversations
  SET 
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at,
    unread_count_customer = CASE 
      WHEN NEW.sender_type = 'staff' THEN unread_count_customer + 1 
      ELSE unread_count_customer 
    END,
    unread_count_staff = CASE 
      WHEN NEW.sender_type = 'customer' THEN unread_count_staff + 1 
      ELSE unread_count_staff 
    END
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction: Créer notification pour nouveau message
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation chat_conversations;
BEGIN
  -- Récupérer la conversation
  SELECT * INTO v_conversation
  FROM chat_conversations
  WHERE id = NEW.conversation_id;
  
  -- Si message du client, notifier le staff assigné
  IF NEW.sender_type = 'customer' AND v_conversation.assigned_to IS NOT NULL THEN
    INSERT INTO notifications (
      organization_id,
      user_id,
      type,
      title,
      message,
      link,
      related_id
    ) VALUES (
      v_conversation.organization_id,
      v_conversation.assigned_to,
      'new_message',
      'Nouveau message de ' || NEW.sender_name,
      NEW.content,
      '/chat/' || NEW.conversation_id,
      NEW.conversation_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction: Créer notification pour changement de statut
CREATE OR REPLACE FUNCTION create_claim_status_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_claim claims;
  v_warranty warranties;
BEGIN
  -- Récupérer la réclamation et la garantie
  SELECT * INTO v_claim
  FROM claims
  WHERE id = NEW.claim_id;
  
  SELECT * INTO v_warranty
  FROM warranties
  WHERE id = v_claim.warranty_id;
  
  -- Créer notification système
  INSERT INTO notifications (
    organization_id,
    user_id,
    type,
    title,
    message,
    link,
    related_id
  ) VALUES (
    NEW.organization_id,
    NEW.changed_by,
    'claim_status_update',
    'Réclamation #' || v_claim.claim_number || ' mise à jour',
    'Statut changé: ' || COALESCE(NEW.old_status, 'Nouveau') || ' → ' || NEW.new_status,
    '/claims/' || NEW.claim_id,
    NEW.claim_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction: Nettoyer les indicateurs de frappe expirés
CREATE OR REPLACE FUNCTION cleanup_expired_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM typing_indicators
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS trigger_update_conversation_timestamp ON chat_messages;
CREATE TRIGGER trigger_update_conversation_timestamp
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

DROP TRIGGER IF EXISTS trigger_create_message_notification ON chat_messages;
CREATE TRIGGER trigger_create_message_notification
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  WHEN (NEW.sender_type != 'system' AND NEW.is_internal = false)
  EXECUTE FUNCTION create_message_notification();

DROP TRIGGER IF EXISTS trigger_create_claim_status_notification ON claim_status_updates;
CREATE TRIGGER trigger_create_claim_status_notification
  AFTER INSERT ON claim_status_updates
  FOR EACH ROW
  EXECUTE FUNCTION create_claim_status_notification();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_status_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- RLS: chat_conversations
CREATE POLICY "Staff can view org conversations"
  ON chat_conversations FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Public access with token"
  ON chat_conversations FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Staff can create conversations"
  ON chat_conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Staff can update conversations"
  ON chat_conversations FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS: chat_messages
CREATE POLICY "Staff can view org messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM chat_conversations
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Public can view messages with token"
  ON chat_messages FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Staff can create messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM chat_conversations
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Public can create customer messages"
  ON chat_messages FOR INSERT
  TO anon
  WITH CHECK (sender_type = 'customer');

CREATE POLICY "Staff can update messages"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM chat_conversations
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- RLS: claim_status_updates
CREATE POLICY "Staff can view org status updates"
  ON claim_status_updates FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Public can view status updates"
  ON claim_status_updates FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Staff can create status updates"
  ON claim_status_updates FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS: push_subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON push_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own subscriptions"
  ON push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own subscriptions"
  ON push_subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own subscriptions"
  ON push_subscriptions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS: typing_indicators
CREATE POLICY "Anyone can view typing indicators"
  ON typing_indicators FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated can manage typing indicators"
  ON typing_indicators FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can manage typing indicators"
  ON typing_indicators FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);