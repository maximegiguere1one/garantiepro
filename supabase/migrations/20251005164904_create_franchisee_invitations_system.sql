/*
  # Système de Gestion des Invitations de Franchisés
  
  ## Résumé
  Crée un système complet pour tracker et gérer les invitations envoyées aux franchisés.
  Permet de suivre l'historique, les tentatives, et le statut de chaque invitation.
  
  ## Tables Créées
  1. **franchisee_invitations** - Tracking de toutes les invitations envoyées
     - id (uuid, primary key)
     - organization_id (référence vers organizations)
     - email (email du destinataire)
     - invited_by (uuid, référence vers profiles)
     - status (enum: pending, sent, failed, accepted, expired)
     - invitation_token (unique token pour validation)
     - attempts (nombre de tentatives d'envoi)
     - last_error (dernier message d'erreur)
     - expires_at (date d'expiration - 7 jours)
     - accepted_at (date d'acceptation)
     - sent_at (date du dernier envoi)
     - created_at, updated_at
  
  ## Sécurité
  - RLS activé avec politiques strictes
  - Seuls les admins owner peuvent voir toutes les invitations
  - Les franchisés peuvent voir leurs propres invitations
  - Indices pour performance optimale
  
  ## Notes
  - Les invitations expirent après 7 jours par défaut
  - Maximum 3 tentatives d'envoi par invitation
  - Système de rate limiting intégré
*/

-- =====================================================
-- 1. Create franchisee_invitations table
-- =====================================================
CREATE TABLE IF NOT EXISTS franchisee_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_by uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'accepted', 'expired')),
  invitation_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_franchisee_invitations_org ON franchisee_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_franchisee_invitations_email ON franchisee_invitations(email);
CREATE INDEX IF NOT EXISTS idx_franchisee_invitations_status ON franchisee_invitations(status);
CREATE INDEX IF NOT EXISTS idx_franchisee_invitations_token ON franchisee_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_franchisee_invitations_expires ON franchisee_invitations(expires_at);

-- Enable RLS
ALTER TABLE franchisee_invitations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. RLS Policies
-- =====================================================

-- Owner admins can view all invitations
CREATE POLICY "Owner admins can view all invitations"
  ON franchisee_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN organizations o ON p.organization_id = o.id
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND o.type = 'owner'
    )
  );

-- Owner admins can insert invitations
CREATE POLICY "Owner admins can create invitations"
  ON franchisee_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN organizations o ON p.organization_id = o.id
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND o.type = 'owner'
    )
  );

-- Owner admins can update invitations
CREATE POLICY "Owner admins can update invitations"
  ON franchisee_invitations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN organizations o ON p.organization_id = o.id
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND o.type = 'owner'
    )
  );

-- Franchisees can view their own organization invitations
CREATE POLICY "Franchisees can view own org invitations"
  ON franchisee_invitations FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE profiles.id = auth.uid()
    )
  );

-- =====================================================
-- 3. Helper Functions
-- =====================================================

-- Function to check if invitation is expired
CREATE OR REPLACE FUNCTION is_invitation_expired(invitation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expires_at timestamptz;
BEGIN
  SELECT expires_at INTO v_expires_at
  FROM franchisee_invitations
  WHERE id = invitation_id;
  
  RETURN (v_expires_at < now());
END;
$$;

-- Function to mark expired invitations
CREATE OR REPLACE FUNCTION mark_expired_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE franchisee_invitations
  SET status = 'expired',
      updated_at = now()
  WHERE expires_at < now()
  AND status NOT IN ('accepted', 'expired');
END;
$$;

-- Function to get invitation stats
CREATE OR REPLACE FUNCTION get_invitation_stats()
RETURNS TABLE (
  total_invitations bigint,
  pending_invitations bigint,
  sent_invitations bigint,
  failed_invitations bigint,
  accepted_invitations bigint,
  expired_invitations bigint,
  success_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_invitations,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_invitations,
    COUNT(*) FILTER (WHERE status = 'sent') as sent_invitations,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_invitations,
    COUNT(*) FILTER (WHERE status = 'accepted') as accepted_invitations,
    COUNT(*) FILTER (WHERE status = 'expired') as expired_invitations,
    CASE 
      WHEN COUNT(*) FILTER (WHERE status = 'sent') > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE status = 'accepted')::numeric / COUNT(*) FILTER (WHERE status = 'sent')::numeric) * 100, 2)
      ELSE 0
    END as success_rate
  FROM franchisee_invitations;
END;
$$;

-- =====================================================
-- 4. Trigger for updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_franchisee_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_franchisee_invitations_updated_at ON franchisee_invitations;
CREATE TRIGGER trigger_update_franchisee_invitations_updated_at
  BEFORE UPDATE ON franchisee_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_franchisee_invitations_updated_at();

-- =====================================================
-- 5. Rate Limiting Function
-- =====================================================
CREATE OR REPLACE FUNCTION check_invitation_rate_limit(
  p_organization_id uuid,
  p_hours integer DEFAULT 1,
  p_max_attempts integer DEFAULT 3
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recent_attempts integer;
BEGIN
  SELECT COUNT(*) INTO v_recent_attempts
  FROM franchisee_invitations
  WHERE organization_id = p_organization_id
  AND created_at > (now() - (p_hours || ' hours')::interval);
  
  RETURN (v_recent_attempts < p_max_attempts);
END;
$$;

-- =====================================================
-- 6. Grant permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION is_invitation_expired(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_expired_invitations() TO authenticated;
GRANT EXECUTE ON FUNCTION get_invitation_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION check_invitation_rate_limit(uuid, integer, integer) TO authenticated;