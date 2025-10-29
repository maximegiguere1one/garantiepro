/*
  # Système de Téléchargement Sécurisé pour les Garanties

  ## Description
  Implémente un système complet permettant aux clients de télécharger leurs documents
  de garantie via un lien sécurisé envoyé par email.

  ## Fonctionnalités
  1. Génération de tokens de téléchargement sécurisés avec expiration
  2. Table de suivi des accès aux documents (audit trail)
  3. Support pour liens à usage unique ou multiple
  4. Gestion des expirations configurables
  5. Logging complet pour la sécurité et la conformité

  ## Tables Créées
  - warranty_download_tokens: Tokens de téléchargement sécurisés
  - warranty_download_logs: Historique d'accès aux documents

  ## Sécurité
  - RLS activé sur toutes les tables
  - Tokens cryptographiquement sécurisés (UUID)
  - Expiration automatique des tokens
  - Audit trail complet
  - Rate limiting via logging
*/

-- =====================================================
-- ÉTAPE 1: Table pour les tokens de téléchargement
-- =====================================================

CREATE TABLE IF NOT EXISTS warranty_download_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relations
  warranty_id uuid NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Token sécurisé
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),

  -- Configuration
  max_downloads integer DEFAULT NULL, -- NULL = illimité
  downloads_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 days'),

  -- Statut
  is_active boolean NOT NULL DEFAULT true,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES profiles(id),
  revocation_reason text,

  -- Métadonnées
  created_by uuid REFERENCES profiles(id),
  customer_email text NOT NULL,
  customer_name text NOT NULL,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_accessed_at timestamptz
);

-- Index pour performance
CREATE INDEX idx_warranty_download_tokens_token ON warranty_download_tokens(token) WHERE is_active = true;
CREATE INDEX idx_warranty_download_tokens_warranty ON warranty_download_tokens(warranty_id);
CREATE INDEX idx_warranty_download_tokens_organization ON warranty_download_tokens(organization_id);
CREATE INDEX idx_warranty_download_tokens_expires ON warranty_download_tokens(expires_at) WHERE is_active = true;

-- =====================================================
-- ÉTAPE 2: Table pour l'audit des téléchargements
-- =====================================================

CREATE TABLE IF NOT EXISTS warranty_download_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relations
  warranty_id uuid NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  token_id uuid REFERENCES warranty_download_tokens(id) ON DELETE SET NULL,

  -- Détails de l'accès
  document_type text NOT NULL CHECK (document_type IN ('contract', 'customer_invoice', 'merchant_invoice', 'all')),
  access_result text NOT NULL CHECK (access_result IN ('success', 'failed', 'denied', 'expired')),
  failure_reason text,

  -- Informations de sécurité
  ip_address inet,
  user_agent text,
  referer text,
  geolocation jsonb,

  -- Métadonnées
  download_duration_ms integer,
  file_size_bytes bigint,

  -- Timestamp
  accessed_at timestamptz NOT NULL DEFAULT now()
);

-- Index pour analyse et sécurité
CREATE INDEX idx_warranty_download_logs_warranty ON warranty_download_logs(warranty_id);
CREATE INDEX idx_warranty_download_logs_token ON warranty_download_logs(token_id);
CREATE INDEX idx_warranty_download_logs_accessed_at ON warranty_download_logs(accessed_at DESC);
CREATE INDEX idx_warranty_download_logs_ip ON warranty_download_logs(ip_address);
CREATE INDEX idx_warranty_download_logs_result ON warranty_download_logs(access_result);

-- =====================================================
-- ÉTAPE 3: Activer RLS
-- =====================================================

ALTER TABLE warranty_download_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_download_logs ENABLE ROW LEVEL SECURITY;

-- Policies pour warranty_download_tokens
CREATE POLICY "Users can view own organization tokens"
  ON warranty_download_tokens FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can create tokens"
  ON warranty_download_tokens FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own organization tokens"
  ON warranty_download_tokens FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete tokens"
  ON warranty_download_tokens FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'master')
  );

-- Policies pour warranty_download_logs
CREATE POLICY "Users can view own organization logs"
  ON warranty_download_logs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can insert logs"
  ON warranty_download_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- ÉTAPE 4: Fonction pour créer un token de téléchargement
-- =====================================================

CREATE OR REPLACE FUNCTION create_warranty_download_token(
  p_warranty_id uuid,
  p_customer_email text,
  p_customer_name text,
  p_expires_in_days integer DEFAULT 90,
  p_max_downloads integer DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_organization_id uuid;
  v_token_id uuid;
  v_token uuid;
BEGIN
  -- Récupérer l'organization_id de la garantie
  SELECT organization_id INTO v_organization_id
  FROM warranties
  WHERE id = p_warranty_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Warranty not found: %', p_warranty_id;
  END IF;

  -- Créer le token
  INSERT INTO warranty_download_tokens (
    warranty_id,
    organization_id,
    customer_email,
    customer_name,
    expires_at,
    max_downloads,
    created_by
  ) VALUES (
    p_warranty_id,
    v_organization_id,
    p_customer_email,
    p_customer_name,
    now() + (p_expires_in_days || ' days')::interval,
    p_max_downloads,
    auth.uid()
  )
  RETURNING id, token INTO v_token_id, v_token;

  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ÉTAPE 5: Fonction pour valider un token de téléchargement
-- =====================================================

CREATE OR REPLACE FUNCTION validate_warranty_download_token(
  p_token uuid
)
RETURNS TABLE (
  is_valid boolean,
  warranty_id uuid,
  organization_id uuid,
  customer_email text,
  downloads_remaining integer,
  error_message text
) AS $$
DECLARE
  v_token_record record;
  v_downloads_remaining integer;
BEGIN
  -- Récupérer le token
  SELECT * INTO v_token_record
  FROM warranty_download_tokens
  WHERE token = p_token;

  -- Vérifier si le token existe
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::uuid, NULL::text, NULL::integer, 'Token invalide'::text;
    RETURN;
  END IF;

  -- Vérifier si le token est actif
  IF NOT v_token_record.is_active THEN
    RETURN QUERY SELECT false, v_token_record.warranty_id, v_token_record.organization_id,
                        v_token_record.customer_email, NULL::integer, 'Token révoqué'::text;
    RETURN;
  END IF;

  -- Vérifier si le token est expiré
  IF v_token_record.expires_at < now() THEN
    RETURN QUERY SELECT false, v_token_record.warranty_id, v_token_record.organization_id,
                        v_token_record.customer_email, NULL::integer, 'Token expiré'::text;
    RETURN;
  END IF;

  -- Vérifier le nombre de téléchargements
  IF v_token_record.max_downloads IS NOT NULL THEN
    v_downloads_remaining := v_token_record.max_downloads - v_token_record.downloads_count;
    IF v_downloads_remaining <= 0 THEN
      RETURN QUERY SELECT false, v_token_record.warranty_id, v_token_record.organization_id,
                          v_token_record.customer_email, 0, 'Limite de téléchargements atteinte'::text;
      RETURN;
    END IF;
  ELSE
    v_downloads_remaining := NULL; -- Illimité
  END IF;

  -- Token valide
  RETURN QUERY SELECT true, v_token_record.warranty_id, v_token_record.organization_id,
                      v_token_record.customer_email, v_downloads_remaining, NULL::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ÉTAPE 6: Fonction pour enregistrer un téléchargement
-- =====================================================

CREATE OR REPLACE FUNCTION log_warranty_download(
  p_token uuid,
  p_document_type text,
  p_access_result text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_failure_reason text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_token_record record;
BEGIN
  -- Récupérer les informations du token
  SELECT * INTO v_token_record
  FROM warranty_download_tokens
  WHERE token = p_token;

  IF NOT FOUND THEN
    -- Logger même pour les tokens invalides
    INSERT INTO warranty_download_logs (
      warranty_id,
      organization_id,
      document_type,
      access_result,
      failure_reason,
      ip_address,
      user_agent
    ) VALUES (
      NULL,
      NULL,
      p_document_type,
      'failed',
      'Token not found',
      p_ip_address::inet,
      p_user_agent
    );
    RETURN;
  END IF;

  -- Insérer le log
  INSERT INTO warranty_download_logs (
    warranty_id,
    organization_id,
    token_id,
    document_type,
    access_result,
    failure_reason,
    ip_address,
    user_agent
  ) VALUES (
    v_token_record.warranty_id,
    v_token_record.organization_id,
    v_token_record.id,
    p_document_type,
    p_access_result,
    p_failure_reason,
    p_ip_address::inet,
    p_user_agent
  );

  -- Incrémenter le compteur si succès
  IF p_access_result = 'success' THEN
    UPDATE warranty_download_tokens
    SET
      downloads_count = downloads_count + 1,
      last_accessed_at = now(),
      updated_at = now()
    WHERE token = p_token;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ÉTAPE 7: Fonction pour révoquer un token
-- =====================================================

CREATE OR REPLACE FUNCTION revoke_warranty_download_token(
  p_token uuid,
  p_reason text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE warranty_download_tokens
  SET
    is_active = false,
    revoked_at = now(),
    revoked_by = auth.uid(),
    revocation_reason = p_reason,
    updated_at = now()
  WHERE token = p_token
  AND is_active = true;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ÉTAPE 8: Vue pour statistiques de téléchargement
-- =====================================================

CREATE OR REPLACE VIEW warranty_download_stats AS
SELECT
  w.id as warranty_id,
  w.contract_number,
  w.organization_id,
  COUNT(DISTINCT wdl.id) as total_downloads,
  COUNT(DISTINCT wdl.ip_address) as unique_ips,
  COUNT(DISTINCT CASE WHEN wdl.access_result = 'success' THEN wdl.id END) as successful_downloads,
  COUNT(DISTINCT CASE WHEN wdl.access_result = 'failed' THEN wdl.id END) as failed_downloads,
  MAX(wdl.accessed_at) as last_download_at,
  MIN(wdl.accessed_at) as first_download_at
FROM warranties w
LEFT JOIN warranty_download_logs wdl ON wdl.warranty_id = w.id
GROUP BY w.id, w.contract_number, w.organization_id;

-- =====================================================
-- ÉTAPE 9: Trigger pour updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_warranty_download_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER warranty_download_tokens_updated_at
  BEFORE UPDATE ON warranty_download_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_warranty_download_tokens_updated_at();

-- =====================================================
-- ÉTAPE 10: Fonction de nettoyage des tokens expirés
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_expired_download_tokens()
RETURNS integer AS $$
DECLARE
  v_deleted integer;
BEGIN
  -- Désactiver les tokens expirés (sans les supprimer pour l'audit)
  UPDATE warranty_download_tokens
  SET
    is_active = false,
    updated_at = now()
  WHERE expires_at < now()
  AND is_active = true;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Note: Cette migration crée l'infrastructure complète
-- pour le système de téléchargement sécurisé.
-- =====================================================
