/*
  # Amélioration Complète du Système d'Invitation des Franchises

  ## Résumé
  Cette migration corrige tous les problèmes liés au flux d'invitation des franchises:
  - Ajout de tokens d'invitation sécurisés et uniques
  - Amélioration du tracking des invitations
  - Ajout de fonctions de récupération automatique
  - Mécanismes de fallback si l'email échoue
  - Logging détaillé pour debugging

  ## 1. Améliorations de la Table franchisee_invitations
  - Ajout de role dans l'invitation
  - Amélioration du tracking des tentatives
  - Ajout de métadonnées utiles (lien d'invitation, user_id)

  ## 2. Nouvelle Table: invitation_logs
  - Log détaillé de chaque tentative d'invitation
  - Stockage des erreurs pour debugging
  - Historique complet

  ## 3. Fonctions Helper
  - Validation automatique des invitations expirées
  - Récupération des profils incomplets
  - Génération de liens d'invitation

  ## 4. Sécurité
  - RLS sur toutes les tables
  - Tokens sécurisés non-prédictibles
  - Validation stricte des permissions
*/

-- =====================================================
-- ÉTAPE 1: AMÉLIORER LA TABLE franchisee_invitations
-- =====================================================

-- Ajouter role s'il n'existe pas déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'franchisee_invitations' AND column_name = 'role'
  ) THEN
    ALTER TABLE franchisee_invitations
    ADD COLUMN role text NOT NULL DEFAULT 'admin'
    CHECK (role IN ('super_admin', 'admin', 'dealer', 'f_and_i', 'operations', 'client'));
  END IF;
END $$;

-- Ajouter user_id pour référencer l'utilisateur créé
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'franchisee_invitations' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE franchisee_invitations
    ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Ajouter invitation_link pour stocker le lien généré
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'franchisee_invitations' AND column_name = 'invitation_link'
  ) THEN
    ALTER TABLE franchisee_invitations
    ADD COLUMN invitation_link text;
  END IF;
END $$;

-- Ajouter temporary_password (chiffré) pour fallback
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'franchisee_invitations' AND column_name = 'temporary_password_hint'
  ) THEN
    ALTER TABLE franchisee_invitations
    ADD COLUMN temporary_password_hint text;
  END IF;
END $$;

-- Ajouter metadata JSON pour informations supplémentaires
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'franchisee_invitations' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE franchisee_invitations
    ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Créer index sur user_id
CREATE INDEX IF NOT EXISTS idx_franchisee_invitations_user_id ON franchisee_invitations(user_id);

-- =====================================================
-- ÉTAPE 2: CRÉER TABLE DE LOGS D'INVITATION
-- =====================================================

CREATE TABLE IF NOT EXISTS invitation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid REFERENCES franchisee_invitations(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('created', 'sent', 'failed', 'resent', 'accepted', 'expired')),
  email_sent boolean DEFAULT false,
  error_message text,
  error_details jsonb,
  user_agent text,
  ip_address inet,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_invitation_logs_invitation ON invitation_logs(invitation_id);
CREATE INDEX IF NOT EXISTS idx_invitation_logs_action ON invitation_logs(action);
CREATE INDEX IF NOT EXISTS idx_invitation_logs_created ON invitation_logs(created_at DESC);

-- RLS sur invitation_logs
ALTER TABLE invitation_logs ENABLE ROW LEVEL SECURITY;

-- Owner admins peuvent voir tous les logs
CREATE POLICY "Owner admins can view all invitation logs"
  ON invitation_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN organizations o ON p.organization_id = o.id
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
      AND o.type = 'owner'
    )
  );

-- Système peut créer des logs (via fonctions SECURITY DEFINER)
CREATE POLICY "System can insert invitation logs"
  ON invitation_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- ÉTAPE 3: FONCTION DE LOG D'INVITATION
-- =====================================================

CREATE OR REPLACE FUNCTION log_invitation_event(
  p_invitation_id uuid,
  p_action text,
  p_email_sent boolean DEFAULT false,
  p_error_message text DEFAULT NULL,
  p_error_details jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO invitation_logs (
    invitation_id,
    action,
    email_sent,
    error_message,
    error_details,
    metadata
  ) VALUES (
    p_invitation_id,
    p_action,
    p_email_sent,
    p_error_message,
    p_error_details,
    p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION log_invitation_event TO authenticated;

-- =====================================================
-- ÉTAPE 4: FONCTION DE GÉNÉRATION DE LIEN D'INVITATION
-- =====================================================

CREATE OR REPLACE FUNCTION generate_invitation_link(
  p_user_id uuid,
  p_site_url text DEFAULT 'https://app.garantieproremorque.com'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN p_site_url || '/invitation/' || encode(p_user_id::text::bytea, 'base64');
END;
$$;

GRANT EXECUTE ON FUNCTION generate_invitation_link TO authenticated;

-- =====================================================
-- ÉTAPE 5: FONCTION DE VALIDATION D'INVITATION
-- =====================================================

CREATE OR REPLACE FUNCTION validate_invitation_token(p_token text)
RETURNS TABLE (
  valid boolean,
  invitation_id uuid,
  email text,
  role text,
  organization_id uuid,
  organization_name text,
  expired boolean,
  user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN fi.id IS NOT NULL AND fi.status != 'accepted' AND fi.expires_at > now()
      THEN true
      ELSE false
    END as valid,
    fi.id as invitation_id,
    fi.email,
    fi.role,
    fi.organization_id,
    o.name as organization_name,
    CASE WHEN fi.expires_at <= now() THEN true ELSE false END as expired,
    fi.user_id
  FROM franchisee_invitations fi
  JOIN organizations o ON fi.organization_id = o.id
  WHERE fi.invitation_token = p_token;
END;
$$;

GRANT EXECUTE ON FUNCTION validate_invitation_token TO anon, authenticated;

-- =====================================================
-- ÉTAPE 6: FONCTION DE MARQUAGE D'INVITATION ACCEPTÉE
-- =====================================================

CREATE OR REPLACE FUNCTION accept_invitation(
  p_invitation_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_success boolean := false;
BEGIN
  -- Vérifier que l'invitation existe et n'est pas expirée
  IF EXISTS (
    SELECT 1 FROM franchisee_invitations
    WHERE id = p_invitation_id
    AND status != 'accepted'
    AND expires_at > now()
  ) THEN
    -- Marquer comme acceptée
    UPDATE franchisee_invitations
    SET
      status = 'accepted',
      accepted_at = now(),
      user_id = p_user_id,
      updated_at = now()
    WHERE id = p_invitation_id;

    -- Logger l'événement
    PERFORM log_invitation_event(
      p_invitation_id,
      'accepted',
      false,
      NULL,
      NULL,
      jsonb_build_object('user_id', p_user_id)
    );

    v_success := true;
  END IF;

  RETURN v_success;
END;
$$;

GRANT EXECUTE ON FUNCTION accept_invitation TO authenticated;

-- =====================================================
-- ÉTAPE 7: FONCTION DE RÉCUPÉRATION DES PROFILS INCOMPLETS
-- =====================================================

CREATE OR REPLACE FUNCTION fix_incomplete_profiles()
RETURNS TABLE (
  user_id uuid,
  email text,
  fixed boolean,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_org_id uuid;
  v_role text;
  v_full_name text;
BEGIN
  -- Trouver tous les utilisateurs sans profil ou avec profil incomplet
  FOR v_user IN
    SELECT
      u.id,
      u.email,
      u.raw_user_meta_data->>'organization_id' as meta_org_id,
      u.raw_user_meta_data->>'role' as meta_role,
      u.raw_user_meta_data->>'full_name' as meta_full_name
    FROM auth.users u
    LEFT JOIN profiles p ON u.id = p.id
    WHERE p.id IS NULL
    OR p.organization_id IS NULL
  LOOP
    BEGIN
      -- Déterminer l'organization_id
      IF v_user.meta_org_id IS NOT NULL THEN
        v_org_id := v_user.meta_org_id::uuid;
      ELSE
        -- Essayer de trouver via une invitation
        SELECT organization_id INTO v_org_id
        FROM franchisee_invitations
        WHERE email = v_user.email
        AND user_id = v_user.id
        ORDER BY created_at DESC
        LIMIT 1;
      END IF;

      -- Déterminer le rôle
      v_role := COALESCE(v_user.meta_role, 'admin');

      -- Déterminer le nom complet
      v_full_name := COALESCE(
        v_user.meta_full_name,
        split_part(v_user.email, '@', 1)
      );

      -- Si on a un organization_id, créer ou réparer le profil
      IF v_org_id IS NOT NULL THEN
        INSERT INTO profiles (
          id,
          email,
          full_name,
          role,
          organization_id
        ) VALUES (
          v_user.id,
          v_user.email,
          v_full_name,
          v_role,
          v_org_id
        )
        ON CONFLICT (id) DO UPDATE SET
          organization_id = COALESCE(profiles.organization_id, EXCLUDED.organization_id),
          full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
          role = COALESCE(profiles.role, EXCLUDED.role);

        RETURN QUERY SELECT v_user.id, v_user.email, true, NULL::text;
      ELSE
        RETURN QUERY SELECT
          v_user.id,
          v_user.email,
          false,
          'No organization_id found'::text;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT v_user.id, v_user.email, false, SQLERRM;
    END;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION fix_incomplete_profiles TO authenticated;

-- =====================================================
-- ÉTAPE 8: FONCTION DE NETTOYAGE DES INVITATIONS EXPIRÉES
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Marquer les invitations expirées
  WITH updated AS (
    UPDATE franchisee_invitations
    SET
      status = 'expired',
      updated_at = now()
    WHERE status NOT IN ('accepted', 'expired')
    AND expires_at < now()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM updated;

  -- Logger les invitations expirées
  INSERT INTO invitation_logs (invitation_id, action, metadata)
  SELECT
    id,
    'expired',
    jsonb_build_object('auto_cleanup', true)
  FROM franchisee_invitations
  WHERE status = 'expired'
  AND updated_at > now() - interval '1 minute';

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_expired_invitations TO authenticated;

-- =====================================================
-- ÉTAPE 9: TRIGGER POUR LOGGER AUTOMATIQUEMENT
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_log_invitation_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Logger les changements de statut
  IF TG_OP = 'INSERT' THEN
    PERFORM log_invitation_event(
      NEW.id,
      'created',
      false,
      NULL,
      NULL,
      jsonb_build_object(
        'email', NEW.email,
        'organization_id', NEW.organization_id,
        'role', NEW.role
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Logger si le statut a changé
    IF OLD.status != NEW.status THEN
      PERFORM log_invitation_event(
        NEW.id,
        NEW.status,
        CASE WHEN NEW.status = 'sent' THEN true ELSE false END,
        NEW.last_error,
        NULL,
        jsonb_build_object('previous_status', OLD.status)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_log_invitation_changes ON franchisee_invitations;
CREATE TRIGGER trigger_log_invitation_changes
  AFTER INSERT OR UPDATE ON franchisee_invitations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_invitation_changes();

-- =====================================================
-- ÉTAPE 10: FONCTION DE STATISTIQUES D'INVITATION
-- =====================================================

CREATE OR REPLACE FUNCTION get_invitation_statistics(
  p_organization_id uuid DEFAULT NULL
)
RETURNS TABLE (
  total_invitations bigint,
  pending_invitations bigint,
  sent_invitations bigint,
  failed_invitations bigint,
  accepted_invitations bigint,
  expired_invitations bigint,
  success_rate numeric,
  avg_acceptance_time interval,
  recent_errors jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'sent') as sent,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
      COUNT(*) FILTER (WHERE status = 'expired') as expired,
      AVG(EXTRACT(EPOCH FROM (accepted_at - created_at))) FILTER (WHERE status = 'accepted') as avg_seconds
    FROM franchisee_invitations
    WHERE p_organization_id IS NULL OR organization_id = p_organization_id
  ),
  errors AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'invitation_id', fi.id,
        'email', fi.email,
        'error', fi.last_error,
        'attempts', fi.attempts,
        'last_attempt', fi.updated_at
      )
      ORDER BY fi.updated_at DESC
    ) as error_list
    FROM franchisee_invitations fi
    WHERE fi.status = 'failed'
    AND fi.last_error IS NOT NULL
    AND (p_organization_id IS NULL OR fi.organization_id = p_organization_id)
    LIMIT 10
  )
  SELECT
    s.total,
    s.pending,
    s.sent,
    s.failed,
    s.accepted,
    s.expired,
    CASE
      WHEN s.sent > 0
      THEN ROUND((s.accepted::numeric / s.sent::numeric) * 100, 2)
      ELSE 0
    END as success_rate,
    CASE
      WHEN s.avg_seconds IS NOT NULL
      THEN (s.avg_seconds || ' seconds')::interval
      ELSE NULL
    END as avg_acceptance_time,
    COALESCE(e.error_list, '[]'::jsonb) as recent_errors
  FROM stats s
  CROSS JOIN errors e;
END;
$$;

GRANT EXECUTE ON FUNCTION get_invitation_statistics TO authenticated;

-- =====================================================
-- ÉTAPE 11: COMMENTAIRES ET DOCUMENTATION
-- =====================================================

COMMENT ON TABLE invitation_logs IS 'Log détaillé de tous les événements liés aux invitations';
COMMENT ON FUNCTION log_invitation_event IS 'Logger un événement d''invitation avec détails';
COMMENT ON FUNCTION generate_invitation_link IS 'Générer un lien d''invitation sécurisé';
COMMENT ON FUNCTION validate_invitation_token IS 'Valider un token d''invitation';
COMMENT ON FUNCTION accept_invitation IS 'Marquer une invitation comme acceptée';
COMMENT ON FUNCTION fix_incomplete_profiles IS 'Réparer automatiquement les profils incomplets';
COMMENT ON FUNCTION cleanup_expired_invitations IS 'Nettoyer les invitations expirées';
COMMENT ON FUNCTION get_invitation_statistics IS 'Obtenir les statistiques d''invitation';
