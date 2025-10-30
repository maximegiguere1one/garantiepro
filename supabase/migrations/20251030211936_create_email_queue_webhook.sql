/*
  # Webhook automatique pour traiter les emails
  
  ## Description
  Crée un trigger qui appelle automatiquement l'edge function
  process-email-queue dès qu'un email est ajouté dans la queue
  
  ## Fonctionnement
  1. Nouveau email inséré → Trigger s'exécute
  2. Trigger envoie requête HTTP à process-email-queue
  3. Edge function traite l'email immédiatement
  4. Email envoyé via Resend
*/

-- Activer l'extension pg_net pour les requêtes HTTP
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Fonction qui appelle l'edge function via HTTP
CREATE OR REPLACE FUNCTION trigger_email_processing()
RETURNS TRIGGER AS $$
DECLARE
  v_request_id bigint;
  v_supabase_url text;
  v_anon_key text;
BEGIN
  -- Récupérer l'URL Supabase
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  
  -- Si pas configurée, utiliser l'URL par défaut
  IF v_supabase_url IS NULL THEN
    v_supabase_url := 'https://fkxldrkkqvputdgfpayi.supabase.co';
  END IF;
  
  -- Récupérer l'ANON_KEY
  v_anon_key := current_setting('app.settings.supabase_anon_key', true);
  
  -- Si pas configurée, essayer les variables d'environnement Supabase
  IF v_anon_key IS NULL THEN
    -- Note: En production, cette clé doit être configurée
    -- Pour l'instant, on enregistre juste une notice
    RAISE NOTICE 'Email queued: %, will be processed by cron or webhook', NEW.id;
    RETURN NEW;
  END IF;

  -- Appeler l'edge function en arrière-plan
  -- pg_net.http_post est asynchrone et ne bloque pas l'insert
  SELECT INTO v_request_id net.http_post(
    url := v_supabase_url || '/functions/v1/process-email-queue',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_anon_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'trigger', 'database_insert',
      'email_id', NEW.id
    )
  );

  RAISE NOTICE 'Email processing triggered: email_id=%, request_id=%', NEW.id, v_request_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, on continue (l'email sera traité par le cron)
    RAISE WARNING 'Failed to trigger email processing for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS trigger_process_new_email ON email_queue;

-- Créer le trigger sur INSERT
CREATE TRIGGER trigger_process_new_email
  AFTER INSERT ON email_queue
  FOR EACH ROW
  WHEN (NEW.status = 'queued')
  EXECUTE FUNCTION trigger_email_processing();

COMMENT ON FUNCTION trigger_email_processing IS 'Appelle automatiquement process-email-queue quand un email est ajouté';
COMMENT ON TRIGGER trigger_process_new_email ON email_queue IS 'Traite automatiquement les nouveaux emails via edge function';