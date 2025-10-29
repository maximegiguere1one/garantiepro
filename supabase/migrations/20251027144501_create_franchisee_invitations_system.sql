/*
  # Système de Gestion des Invitations de Franchisés
  
  ## Résumé
  Crée un système complet pour tracker et gérer les invitations envoyées aux franchisés.
  
  ## Tables Créées
  1. **franchisee_invitations** - Tracking de toutes les invitations envoyées
  
  ## Sécurité
  - RLS activé avec politiques strictes
  - Seuls les admins owner peuvent voir toutes les invitations
*/

-- Create franchisee_invitations table
CREATE TABLE IF NOT EXISTS franchisee_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  role text DEFAULT 'f_and_i',
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_franchisee_invitations_org ON franchisee_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_franchisee_invitations_email ON franchisee_invitations(email);
CREATE INDEX IF NOT EXISTS idx_franchisee_invitations_status ON franchisee_invitations(status);
CREATE INDEX IF NOT EXISTS idx_franchisee_invitations_token ON franchisee_invitations(invitation_token);

-- Enable RLS
ALTER TABLE franchisee_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all invitations"
  ON franchisee_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create invitations"
  ON franchisee_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update invitations"
  ON franchisee_invitations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );