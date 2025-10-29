/*
  # Table d'audit trail pour signatures électroniques
  
  Conforme LCCJTI Art. 46-48 - Conservation et traçabilité
*/

CREATE TABLE IF NOT EXISTS signature_audit_trail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id uuid NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Type d'événement
  event_type text NOT NULL CHECK (event_type IN (
    'document_opened',
    'document_scrolled',
    'terms_accepted',
    'identity_verified',
    'consent_given',
    'signature_started',
    'signature_completed',
    'document_generated',
    'email_sent',
    'pdf_downloaded'
  )),
  
  event_timestamp timestamptz NOT NULL DEFAULT now(),
  event_data jsonb DEFAULT '{}'::jsonb,
  
  -- Contexte technique
  ip_address inet,
  user_agent text,
  geolocation jsonb,
  screen_resolution text,
  
  -- Sécurité et intégrité
  session_id text NOT NULL,
  checksum text,
  
  created_at timestamptz DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_signature_audit_warranty ON signature_audit_trail(warranty_id);
CREATE INDEX IF NOT EXISTS idx_signature_audit_session ON signature_audit_trail(session_id);
CREATE INDEX IF NOT EXISTS idx_signature_audit_timestamp ON signature_audit_trail(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_signature_audit_event_type ON signature_audit_trail(event_type);

-- RLS
ALTER TABLE signature_audit_trail ENABLE ROW LEVEL SECURITY;

-- Politique: Utilisateurs voient l'audit de leur organisation
DROP POLICY IF EXISTS "Users can view org audit trail" ON signature_audit_trail;
CREATE POLICY "Users can view org audit trail"
  ON signature_audit_trail FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id());

-- Politique: Système peut créer des entrées d'audit
DROP POLICY IF EXISTS "System can create audit entries" ON signature_audit_trail;
CREATE POLICY "System can create audit entries"
  ON signature_audit_trail FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());

-- Fonction pour calculer le checksum d'une entrée d'audit
CREATE OR REPLACE FUNCTION calculate_audit_checksum(
  p_warranty_id uuid,
  p_event_type text,
  p_event_timestamp timestamptz,
  p_session_id text
) RETURNS text AS $$
BEGIN
  RETURN encode(
    digest(
      p_warranty_id::text || p_event_type || p_event_timestamp::text || p_session_id,
      'sha256'
    ),
    'hex'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction pour logger un événement d'audit
CREATE OR REPLACE FUNCTION log_signature_event(
  p_warranty_id uuid,
  p_organization_id uuid,
  p_event_type text,
  p_event_data jsonb DEFAULT '{}'::jsonb,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_geolocation jsonb DEFAULT NULL,
  p_session_id text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_audit_id uuid;
  v_checksum text;
  v_session_id text;
BEGIN
  v_session_id := COALESCE(p_session_id, gen_random_uuid()::text);
  
  v_checksum := calculate_audit_checksum(
    p_warranty_id,
    p_event_type,
    now(),
    v_session_id
  );
  
  INSERT INTO signature_audit_trail (
    warranty_id,
    organization_id,
    event_type,
    event_data,
    ip_address,
    user_agent,
    geolocation,
    session_id,
    checksum
  ) VALUES (
    p_warranty_id,
    p_organization_id,
    p_event_type,
    p_event_data,
    p_ip_address,
    p_user_agent,
    p_geolocation,
    v_session_id,
    v_checksum
  ) RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE signature_audit_trail IS 'Audit trail complet des signatures électroniques - Conforme LCCJTI Art. 46-48';
COMMENT ON FUNCTION log_signature_event IS 'Logger un événement d''audit avec checksum pour intégrité';
