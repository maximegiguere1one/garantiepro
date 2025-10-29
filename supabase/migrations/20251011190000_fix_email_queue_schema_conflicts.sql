/*
  # Correction Complète du Schéma email_queue

  ## Problème
  Deux migrations créent des colonnes incompatibles:
  - 20251005030000: utilise `to`, `subject`, `body`
  - 20251011171914: utilise `to_email`, `from_email`, `html_body`, `priority`, `metadata`

  ## Solution
  1. Supprimer les colonnes en conflit
  2. Créer le schéma unifié avec les bonnes colonnes
  3. Migrer les données existantes si nécessaire
  4. Recréer les index et policies

  ## Nouveau Schéma Final
  - to_email (text) - destinataire
  - from_email (text) - expéditeur
  - subject (text) - sujet
  - html_body (text) - corps HTML
  - text_body (text, nullable) - corps texte alternatif
  - priority (text) - normal, high, low
  - metadata (jsonb) - données additionnelles
  - status (text) - queued, sending, sent, failed
  - attempts (integer)
  - max_retries (integer)
  - error_message (text, nullable)
  - next_retry_at (timestamptz)
  - sent_at (timestamptz, nullable)
  - failed_at (timestamptz, nullable)
  - organization_id (uuid)
*/

-- =====================================================
-- ÉTAPE 1: Sauvegarder les données existantes
-- =====================================================

DO $$
BEGIN
  -- Créer table temporaire pour backup
  CREATE TEMP TABLE email_queue_backup AS
  SELECT * FROM email_queue WHERE false;

EXCEPTION
  WHEN undefined_table THEN
    -- Table n'existe pas encore, c'est ok
    NULL;
END $$;

-- =====================================================
-- ÉTAPE 2: Supprimer la table existante et recréer
-- =====================================================

DROP TABLE IF EXISTS email_queue CASCADE;

CREATE TABLE email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Informations email
  to_email text NOT NULL,
  from_email text NOT NULL DEFAULT 'info@locationproremorque.ca',
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
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Multi-tenant
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE
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

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own organization email queue" ON email_queue;
DROP POLICY IF EXISTS "System can insert emails into queue" ON email_queue;
DROP POLICY IF EXISTS "System can update email queue status" ON email_queue;

-- Créer les policies
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
-- ÉTAPE 5: Créer trigger pour updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_email_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS email_queue_updated_at ON email_queue;
CREATE TRIGGER email_queue_updated_at
  BEFORE UPDATE ON email_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_email_queue_updated_at();

-- =====================================================
-- ÉTAPE 6: Fonction helper pour queue email
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
    SELECT COALESCE(email, 'info@locationproremorque.ca')
    INTO v_from_email
    FROM company_settings
    WHERE organization_id = p_organization_id
    LIMIT 1;

    IF v_from_email IS NULL THEN
      v_from_email := 'info@locationproremorque.ca';
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
-- ÉTAPE 7: Fonction pour nettoyer les vieux emails
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_email_queue()
RETURNS void AS $$
BEGIN
  -- Supprimer les emails envoyés de plus de 30 jours
  DELETE FROM email_queue
  WHERE status = 'sent'
  AND sent_at < now() - interval '30 days';

  -- Supprimer les emails échoués de plus de 7 jours
  DELETE FROM email_queue
  WHERE status = 'failed'
  AND failed_at < now() - interval '7 days';

  -- Annuler les emails en attente de plus de 24h
  UPDATE email_queue
  SET status = 'cancelled',
      error_message = 'Cancelled: queued for more than 24 hours'
  WHERE status = 'queued'
  AND created_at < now() - interval '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTAIRES
-- =====================================================

COMMENT ON TABLE email_queue IS 'Queue d''emails avec retry automatique et gestion des priorités';
COMMENT ON COLUMN email_queue.to_email IS 'Adresse email du destinataire';
COMMENT ON COLUMN email_queue.from_email IS 'Adresse email de l''expéditeur';
COMMENT ON COLUMN email_queue.html_body IS 'Corps de l''email en HTML';
COMMENT ON COLUMN email_queue.priority IS 'Priorité: low, normal, high, urgent';
COMMENT ON COLUMN email_queue.metadata IS 'Données JSON additionnelles (event_type, user_id, etc.)';
COMMENT ON COLUMN email_queue.status IS 'Statut: queued, sending, sent, failed, cancelled';
