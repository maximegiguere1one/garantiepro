/*
  # Correction des Triggers de Notification avec Bonnes Colonnes

  ## Problème
  Les triggers utilisent des noms de colonnes qui n'existent pas:
  - warranty_number → doit être contract_number
  - customer_name → doit faire JOIN avec customers
  - vin → doit faire JOIN avec trailers

  ## Solution
  Recréer tous les triggers avec les bons noms de colonnes et les JOINs nécessaires
*/

-- =====================================================
-- FONCTION: Envoyer notification email (version corrigée)
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
  SELECT COALESCE(email, 'info@locationproremorque.ca')
  INTO v_from_email
  FROM company_settings
  WHERE organization_id = p_organization_id
  LIMIT 1;

  IF v_from_email IS NULL THEN
    v_from_email := 'info@locationproremorque.ca';
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
-- TRIGGER: Nouvelle garantie créée (version corrigée)
-- =====================================================

CREATE OR REPLACE FUNCTION notify_new_warranty()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_name text;
  v_vin text;
  v_subject text;
  v_body text;
BEGIN
  -- Récupérer le nom du client via JOIN
  SELECT
    COALESCE(c.first_name || ' ' || c.last_name, 'N/A'),
    COALESCE(t.vin, 'N/A')
  INTO v_customer_name, v_vin
  FROM customers c
  LEFT JOIN trailers t ON t.customer_id = c.id
  WHERE c.id = NEW.customer_id;

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

-- Recréer le trigger
DROP TRIGGER IF EXISTS trigger_notify_new_warranty ON warranties;
CREATE TRIGGER trigger_notify_new_warranty
  AFTER INSERT ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_warranty();

-- =====================================================
-- TRIGGER: Nouvelle réclamation créée (version corrigée)
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

DROP TRIGGER IF EXISTS trigger_notify_new_claim ON claims;
CREATE TRIGGER trigger_notify_new_claim
  AFTER INSERT ON claims
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_claim();

-- =====================================================
-- TRIGGER: Mise à jour statut réclamation (version corrigée)
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

DROP TRIGGER IF EXISTS trigger_notify_claim_status_update ON claims;
CREATE TRIGGER trigger_notify_claim_status_update
  AFTER UPDATE ON claims
  FOR EACH ROW
  EXECUTE FUNCTION notify_claim_status_update();

-- =====================================================
-- COMMENTAIRES
-- =====================================================

COMMENT ON FUNCTION send_email_notification IS 'Envoie une notification email à tous les utilisateurs d''une organisation selon leurs préférences';
COMMENT ON FUNCTION notify_new_warranty IS 'Trigger: notifie les admins lors de la création d''une nouvelle garantie';
COMMENT ON FUNCTION notify_new_claim IS 'Trigger: notifie les admins lors de la création d''une nouvelle réclamation';
COMMENT ON FUNCTION notify_claim_status_update IS 'Trigger: notifie tous les utilisateurs lors du changement de statut d''une réclamation';