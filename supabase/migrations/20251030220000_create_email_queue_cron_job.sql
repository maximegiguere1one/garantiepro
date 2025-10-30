/*
  # Cron Job pour traiter la queue d'emails
  
  ## Description
  Crée un cron job pg_cron qui appelle process-email-queue toutes les minutes
  pour envoyer automatiquement les emails en attente
  
  ## Fonctionnement
  1. pg_cron exécute la fonction toutes les minutes
  2. La fonction appelle l'edge function via HTTP
  3. L'edge function traite jusqu'à 50 emails par run
  4. Les emails sont envoyés via Resend
*/

-- Activer l'extension pg_cron si pas déjà fait
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Supprimer l'ancien job s'il existe
SELECT cron.unschedule('process-email-queue-job') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-email-queue-job'
);

-- Créer une fonction SQL qui appelle l'edge function
CREATE OR REPLACE FUNCTION trigger_process_email_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_response text;
  v_supabase_url text;
  v_anon_key text;
BEGIN
  -- Récupérer l'URL Supabase depuis les variables d'environnement
  -- Note: En production, ces valeurs doivent être configurées
  v_supabase_url := current_setting('app.supabase_url', true);
  v_anon_key := current_setting('app.supabase_anon_key', true);
  
  -- Si les variables ne sont pas configurées, utiliser des valeurs par défaut
  -- À REMPLACER par vos vraies valeurs en production
  IF v_supabase_url IS NULL THEN
    v_supabase_url := 'https://fkxldrkkqvputdgfpayi.supabase.co';
  END IF;
  
  IF v_anon_key IS NULL THEN
    -- Cette clé doit être remplacée par votre vraie ANON_KEY
    RAISE NOTICE 'ANON_KEY not configured - emails will not be sent';
    RETURN;
  END IF;
  
  -- Appeler l'edge function via HTTP
  -- Note: http extension doit être activée
  BEGIN
    -- Cette ligne nécessite l'extension http (pg_net ou http)
    -- Si vous n'avez pas cette extension, voir la note ci-dessous
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/process-email-queue',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || v_anon_key,
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
    
    RAISE NOTICE 'process-email-queue triggered successfully';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to trigger process-email-queue: %', SQLERRM;
  END;
END;
$$;

-- Créer le cron job (toutes les minutes)
-- Note: Ceci nécessite que pg_cron soit installé et configuré
DO $$
BEGIN
  -- Vérifier si pg_cron est disponible
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Créer le job
    PERFORM cron.schedule(
      'process-email-queue-job',
      '* * * * *', -- Toutes les minutes
      $$SELECT trigger_process_email_queue();$$
    );
    
    RAISE NOTICE 'Email queue cron job created successfully';
  ELSE
    RAISE WARNING 'pg_cron extension not available - manual trigger required';
  END IF;
END $$;

COMMENT ON FUNCTION trigger_process_email_queue IS 'Déclenche le traitement de la queue d''emails via edge function';

-- Alternative si pg_cron n'est pas disponible:
-- Vous pouvez appeler manuellement la fonction:
-- SELECT trigger_process_email_queue();
--
-- Ou configurer un cron externe qui appelle directement l'edge function:
-- curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/process-email-queue \
--   -H "Authorization: Bearer YOUR_ANON_KEY"
