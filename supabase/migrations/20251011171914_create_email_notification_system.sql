/*
  # Système de Notifications par Email Automatiques

  ## Fonctionnalités

  1. **Notifications automatiques par email pour:**
     - Création de nouvelles garanties
     - Création de nouveaux franchisés
     - Mise à jour de statut de réclamations
     - Création de nouvelles réclamations
     - Expiration prochaine de garanties

  2. **Configuration des notifications**
     - Paramètres de notification par utilisateur
     - Désactivation/activation par type d'événement

  ## Sécurité
  - Fonction exécutée avec privileges système
  - Envoi d'emails via edge function send-email
*/

-- =====================================================
-- TABLE: user_notification_preferences
-- =====================================================

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Préférences par type d'événement
  notify_new_warranty boolean DEFAULT true,
  notify_new_claim boolean DEFAULT true,
  notify_claim_status_update boolean DEFAULT true,
  notify_warranty_expiring boolean DEFAULT true,
  notify_new_franchisee boolean DEFAULT true,
  notify_new_customer boolean DEFAULT false,
  notify_daily_summary boolean DEFAULT false,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_user_notif_prefs_user ON user_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notif_prefs_org ON user_notification_preferences(organization_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences"
  ON user_notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notification preferences"
  ON user_notification_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notification preferences"
  ON user_notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- FONCTION: Envoyer notification email
-- =====================================================

CREATE OR REPLACE FUNCTION send_email_notification(
  p_organization_id uuid,
  p_event_type text,
  p_subject text,
  p_body_html text,
  p_recipient_role text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_profile record;
  v_org record;
  v_prefs record;
  v_should_notify boolean;
BEGIN
  -- Récupérer l'organisation
  SELECT * INTO v_org FROM organizations WHERE id = p_organization_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Boucle sur tous les utilisateurs de l'organisation
  FOR v_profile IN
    SELECT p.*, ce.email
    FROM profiles p
    JOIN auth.users au ON au.id = p.id
    LEFT JOIN company_settings ce ON ce.organization_id = p.organization_id
    WHERE p.organization_id = p_organization_id
    AND (p_recipient_role IS NULL OR p.role = p_recipient_role)
  LOOP
    -- Vérifier les préférences de notification
    SELECT * INTO v_prefs
    FROM user_notification_preferences
    WHERE user_id = v_profile.id
    AND organization_id = p_organization_id;

    -- Valeur par défaut: notifier
    v_should_notify := true;

    -- Vérifier si l'utilisateur a désactivé ce type de notification
    IF FOUND THEN
      CASE p_event_type
        WHEN 'new_warranty' THEN
          v_should_notify := v_prefs.notify_new_warranty;
        WHEN 'new_claim' THEN
          v_should_notify := v_prefs.notify_new_claim;
        WHEN 'claim_status_update' THEN
          v_should_notify := v_prefs.notify_claim_status_update;
        WHEN 'warranty_expiring' THEN
          v_should_notify := v_prefs.notify_warranty_expiring;
        WHEN 'new_franchisee' THEN
          v_should_notify := v_prefs.notify_new_franchisee;
        WHEN 'new_customer' THEN
          v_should_notify := v_prefs.notify_new_customer;
        ELSE
          v_should_notify := true;
      END CASE;
    END IF;

    -- Envoyer l'email si l'utilisateur souhaite être notifié
    IF v_should_notify THEN
      INSERT INTO email_queue (
        organization_id,
        to_email,
        from_email,
        subject,
        html_body,
        priority,
        metadata
      ) VALUES (
        p_organization_id,
        v_profile.email,
        COALESCE(v_org.email, 'no-reply@locationproremorque.com'),
        p_subject,
        p_body_html,
        'normal',
        jsonb_build_object('event_type', p_event_type, 'user_id', v_profile.id)
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGER: Nouvelle garantie créée
-- =====================================================

CREATE OR REPLACE FUNCTION notify_new_warranty()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_name text;
  v_subject text;
  v_body text;
BEGIN
  -- Récupérer le nom du client
  SELECT customer_name INTO v_customer_name FROM warranties WHERE id = NEW.id;

  v_subject := 'Nouvelle garantie créée';
  v_body := '<h2>Nouvelle garantie créée</h2>' ||
            '<p>Une nouvelle garantie a été créée pour le client: <strong>' || COALESCE(v_customer_name, 'N/A') || '</strong></p>' ||
            '<p><strong>Détails:</strong></p>' ||
            '<ul>' ||
            '<li>Numéro de garantie: ' || NEW.warranty_number || '</li>' ||
            '<li>VIN: ' || COALESCE(NEW.vin, 'N/A') || '</li>' ||
            '<li>Date de début: ' || TO_CHAR(NEW.start_date, 'DD/MM/YYYY') || '</li>' ||
            '<li>Date de fin: ' || TO_CHAR(NEW.end_date, 'DD/MM/YYYY') || '</li>' ||
            '</ul>';

  PERFORM send_email_notification(
    NEW.organization_id,
    'new_warranty',
    v_subject,
    v_body,
    'admin'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_new_warranty ON warranties;
CREATE TRIGGER trigger_notify_new_warranty
  AFTER INSERT ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_warranty();

-- =====================================================
-- TRIGGER: Nouvelle réclamation créée
-- =====================================================

CREATE OR REPLACE FUNCTION notify_new_claim()
RETURNS TRIGGER AS $$
DECLARE
  v_warranty record;
  v_subject text;
  v_body text;
BEGIN
  -- Récupérer les infos de la garantie
  SELECT * INTO v_warranty FROM warranties WHERE id = NEW.warranty_id;

  v_subject := 'Nouvelle réclamation créée';
  v_body := '<h2>Nouvelle réclamation</h2>' ||
            '<p>Une nouvelle réclamation a été soumise.</p>' ||
            '<p><strong>Détails:</strong></p>' ||
            '<ul>' ||
            '<li>Numéro de réclamation: ' || NEW.claim_number || '</li>' ||
            '<li>Client: ' || COALESCE(v_warranty.customer_name, 'N/A') || '</li>' ||
            '<li>VIN: ' || COALESCE(v_warranty.vin, 'N/A') || '</li>' ||
            '<li>Description: ' || COALESCE(NEW.description, 'N/A') || '</li>' ||
            '<li>Statut: ' || NEW.status || '</li>' ||
            '</ul>';

  PERFORM send_email_notification(
    NEW.organization_id,
    'new_claim',
    v_subject,
    v_body,
    'admin'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_new_claim ON claims;
CREATE TRIGGER trigger_notify_new_claim
  AFTER INSERT ON claims
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_claim();

-- =====================================================
-- TRIGGER: Mise à jour statut réclamation
-- =====================================================

CREATE OR REPLACE FUNCTION notify_claim_status_update()
RETURNS TRIGGER AS $$
DECLARE
  v_warranty record;
  v_subject text;
  v_body text;
BEGIN
  -- Ne notifier que si le statut a changé
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Récupérer les infos de la garantie
  SELECT * INTO v_warranty FROM warranties WHERE id = NEW.warranty_id;

  v_subject := 'Mise à jour de réclamation';
  v_body := '<h2>Mise à jour de statut de réclamation</h2>' ||
            '<p>Le statut d''une réclamation a été mis à jour.</p>' ||
            '<p><strong>Détails:</strong></p>' ||
            '<ul>' ||
            '<li>Numéro de réclamation: ' || NEW.claim_number || '</li>' ||
            '<li>Client: ' || COALESCE(v_warranty.customer_name, 'N/A') || '</li>' ||
            '<li>Ancien statut: ' || OLD.status || '</li>' ||
            '<li>Nouveau statut: ' || NEW.status || '</li>' ||
            '</ul>';

  PERFORM send_email_notification(
    NEW.organization_id,
    'claim_status_update',
    v_subject,
    v_body,
    NULL
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_claim_status_update ON claims;
CREATE TRIGGER trigger_notify_claim_status_update
  AFTER UPDATE ON claims
  FOR EACH ROW
  EXECUTE FUNCTION notify_claim_status_update();

-- =====================================================
-- TRIGGER: Nouveau franchisé créé
-- =====================================================

CREATE OR REPLACE FUNCTION notify_new_franchisee()
RETURNS TRIGGER AS $$
DECLARE
  v_subject text;
  v_body text;
BEGIN
  -- Notifier uniquement pour les franchisés
  IF NEW.type != 'franchisee' THEN
    RETURN NEW;
  END IF;

  v_subject := 'Nouveau franchisé créé';
  v_body := '<h2>Nouveau franchisé</h2>' ||
            '<p>Un nouveau franchisé a été ajouté au système.</p>' ||
            '<p><strong>Détails:</strong></p>' ||
            '<ul>' ||
            '<li>Nom: ' || NEW.name || '</li>' ||
            '<li>Email: ' || COALESCE(NEW.email, 'N/A') || '</li>' ||
            '<li>Téléphone: ' || COALESCE(NEW.phone, 'N/A') || '</li>' ||
            '</ul>';

  -- Notifier le propriétaire principal
  PERFORM send_email_notification(
    (SELECT id FROM organizations WHERE type = 'owner' LIMIT 1),
    'new_franchisee',
    v_subject,
    v_body,
    'admin'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_new_franchisee ON organizations;
CREATE TRIGGER trigger_notify_new_franchisee
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_franchisee();

-- =====================================================
-- FONCTION POUR CRÉER PRÉFÉRENCES PAR DÉFAUT
-- =====================================================

CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_notification_preferences (user_id, organization_id)
  VALUES (NEW.id, NEW.organization_id)
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_default_notif_prefs ON profiles;
CREATE TRIGGER trigger_create_default_notif_prefs
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();
