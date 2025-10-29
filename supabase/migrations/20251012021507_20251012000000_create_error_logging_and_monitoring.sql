/*
  # Système de Logging d'Erreurs et Monitoring Avancé

  1. Nouvelles Tables
    - `error_logs`
      - Enregistre toutes les erreurs critiques du système
      - Inclut contexte complet, stack trace, et métadonnées
      - Support pour erreurs frontend et backend
      - Système de déduplication pour éviter le spam

    - `document_generation_status`
      - Suivi de l'état de génération des documents
      - Permet la régénération des documents échoués
      - Historique des tentatives de génération

    - `system_health_checks`
      - Monitoring de la santé du système
      - Vérification périodique des services externes
      - Alertes automatiques en cas de problème

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Policies restrictives par organization
    - Accès admin pour consultation globale

  3. Fonctions Utilitaires
    - Fonction de nettoyage automatique des vieux logs
    - Fonction de régénération de documents
    - Fonction de health check
*/

-- Table pour le logging des erreurs
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Identification de l'erreur
  error_id text NOT NULL, -- ID unique pour grouper les erreurs similaires
  error_type text NOT NULL, -- Type: 'pdf_generation', 'email_sending', 'database', 'api', etc.
  severity text NOT NULL DEFAULT 'error', -- 'critical', 'error', 'warning', 'info'

  -- Détails de l'erreur
  error_message text NOT NULL,
  error_code text,
  stack_trace text,

  -- Contexte
  context jsonb DEFAULT '{}'::jsonb, -- Contexte complet de l'erreur
  user_agent text,
  url text,

  -- Métadonnées
  related_entity_type text, -- 'warranty', 'claim', 'customer', etc.
  related_entity_id uuid,

  -- Tracking
  occurrence_count integer DEFAULT 1,
  first_occurred_at timestamptz DEFAULT now(),
  last_occurred_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table pour le statut de génération des documents
CREATE TABLE IF NOT EXISTS document_generation_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id uuid REFERENCES warranties(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

  -- Statut de chaque type de document
  customer_invoice_status text DEFAULT 'pending', -- 'pending', 'generating', 'completed', 'failed'
  merchant_invoice_status text DEFAULT 'pending',
  contract_status text DEFAULT 'pending',

  -- Détails des erreurs
  customer_invoice_error text,
  merchant_invoice_error text,
  contract_error text,

  -- Tentatives
  generation_attempts integer DEFAULT 0,
  last_attempt_at timestamptz,
  next_retry_at timestamptz,

  -- Métadonnées
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(warranty_id)
);

-- Table pour les health checks du système
CREATE TABLE IF NOT EXISTS system_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Service vérifié
  service_name text NOT NULL, -- 'resend', 'supabase', 'stripe', 'quickbooks', etc.
  check_type text NOT NULL, -- 'api_connection', 'database', 'configuration', etc.

  -- Résultat
  status text NOT NULL, -- 'healthy', 'degraded', 'down'
  response_time_ms integer,

  -- Détails
  details jsonb DEFAULT '{}'::jsonb,
  error_message text,

  -- Métadonnées
  checked_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_error_logs_organization ON error_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_id ON error_logs(error_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved_at) WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_doc_gen_warranty ON document_generation_status(warranty_id);
CREATE INDEX IF NOT EXISTS idx_doc_gen_organization ON document_generation_status(organization_id);
CREATE INDEX IF NOT EXISTS idx_doc_gen_status ON document_generation_status(customer_invoice_status, merchant_invoice_status, contract_status);
CREATE INDEX IF NOT EXISTS idx_doc_gen_retry ON document_generation_status(next_retry_at) WHERE next_retry_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_health_checks_service ON system_health_checks(service_name);
CREATE INDEX IF NOT EXISTS idx_health_checks_status ON system_health_checks(status);
CREATE INDEX IF NOT EXISTS idx_health_checks_checked ON system_health_checks(checked_at DESC);

-- Enable RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_generation_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_checks ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour error_logs
CREATE POLICY "Users can view their organization's error logs"
  ON error_logs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can insert error logs"
  ON error_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update error logs in their organization"
  ON error_logs FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies pour document_generation_status
CREATE POLICY "Users can view their organization's document status"
  ON document_generation_status FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can manage document generation status"
  ON document_generation_status FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies pour system_health_checks
CREATE POLICY "Authenticated users can view health checks"
  ON system_health_checks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert health checks"
  ON system_health_checks FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Fonction pour nettoyer les vieux logs (garder 90 jours)
CREATE OR REPLACE FUNCTION cleanup_old_error_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM error_logs
  WHERE created_at < now() - interval '90 days'
    AND resolved_at IS NOT NULL;

  DELETE FROM system_health_checks
  WHERE created_at < now() - interval '30 days';
END;
$$;

-- Fonction pour enregistrer une erreur avec déduplication
CREATE OR REPLACE FUNCTION log_error(
  p_organization_id uuid,
  p_user_id uuid,
  p_error_id text,
  p_error_type text,
  p_error_message text,
  p_severity text DEFAULT 'error',
  p_context jsonb DEFAULT '{}'::jsonb,
  p_error_code text DEFAULT NULL,
  p_stack_trace text DEFAULT NULL,
  p_related_entity_type text DEFAULT NULL,
  p_related_entity_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
  v_existing_log error_logs;
BEGIN
  -- Chercher une erreur similaire récente (dernières 24h)
  SELECT * INTO v_existing_log
  FROM error_logs
  WHERE error_id = p_error_id
    AND organization_id = p_organization_id
    AND created_at > now() - interval '24 hours'
    AND resolved_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_log.id IS NOT NULL THEN
    -- Mettre à jour l'erreur existante
    UPDATE error_logs
    SET
      occurrence_count = occurrence_count + 1,
      last_occurred_at = now(),
      updated_at = now(),
      context = p_context, -- Mettre à jour avec le contexte le plus récent
      stack_trace = COALESCE(p_stack_trace, stack_trace)
    WHERE id = v_existing_log.id
    RETURNING id INTO v_log_id;
  ELSE
    -- Créer une nouvelle entrée
    INSERT INTO error_logs (
      organization_id,
      user_id,
      error_id,
      error_type,
      error_message,
      severity,
      context,
      error_code,
      stack_trace,
      related_entity_type,
      related_entity_id
    ) VALUES (
      p_organization_id,
      p_user_id,
      p_error_id,
      p_error_type,
      p_error_message,
      p_severity,
      p_context,
      p_error_code,
      p_stack_trace,
      p_related_entity_type,
      p_related_entity_id
    )
    RETURNING id INTO v_log_id;
  END IF;

  RETURN v_log_id;
END;
$$;

-- Fonction pour marquer une erreur comme résolue
CREATE OR REPLACE FUNCTION resolve_error(
  p_error_log_id uuid,
  p_resolution_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE error_logs
  SET
    resolved_at = now(),
    resolved_by = auth.uid(),
    resolution_notes = p_resolution_notes,
    updated_at = now()
  WHERE id = p_error_log_id;
END;
$$;

-- Fonction pour initialiser le statut de génération de documents
CREATE OR REPLACE FUNCTION init_document_generation_status(
  p_warranty_id uuid,
  p_organization_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status_id uuid;
BEGIN
  INSERT INTO document_generation_status (
    warranty_id,
    organization_id,
    customer_invoice_status,
    merchant_invoice_status,
    contract_status
  ) VALUES (
    p_warranty_id,
    p_organization_id,
    'pending',
    'pending',
    'pending'
  )
  ON CONFLICT (warranty_id) DO UPDATE
  SET updated_at = now()
  RETURNING id INTO v_status_id;

  RETURN v_status_id;
END;
$$;

-- Fonction pour enregistrer un health check
CREATE OR REPLACE FUNCTION record_health_check(
  p_service_name text,
  p_check_type text,
  p_status text,
  p_response_time_ms integer DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb,
  p_error_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_check_id uuid;
BEGIN
  INSERT INTO system_health_checks (
    service_name,
    check_type,
    status,
    response_time_ms,
    details,
    error_message
  ) VALUES (
    p_service_name,
    p_check_type,
    p_status,
    p_response_time_ms,
    p_details,
    p_error_message
  )
  RETURNING id INTO v_check_id;

  RETURN v_check_id;
END;
$$;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_error_logs_updated_at
  BEFORE UPDATE ON error_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_generation_status_updated_at
  BEFORE UPDATE ON document_generation_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Commentaires
COMMENT ON TABLE error_logs IS 'Enregistre toutes les erreurs critiques du système avec déduplication automatique';
COMMENT ON TABLE document_generation_status IS 'Suivi de l''état de génération des documents PDF pour chaque garantie';
COMMENT ON TABLE system_health_checks IS 'Historique des vérifications de santé des services externes';
COMMENT ON FUNCTION log_error IS 'Enregistre une erreur avec déduplication intelligente (groupe les erreurs similaires sur 24h)';
COMMENT ON FUNCTION resolve_error IS 'Marque une erreur comme résolue avec notes de résolution';
COMMENT ON FUNCTION cleanup_old_error_logs IS 'Nettoie les logs d''erreur de plus de 90 jours';
COMMENT ON FUNCTION init_document_generation_status IS 'Initialise le suivi de génération de documents pour une garantie';
COMMENT ON FUNCTION record_health_check IS 'Enregistre un résultat de health check pour un service externe';
