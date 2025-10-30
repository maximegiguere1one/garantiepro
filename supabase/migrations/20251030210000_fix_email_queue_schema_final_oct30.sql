/*
  # Correctif Final: Schéma email_queue unifié
  
  ## Problème
  - Erreur 400 sur insertion dans email_queue
  - Conflit entre ancien schéma (to, body) et nouveau (to_email, html_body)
  - La fonction queue_email() utilise le nouveau schéma
  
  ## Solution
  1. Supprimer l'ancienne table email_queue
  2. Recréer avec le schéma correct
  3. Refaire les policies RLS
  4. Refaire les index
*/

-- Désactiver temporairement RLS
ALTER TABLE IF EXISTS email_queue DISABLE ROW LEVEL SECURITY;

-- Supprimer l'ancienne table si elle existe
DROP TABLE IF EXISTS email_queue CASCADE;

-- Créer la table avec le BON schéma (compatible avec queue_email function)
CREATE TABLE email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization (important pour RLS)
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Email fields (NOMS CORRECTS matching queue_email function)
  to_email text NOT NULL,
  from_email text NOT NULL DEFAULT 'noreply@locationproremorque.ca',
  subject text NOT NULL,
  html_body text NOT NULL,
  
  -- Status et retries
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'failed', 'retry')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  attempts integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  
  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  error_message text,
  
  -- Timestamps
  next_retry_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour performance
CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_next_retry ON email_queue(next_retry_at) WHERE status IN ('queued', 'retry');
CREATE INDEX idx_email_queue_organization ON email_queue(organization_id);
CREATE INDEX idx_email_queue_priority ON email_queue(priority, next_retry_at) WHERE status IN ('queued', 'retry');

-- RLS Policies
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Utilisateurs peuvent voir les emails de leur organisation
CREATE POLICY "Users can view org email queue"
  ON email_queue FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'master')
  );

-- Policy: Système peut insérer des emails (triggers)
CREATE POLICY "System can insert emails"
  ON email_queue FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Système peut mettre à jour le statut (edge function process-email-queue)
CREATE POLICY "System can update email status"
  ON email_queue FOR UPDATE
  TO authenticated
  USING (true);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_email_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_email_queue_updated_at
  BEFORE UPDATE ON email_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_email_queue_updated_at();

COMMENT ON TABLE email_queue IS 'Queue d''emails pour envoi asynchrone via Resend';
COMMENT ON COLUMN email_queue.to_email IS 'Adresse email du destinataire';
COMMENT ON COLUMN email_queue.from_email IS 'Adresse email de l''expéditeur (noreply@locationproremorque.ca par défaut)';
COMMENT ON COLUMN email_queue.html_body IS 'Contenu HTML de l''email';
COMMENT ON COLUMN email_queue.priority IS 'Priorité: low, normal, high, urgent';
COMMENT ON COLUMN email_queue.metadata IS 'Métadonnées JSON (warranty_id, event_type, etc.)';
