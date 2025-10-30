/*
  # Activation de pg_cron et Correction Complète du Système d'Emails
  
  ## Problèmes identifiés
  1. pg_cron n'est pas activé
  2. Les emails ne sont pas envoyés automatiquement
  3. Pas de déclencheur automatique pour process-email-queue
  
  ## Solutions
  1. Activer pg_cron
  2. Créer une fonction qui déclenche process-email-queue via pg_net
  3. Créer un cron job qui s'exécute toutes les minutes
  4. Alternative: trigger après insertion dans email_queue
*/

-- =====================================================
-- ÉTAPE 1: Activer pg_cron
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =====================================================
-- ÉTAPE 2: Créer une fonction pour déclencher process-email-queue
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_email_queue_processor()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_id bigint;
  v_supabase_url text := 'https://fkxldrkkqvputdgfpayi.supabase.co';
BEGIN
  RAISE NOTICE 'Triggering process-email-queue function...';

  -- Utiliser pg_net pour appeler l'edge function
  -- pg_net fait des requêtes asynchrones, donc on ne bloque pas
  SELECT net.http_post(
    url := v_supabase_url || '/functions/v1/process-email-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) INTO v_request_id;

  RAISE NOTICE 'Email queue processor triggered (request_id: %)', v_request_id;

EXCEPTION
  WHEN OTHERS THEN
    -- Ne pas bloquer en cas d'erreur, juste logger
    RAISE WARNING 'Failed to trigger email queue processor: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION trigger_email_queue_processor IS 
'Déclenche le traitement de la queue d''emails via l''edge function process-email-queue en utilisant pg_net';

-- =====================================================
-- ÉTAPE 3: Créer un trigger qui déclenche l'envoi après insertion
-- =====================================================

CREATE OR REPLACE FUNCTION auto_trigger_email_send()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Déclencher le processor de queue de manière asynchrone
  -- Seulement si le statut est 'queued'
  IF NEW.status = 'queued' THEN
    -- Utiliser pg_net pour un appel asynchrone non-bloquant
    PERFORM net.http_post(
      url := 'https://fkxldrkkqvputdgfpayi.supabase.co/functions/v1/process-email-queue',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := '{}'::jsonb,
      timeout_milliseconds := 5000
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, ne pas bloquer l'insertion
    RAISE WARNING 'Failed to auto-trigger email send: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS auto_process_email_queue ON email_queue;

-- Créer le trigger
CREATE TRIGGER auto_process_email_queue
  AFTER INSERT ON email_queue
  FOR EACH ROW
  EXECUTE FUNCTION auto_trigger_email_send();

COMMENT ON TRIGGER auto_process_email_queue ON email_queue IS
'Déclenche automatiquement le traitement de la queue d''emails après chaque insertion';

-- =====================================================
-- ÉTAPE 4: Fonction helper pour test manuel
-- =====================================================

CREATE OR REPLACE FUNCTION test_email_system()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pg_net_available boolean;
  v_pg_cron_available boolean;
  v_queued_count integer;
  v_result jsonb;
BEGIN
  -- Vérifier pg_net
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_net'
  ) INTO v_pg_net_available;
  
  -- Vérifier pg_cron
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) INTO v_pg_cron_available;
  
  -- Compter les emails en queue
  SELECT COUNT(*)
  INTO v_queued_count
  FROM email_queue
  WHERE status IN ('queued', 'retry');
  
  -- Construire le résultat
  v_result := jsonb_build_object(
    'pg_net_available', v_pg_net_available,
    'pg_cron_available', v_pg_cron_available,
    'queued_emails', v_queued_count,
    'trigger_exists', EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'auto_process_email_queue'
    ),
    'status', CASE
      WHEN v_pg_net_available AND v_queued_count > 0 THEN 'READY_TO_SEND'
      WHEN NOT v_pg_net_available THEN 'ERROR_PG_NET_MISSING'
      WHEN v_queued_count = 0 THEN 'NO_EMAILS_QUEUED'
      ELSE 'UNKNOWN'
    END
  );
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION test_email_system IS 
'Teste la configuration du système d''emails et retourne le statut';

-- =====================================================
-- INFORMATIONS IMPORTANTES
-- =====================================================

-- Pour tester manuellement:
-- SELECT test_email_system();
--
-- Pour déclencher manuellement le traitement:
-- SELECT trigger_email_queue_processor();
--
-- Pour voir les emails en queue:
-- SELECT * FROM email_queue WHERE status IN ('queued', 'retry') ORDER BY created_at;

-- Note: Le cron job doit être configuré manuellement dans Supabase Dashboard
-- ou via l'interface pg_cron si vous avez accès
