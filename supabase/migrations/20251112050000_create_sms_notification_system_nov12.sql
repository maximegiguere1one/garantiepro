/*
  # Système de notifications SMS pour création de garanties - Nov 12, 2025

  ## Description
  Ce système envoie automatiquement un SMS de notification lorsqu'une nouvelle garantie est créée.
  Le SMS est envoyé via Twilio à un numéro configuré dans les paramètres de l'organisation.

  ## Fonctionnalités
  1. Trigger automatique après création de garantie
  2. Appel à la fonction Edge Twilio via HTTP
  3. Enregistrement des tentatives d'envoi dans la table notifications
  4. Configuration flexible par organisation
  5. Gestion d'erreur non-bloquante

  ## Tables modifiées
  - company_settings: ajout de colonnes pour la configuration SMS

  ## Nouvelles fonctions
  - notify_new_warranty_sms(): fonction trigger pour envoyer SMS

  ## Nouveaux triggers
  - warranty_sms_notification: trigger AFTER INSERT sur warranties
*/

-- =====================================================
-- Étape 1: Ajouter les colonnes de configuration SMS
-- =====================================================

DO $$
BEGIN
  -- Vérifier et ajouter la colonne pour activer/désactiver les SMS
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings'
    AND column_name = 'enable_sms_notifications'
  ) THEN
    ALTER TABLE company_settings
    ADD COLUMN enable_sms_notifications boolean DEFAULT true;
  END IF;

  -- Vérifier et ajouter la colonne pour le numéro de notification
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings'
    AND column_name = 'sms_notification_phone'
  ) THEN
    ALTER TABLE company_settings
    ADD COLUMN sms_notification_phone text DEFAULT '+14185728464';
  END IF;

  -- Vérifier et ajouter la colonne pour la langue des SMS
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings'
    AND column_name = 'sms_notification_language'
  ) THEN
    ALTER TABLE company_settings
    ADD COLUMN sms_notification_language text DEFAULT 'fr' CHECK (sms_notification_language IN ('fr', 'en'));
  END IF;
END $$;

COMMENT ON COLUMN company_settings.enable_sms_notifications IS 'Active/désactive les notifications SMS pour les nouvelles garanties';
COMMENT ON COLUMN company_settings.sms_notification_phone IS 'Numéro de téléphone pour recevoir les notifications SMS (+1XXXXXXXXXX format)';
COMMENT ON COLUMN company_settings.sms_notification_language IS 'Langue pour les notifications SMS (fr ou en)';

-- =====================================================
-- Étape 2: Créer la table sms_queue pour gérer les SMS
-- =====================================================

CREATE TABLE IF NOT EXISTS sms_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  to_phone text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  attempts integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  metadata jsonb,
  error_message text,
  next_retry_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE sms_queue IS 'File d''attente pour l''envoi de SMS via Twilio';
COMMENT ON COLUMN sms_queue.to_phone IS 'Numéro de téléphone du destinataire (format E.164: +1XXXXXXXXXX)';
COMMENT ON COLUMN sms_queue.body IS 'Contenu du message SMS';
COMMENT ON COLUMN sms_queue.status IS 'Statut de l''envoi: pending, sending, sent, failed';
COMMENT ON COLUMN sms_queue.priority IS 'Priorité d''envoi: low, normal, high, urgent';
COMMENT ON COLUMN sms_queue.attempts IS 'Nombre de tentatives d''envoi';
COMMENT ON COLUMN sms_queue.metadata IS 'Métadonnées additionnelles (warranty_id, contract_number, etc.)';

-- Activer RLS sur sms_queue
ALTER TABLE sms_queue ENABLE ROW LEVEL SECURITY;

-- Policy pour que les utilisateurs authentifiés puissent voir les SMS de leur organisation
CREATE POLICY "Users can view organization SMS queue"
  ON sms_queue FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy pour que le système puisse insérer des SMS
CREATE POLICY "System can insert SMS"
  ON sms_queue FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Index pour optimiser les requêtes sur les SMS en attente
CREATE INDEX IF NOT EXISTS idx_sms_queue_pending
ON sms_queue (status, next_retry_at, created_at)
WHERE status IN ('pending', 'sending');

CREATE INDEX IF NOT EXISTS idx_sms_queue_organization
ON sms_queue (organization_id, created_at DESC);

-- =====================================================
-- Étape 3: Créer la fonction pour envoyer les SMS
-- =====================================================

CREATE OR REPLACE FUNCTION notify_new_warranty_sms()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_customer_name text;
  v_contract_number text;
  v_plan_name text;
  v_total_price numeric;
  v_notification_phone text;
  v_sms_enabled boolean;
  v_sms_language text;
  v_sms_body text;
  v_formatted_price text;
  v_supabase_url text;
  v_sms_queue_id uuid;
BEGIN
  -- Récupérer l'URL Supabase
  v_supabase_url := 'https://fkxldrkkqvputdgfpayi.supabase.co';

  -- Log le début du traitement
  RAISE NOTICE 'SMS Notification: Starting process for warranty %', NEW.id;

  -- Récupérer les paramètres de notification SMS pour l'organisation
  BEGIN
    SELECT
      COALESCE(enable_sms_notifications, true),
      COALESCE(sms_notification_phone, '+14185728464'),
      COALESCE(sms_notification_language, 'fr')
    INTO
      v_sms_enabled,
      v_notification_phone,
      v_sms_language
    FROM company_settings
    WHERE organization_id = NEW.organization_id
    LIMIT 1;

    -- Si aucun paramètre trouvé, utiliser les valeurs par défaut
    IF NOT FOUND THEN
      v_sms_enabled := true;
      v_notification_phone := '+14185728464';
      v_sms_language := 'fr';
      RAISE NOTICE 'SMS Notification: No settings found, using defaults';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- En cas d'erreur, utiliser les valeurs par défaut
    v_sms_enabled := true;
    v_notification_phone := '+14185728464';
    v_sms_language := 'fr';
    RAISE NOTICE 'SMS Notification: Error fetching settings, using defaults: %', SQLERRM;
  END;

  -- Vérifier si les SMS sont activés
  IF NOT v_sms_enabled THEN
    RAISE NOTICE 'SMS Notification: SMS notifications are disabled for organization %', NEW.organization_id;
    RETURN NEW;
  END IF;

  -- Récupérer les informations du client
  BEGIN
    SELECT CONCAT(first_name, ' ', last_name)
    INTO v_customer_name
    FROM customers
    WHERE id = NEW.customer_id;
  EXCEPTION WHEN OTHERS THEN
    v_customer_name := 'Client inconnu';
    RAISE NOTICE 'SMS Notification: Error fetching customer: %', SQLERRM;
  END;

  -- Récupérer le nom du plan
  BEGIN
    SELECT name INTO v_plan_name
    FROM warranty_plans
    WHERE id = NEW.plan_id;
  EXCEPTION WHEN OTHERS THEN
    v_plan_name := 'Plan inconnu';
    RAISE NOTICE 'SMS Notification: Error fetching plan: %', SQLERRM;
  END;

  v_contract_number := NEW.contract_number;
  v_total_price := COALESCE(NEW.total_price, 0);

  -- Formater le prix en devise canadienne
  v_formatted_price := TRIM(TO_CHAR(v_total_price, '999,999.99')) || ' $';

  -- Construire le message SMS selon la langue
  IF v_sms_language = 'en' THEN
    v_sms_body := format(
      E'New Warranty!\n\nContract: %s\nCustomer: %s\nPlan: %s\nTotal: %s\n\nGarantie Pro-Remorque',
      v_contract_number,
      v_customer_name,
      v_plan_name,
      v_formatted_price
    );
  ELSE
    v_sms_body := format(
      E'Nouvelle garantie!\n\nContrat: %s\nClient: %s\nPlan: %s\nTotal: %s\n\nGarantie Pro-Remorque',
      v_contract_number,
      v_customer_name,
      v_plan_name,
      v_formatted_price
    );
  END IF;

  -- Insérer dans la file d'attente SMS
  BEGIN
    INSERT INTO sms_queue (
      organization_id,
      to_phone,
      body,
      status,
      priority,
      metadata
    ) VALUES (
      NEW.organization_id,
      v_notification_phone,
      v_sms_body,
      'pending',
      'high',
      jsonb_build_object(
        'warranty_id', NEW.id,
        'contract_number', v_contract_number,
        'customer_name', v_customer_name,
        'total_price', v_total_price,
        'trigger', 'warranty_created'
      )
    )
    RETURNING id INTO v_sms_queue_id;

    RAISE NOTICE 'SMS Notification: SMS queued successfully with ID %', v_sms_queue_id;

    -- Tenter d'envoyer immédiatement via pg_net si disponible
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
      RAISE NOTICE 'SMS Notification: Attempting immediate send via pg_net';

      -- Mettre à jour le statut à "sending"
      UPDATE sms_queue SET status = 'sending', updated_at = now() WHERE id = v_sms_queue_id;

      -- Appel asynchrone via pg_net
      PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/send-sms',
        headers := jsonb_build_object(
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'to', v_notification_phone,
          'body', v_sms_body,
          'metadata', jsonb_build_object(
            'sms_queue_id', v_sms_queue_id,
            'warranty_id', NEW.id
          )
        )
      );

      RAISE NOTICE 'SMS Notification: SMS request sent via pg_net';
    ELSE
      RAISE NOTICE 'SMS Notification: pg_net not available, SMS will be processed by cron job or external processor';
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'SMS Notification: Error queuing SMS: %', SQLERRM;
    -- Ne pas bloquer la transaction principale
  END;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION notify_new_warranty_sms() IS 'Envoie un SMS de notification lorsqu''une nouvelle garantie est créée';

-- =====================================================
-- Étape 4: Créer le trigger sur warranties
-- =====================================================

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS warranty_sms_notification ON warranties;

-- Créer le trigger AFTER INSERT
CREATE TRIGGER warranty_sms_notification
  AFTER INSERT ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_warranty_sms();

COMMENT ON TRIGGER warranty_sms_notification ON warranties IS 'Déclenche l''envoi d''un SMS de notification après la création d''une garantie';

-- =====================================================
-- Étape 5: Mettre à jour les paramètres par défaut
-- =====================================================

-- Mettre à jour les organisations existantes pour activer les SMS par défaut
UPDATE company_settings
SET
  enable_sms_notifications = true,
  sms_notification_phone = '+14185728464',
  sms_notification_language = 'fr'
WHERE enable_sms_notifications IS NULL;

-- =====================================================
-- Étape 6: Créer une fonction pour traiter la file SMS
-- =====================================================

CREATE OR REPLACE FUNCTION process_sms_queue()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_processed integer := 0;
  v_sms_record record;
  v_supabase_url text := 'https://fkxldrkkqvputdgfpayi.supabase.co';
BEGIN
  -- Traiter les SMS en attente (max 10 à la fois)
  FOR v_sms_record IN
    SELECT * FROM sms_queue
    WHERE status = 'pending'
    AND next_retry_at <= now()
    AND attempts < max_retries
    ORDER BY priority DESC, created_at ASC
    LIMIT 10
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Mettre à jour le statut à "sending"
    UPDATE sms_queue
    SET
      status = 'sending',
      attempts = attempts + 1,
      updated_at = now()
    WHERE id = v_sms_record.id;

    -- Tenter d'envoyer via pg_net si disponible
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
      BEGIN
        PERFORM net.http_post(
          url := v_supabase_url || '/functions/v1/send-sms',
          headers := jsonb_build_object(
            'Content-Type', 'application/json'
          ),
          body := jsonb_build_object(
            'to', v_sms_record.to_phone,
            'body', v_sms_record.body,
            'metadata', jsonb_build_object(
              'sms_queue_id', v_sms_record.id
            )
          )
        );

        v_processed := v_processed + 1;

      EXCEPTION WHEN OTHERS THEN
        -- En cas d'erreur, marquer comme échoué si max retries atteint
        IF v_sms_record.attempts + 1 >= v_sms_record.max_retries THEN
          UPDATE sms_queue
          SET
            status = 'failed',
            error_message = SQLERRM,
            failed_at = now(),
            updated_at = now()
          WHERE id = v_sms_record.id;
        ELSE
          -- Sinon, reprogrammer pour réessayer dans 5 minutes
          UPDATE sms_queue
          SET
            status = 'pending',
            next_retry_at = now() + interval '5 minutes',
            error_message = SQLERRM,
            updated_at = now()
          WHERE id = v_sms_record.id;
        END IF;
      END;
    END IF;
  END LOOP;

  RETURN v_processed;
END;
$function$;

COMMENT ON FUNCTION process_sms_queue() IS 'Traite les SMS en attente dans la file d''attente';

-- =====================================================
-- Logs de confirmation
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Système de notifications SMS créé avec succès';
  RAISE NOTICE '✓ Trigger warranty_sms_notification activé';
  RAISE NOTICE '✓ Numéro par défaut: +14185728464';
  RAISE NOTICE '✓ Les nouvelles garanties déclencheront automatiquement un SMS';
END $$;
