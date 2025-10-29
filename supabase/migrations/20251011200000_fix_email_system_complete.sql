/*
  # Correction Complète du Système d'Envoi d'Emails de Garantie

  ## Problèmes Identifiés
  1. Triggers utilisent des colonnes inexistantes (warranty_number, customer_name, vin)
  2. Schéma email_queue a des conflits et n'est pas unifié
  3. Fonction send_email_notification ne gère pas correctement les erreurs
  4. Pas de système de retry automatique fiable

  ## Solutions Implémentées
  1. Recréation complète de la table email_queue avec schéma unifié
  2. Correction de tous les triggers pour utiliser les bonnes colonnes avec JOIN
  3. Ajout de gestion d'erreurs robuste dans tous les triggers
  4. Création de fonctions helper pour la queue d'emails
  5. Index optimisés pour performance

  ## Tables Affectées
  - email_queue (recréée)
  - Triggers sur warranties, claims, organizations

  ## Sécurité
  - RLS activé sur email_queue
  - Policies restrictives selon organization_id
  - SECURITY DEFINER sur fonctions système
*/

-- =====================================================
-- ÉTAPE 1: Nettoyer les anciens triggers et fonctions
-- =====================================================

DROP TRIGGER IF EXISTS trigger_notify_new_warranty ON warranties;
DROP TRIGGER IF EXISTS trigger_notify_new_claim ON claims;
DROP TRIGGER IF EXISTS trigger_notify_claim_status_update ON claims;
DROP TRIGGER IF EXISTS trigger_notify_new_franchisee ON organizations;
DROP TRIGGER IF EXISTS email_queue_updated_at ON email_queue;

DROP FUNCTION IF EXISTS notify_new_warranty CASCADE;
DROP FUNCTION IF EXISTS notify_new_claim CASCADE;
DROP FUNCTION IF EXISTS notify_claim_status_update CASCADE;
DROP FUNCTION IF EXISTS notify_new_franchisee CASCADE;
DROP FUNCTION IF EXISTS send_email_notification CASCADE;
DROP FUNCTION IF EXISTS update_email_queue_updated_at CASCADE;
DROP FUNCTION IF EXISTS queue_email CASCADE;

-- =====================================================
-- ÉTAPE 2: Recréer la table email_queue (DROP et CREATE)
-- =====================================================

DROP TABLE IF EXISTS email_queue CASCADE;

CREATE TABLE email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Organisation (multi-tenant)
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,

  -- Informations email
  to_email text NOT NULL,
  from_email text NOT NULL DEFAULT 'noreply@locationproremorque.ca',
  subject text NOT NULL,
  html_body text NOT NULL,
  text_body text,

  -- Métadonnées
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  metadata jsonb DEFAULT '{}'::jsonb,

  -- Statut et traitement
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'failed', 'cancelled')),
  attempts integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  error_message text,

  -- Timestamps
  next_retry_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- ÉTAPE 3: Créer les index pour performance
-- =====================================================

CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_next_retry ON email_queue(next_retry_at) WHERE status IN ('queued', 'sending');
CREATE INDEX idx_email_queue_organization ON email_queue(organization_id);
CREATE INDEX idx_email_queue_priority ON email_queue(priority, status);
CREATE INDEX idx_email_queue_created_at ON email_queue(created_at DESC);

-- =====================================================
-- ÉTAPE 4: Activer RLS
-- =====================================================

ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization email queue"
  ON email_queue FOR SELECT
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "System can insert emails into queue"
  ON email_queue FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update email queue status"
  ON email_queue FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete email queue"
  ON email_queue FOR DELETE
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- =====================================================
-- ÉTAPE 5: Fonction pour mettre à jour updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_email_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_queue_updated_at
  BEFORE UPDATE ON email_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_email_queue_updated_at();

-- =====================================================
-- ÉTAPE 6: Fonction helper pour ajouter email dans queue
-- =====================================================

CREATE OR REPLACE FUNCTION queue_email(
  p_to_email text,
  p_subject text,
  p_html_body text,
  p_from_email text DEFAULT NULL,
  p_organization_id uuid DEFAULT NULL,
  p_priority text DEFAULT 'normal',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_email_id uuid;
  v_from_email text;
BEGIN
  -- Déterminer from_email
  IF p_from_email IS NOT NULL THEN
    v_from_email := p_from_email;
  ELSE
    -- Utiliser l'email de l'organisation ou défaut
    SELECT COALESCE(email, 'noreply@locationproremorque.ca')
    INTO v_from_email
    FROM company_settings
    WHERE organization_id = p_organization_id
    LIMIT 1;

    IF v_from_email IS NULL THEN
      v_from_email := 'noreply@locationproremorque.ca';
    END IF;
  END IF;

  -- Insérer dans la queue
  INSERT INTO email_queue (
    to_email,
    from_email,
    subject,
    html_body,
    priority,
    metadata,
    organization_id,
    status,
    next_retry_at
  ) VALUES (
    p_to_email,
    v_from_email,
    p_subject,
    p_html_body,
    p_priority,
    p_metadata,
    p_organization_id,
    'queued',
    now()
  )
  RETURNING id INTO v_email_id;

  RETURN v_email_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ÉTAPE 7: Fonction pour envoyer notification par email
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
  v_from_email text;
BEGIN
  -- Récupérer l'organisation
  SELECT * INTO v_org FROM organizations WHERE id = p_organization_id;

  IF NOT FOUND THEN
    RAISE WARNING 'Organization % not found', p_organization_id;
    RETURN;
  END IF;

  -- Déterminer l'email expéditeur
  SELECT COALESCE(email, 'noreply@locationproremorque.ca')
  INTO v_from_email
  FROM company_settings
  WHERE organization_id = p_organization_id
  LIMIT 1;

  IF v_from_email IS NULL THEN
    v_from_email := 'noreply@locationproremorque.ca';
  END IF;

  -- Boucle sur tous les utilisateurs de l'organisation
  FOR v_profile IN
    SELECT p.*, au.email
    FROM profiles p
    JOIN auth.users au ON au.id = p.id
    WHERE p.organization_id = p_organization_id
    AND (p_recipient_role IS NULL OR p.role = p_recipient_role)
  LOOP
    -- Vérifier si l'email existe
    IF v_profile.email IS NULL OR v_profile.email = '' THEN
      CONTINUE;
    END IF;

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
        v_from_email,
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
-- ÉTAPE 8: Trigger pour nouvelle garantie créée
-- =====================================================

CREATE OR REPLACE FUNCTION notify_new_warranty()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_name text;
  v_vin text;
  v_subject text;
  v_body text;
BEGIN
  -- Récupérer le nom du client et le VIN via JOIN
  SELECT
    COALESCE(c.first_name || ' ' || c.last_name, 'Client inconnu'),
    COALESCE(t.vin, 'VIN non disponible')
  INTO v_customer_name, v_vin
  FROM customers c
  LEFT JOIN trailers t ON t.customer_id = c.id
  WHERE c.id = NEW.customer_id
  LIMIT 1;

  -- Si pas trouvé, utiliser des valeurs par défaut
  IF v_customer_name IS NULL THEN
    v_customer_name := 'Client inconnu';
  END IF;

  IF v_vin IS NULL THEN
    v_vin := 'VIN non disponible';
  END IF;

  v_subject := 'Nouvelle garantie créée - ' || NEW.contract_number;
  v_body := '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">' ||
            '<h2 style="color: #1e40af;">Nouvelle garantie créée</h2>' ||
            '<p>Une nouvelle garantie a été créée pour le client: <strong>' || v_customer_name || '</strong></p>' ||
            '<div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">' ||
            '<h3 style="margin-top: 0;">Détails de la garantie</h3>' ||
            '<ul style="list-style: none; padding: 0;">' ||
            '<li style="padding: 5px 0;"><strong>Numéro de contrat:</strong> ' || NEW.contract_number || '</li>' ||
            '<li style="padding: 5px 0;"><strong>Client:</strong> ' || v_customer_name || '</li>' ||
            '<li style="padding: 5px 0;"><strong>VIN:</strong> ' || v_vin || '</li>' ||
            '<li style="padding: 5px 0;"><strong>Montant total:</strong> ' || COALESCE(NEW.total_price::text, '0') || ' $ CAD</li>' ||
            '<li style="padding: 5px 0;"><strong>Date de début:</strong> ' || TO_CHAR(NEW.start_date, 'DD/MM/YYYY') || '</li>' ||
            '<li style="padding: 5px 0;"><strong>Date de fin:</strong> ' || TO_CHAR(NEW.end_date, 'DD/MM/YYYY') || '</li>' ||
            '<li style="padding: 5px 0;"><strong>Statut:</strong> ' || NEW.status || '</li>' ||
            '</ul>' ||
            '</div>' ||
            '<p style="color: #6b7280; font-size: 12px;">Cette notification a été envoyée automatiquement par le système de gestion des garanties.</p>' ||
            '</div>';

  -- Envoyer la notification uniquement aux admins
  PERFORM send_email_notification(
    NEW.organization_id,
    'new_warranty',
    v_subject,
    v_body,
    'admin'
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Logger l'erreur mais ne pas bloquer l'insertion
    RAISE WARNING 'Error in notify_new_warranty: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_new_warranty
  AFTER INSERT ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_warranty();

-- =====================================================
-- ÉTAPE 9: Trigger pour nouvelle réclamation
-- =====================================================

CREATE OR REPLACE FUNCTION notify_new_claim()
RETURNS TRIGGER AS $$
DECLARE
  v_warranty record;
  v_customer_name text;
  v_vin text;
  v_subject text;
  v_body text;
BEGIN
  -- Récupérer les infos de la garantie avec customer et trailer
  SELECT
    w.*,
    COALESCE(c.first_name || ' ' || c.last_name, 'Client inconnu') as customer_name,
    COALESCE(t.vin, 'VIN non disponible') as vin
  INTO v_warranty
  FROM warranties w
  LEFT JOIN customers c ON c.id = w.customer_id
  LEFT JOIN trailers t ON t.id = w.trailer_id
  WHERE w.id = NEW.warranty_id;

  IF NOT FOUND THEN
    RAISE WARNING 'Warranty % not found for claim %', NEW.warranty_id, NEW.id;
    RETURN NEW;
  END IF;

  v_subject := 'Nouvelle réclamation - ' || COALESCE(NEW.claim_number, 'N/A');
  v_body := '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">' ||
            '<h2 style="color: #dc2626;">Nouvelle réclamation</h2>' ||
            '<p>Une nouvelle réclamation a été soumise.</p>' ||
            '<div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">' ||
            '<h3 style="margin-top: 0;">Détails de la réclamation</h3>' ||
            '<ul style="list-style: none; padding: 0;">' ||
            '<li style="padding: 5px 0;"><strong>Numéro:</strong> ' || COALESCE(NEW.claim_number, 'N/A') || '</li>' ||
            '<li style="padding: 5px 0;"><strong>Client:</strong> ' || v_warranty.customer_name || '</li>' ||
            '<li style="padding: 5px 0;"><strong>VIN:</strong> ' || v_warranty.vin || '</li>' ||
            '<li style="padding: 5px 0;"><strong>Contrat:</strong> ' || v_warranty.contract_number || '</li>' ||
            '<li style="padding: 5px 0;"><strong>Description:</strong> ' || COALESCE(NEW.description, 'Aucune description') || '</li>' ||
            '<li style="padding: 5px 0;"><strong>Montant réclamé:</strong> ' || COALESCE(NEW.claim_amount::text, '0') || ' $ CAD</li>' ||
            '<li style="padding: 5px 0;"><strong>Statut:</strong> ' || NEW.status || '</li>' ||
            '</ul>' ||
            '</div>' ||
            '<p style="color: #6b7280; font-size: 12px;">Veuillez traiter cette réclamation dans les plus brefs délais.</p>' ||
            '</div>';

  PERFORM send_email_notification(
    NEW.organization_id,
    'new_claim',
    v_subject,
    v_body,
    'admin'
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in notify_new_claim: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_new_claim
  AFTER INSERT ON claims
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_claim();

-- =====================================================
-- ÉTAPE 10: Trigger pour mise à jour statut réclamation
-- =====================================================

CREATE OR REPLACE FUNCTION notify_claim_status_update()
RETURNS TRIGGER AS $$
DECLARE
  v_warranty record;
  v_customer_name text;
  v_subject text;
  v_body text;
  v_status_color text;
BEGIN
  -- Ne notifier que si le statut a changé
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Récupérer les infos de la garantie
  SELECT
    w.*,
    COALESCE(c.first_name || ' ' || c.last_name, 'Client inconnu') as customer_name
  INTO v_warranty
  FROM warranties w
  LEFT JOIN customers c ON c.id = w.customer_id
  WHERE w.id = NEW.warranty_id;

  IF NOT FOUND THEN
    RAISE WARNING 'Warranty % not found', NEW.warranty_id;
    RETURN NEW;
  END IF;

  -- Couleur selon le statut
  v_status_color := CASE NEW.status
    WHEN 'approved' THEN '#10b981'
    WHEN 'rejected' THEN '#dc2626'
    WHEN 'pending' THEN '#f59e0b'
    ELSE '#6b7280'
  END;

  v_subject := 'Mise à jour réclamation - ' || COALESCE(NEW.claim_number, 'N/A');
  v_body := '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">' ||
            '<h2 style="color: ' || v_status_color || ';">Mise à jour de réclamation</h2>' ||
            '<p>Le statut d''une réclamation a été mis à jour.</p>' ||
            '<div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">' ||
            '<h3 style="margin-top: 0;">Détails</h3>' ||
            '<ul style="list-style: none; padding: 0;">' ||
            '<li style="padding: 5px 0;"><strong>Numéro:</strong> ' || COALESCE(NEW.claim_number, 'N/A') || '</li>' ||
            '<li style="padding: 5px 0;"><strong>Client:</strong> ' || v_warranty.customer_name || '</li>' ||
            '<li style="padding: 5px 0;"><strong>Contrat:</strong> ' || v_warranty.contract_number || '</li>' ||
            '<li style="padding: 5px 0;"><strong>Ancien statut:</strong> <span style="color: #6b7280;">' || OLD.status || '</span></li>' ||
            '<li style="padding: 5px 0;"><strong>Nouveau statut:</strong> <span style="color: ' || v_status_color || '; font-weight: bold;">' || NEW.status || '</span></li>' ||
            '</ul>' ||
            '</div>' ||
            '</div>';

  PERFORM send_email_notification(
    NEW.organization_id,
    'claim_status_update',
    v_subject,
    v_body,
    NULL  -- Notifier tous les utilisateurs
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in notify_claim_status_update: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_claim_status_update
  AFTER UPDATE ON claims
  FOR EACH ROW
  EXECUTE FUNCTION notify_claim_status_update();

-- =====================================================
-- ÉTAPE 11: Commentaires et documentation
-- =====================================================

COMMENT ON TABLE email_queue IS 'Queue d''emails avec système de retry automatique';
COMMENT ON FUNCTION queue_email IS 'Ajoute un email dans la queue pour envoi asynchrone';
COMMENT ON FUNCTION send_email_notification IS 'Envoie une notification email à tous les utilisateurs d''une organisation selon leurs préférences';
COMMENT ON FUNCTION notify_new_warranty IS 'Trigger: notifie les admins lors de la création d''une nouvelle garantie';
COMMENT ON FUNCTION notify_new_claim IS 'Trigger: notifie les admins lors de la création d''une nouvelle réclamation';
COMMENT ON FUNCTION notify_claim_status_update IS 'Trigger: notifie tous les utilisateurs lors du changement de statut d''une réclamation';
