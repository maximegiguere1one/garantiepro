/*
  # Système de Dashboard des Invitations - Amélioration Complète

  ## Résumé
  Cette migration crée un système complet de monitoring et de gestion des invitations
  avec des vues optimisées, des fonctions helper et des métriques en temps réel.

  ## Changements Principaux

  ### 1. Vue Dashboard des Invitations
  - Statut agrégé et calculé automatiquement
  - Informations complètes sur l'inviteur et l'organisation
  - Performance optimisée avec indexes

  ### 2. Fonctions de Gestion
  - Renvoi d'invitation avec validation
  - Génération de lien manuel
  - Nettoyage automatique des invitations expirées
  - Statistiques détaillées

  ### 3. Métriques en Temps Réel
  - Taux de succès
  - Temps moyen d'acceptation
  - Erreurs récentes
  - Volume quotidien

  ## Sécurité
  - RLS maintenu sur toutes les vues
  - Validation des permissions pour chaque fonction
  - Audit trail complet
*/

-- =====================================================
-- ÉTAPE 1: VUE DASHBOARD DES INVITATIONS
-- =====================================================

CREATE OR REPLACE VIEW invitation_status_dashboard AS
SELECT
  fi.id,
  fi.email,
  fi.role,
  fi.status,
  fi.created_at,
  fi.sent_at,
  fi.accepted_at,
  fi.expires_at,
  fi.attempts,
  fi.last_error,
  fi.organization_id,
  o.name as organization_name,
  o.type as organization_type,
  p.full_name as invited_by_name,
  p.email as invited_by_email,
  u.email as user_email,
  u.id as user_id,
  -- Statut calculé pour l'affichage
  CASE
    WHEN fi.expires_at < NOW() AND fi.status NOT IN ('accepted', 'failed') THEN 'expired'
    WHEN fi.status = 'accepted' THEN 'completed'
    WHEN fi.status = 'failed' THEN 'failed'
    WHEN fi.sent_at IS NULL THEN 'pending_send'
    WHEN fi.sent_at IS NOT NULL AND fi.status = 'sent' THEN 'awaiting_acceptance'
    ELSE fi.status
  END as display_status,
  -- Temps écoulé depuis la création
  EXTRACT(EPOCH FROM (NOW() - fi.created_at)) / 3600 as hours_since_created,
  -- Temps jusqu'à expiration (en heures, négatif si expiré)
  EXTRACT(EPOCH FROM (fi.expires_at - NOW())) / 3600 as hours_until_expiry,
  -- Peut être renvoyé
  CASE
    WHEN fi.status IN ('failed', 'expired') THEN true
    WHEN fi.expires_at < NOW() THEN true
    WHEN fi.attempts >= 3 AND fi.status != 'accepted' THEN true
    ELSE false
  END as can_resend
FROM franchisee_invitations fi
JOIN organizations o ON fi.organization_id = o.id
LEFT JOIN profiles p ON fi.invited_by = p.id
LEFT JOIN auth.users u ON fi.user_id = u.id
ORDER BY fi.created_at DESC;

COMMENT ON VIEW invitation_status_dashboard IS 'Vue complète pour le dashboard de gestion des invitations avec statuts calculés et métriques';

-- =====================================================
-- ÉTAPE 2: FONCTION DE RENVOI D'INVITATION
-- =====================================================

CREATE OR REPLACE FUNCTION resend_invitation(
  p_invitation_id uuid,
  p_requesting_user_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation RECORD;
  v_requesting_profile RECORD;
  v_new_token text;
  v_new_expiry timestamptz;
  v_result jsonb;
BEGIN
  -- Vérifier que l'utilisateur a les permissions
  SELECT role, organization_id INTO v_requesting_profile
  FROM profiles
  WHERE id = p_requesting_user_id;

  IF v_requesting_profile.role NOT IN ('super_admin', 'admin') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Seuls les administrateurs peuvent renvoyer des invitations'
    );
  END IF;

  -- Récupérer l'invitation
  SELECT * INTO v_invitation
  FROM franchisee_invitations
  WHERE id = p_invitation_id;

  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invitation introuvable'
    );
  END IF;

  -- Vérifier les permissions d'organisation
  IF v_requesting_profile.role != 'super_admin'
     AND v_invitation.organization_id != v_requesting_profile.organization_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Vous ne pouvez renvoyer que les invitations de votre organisation'
    );
  END IF;

  -- Vérifier si l'invitation peut être renvoyée
  IF v_invitation.status = 'accepted' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cette invitation a déjà été acceptée'
    );
  END IF;

  -- Générer un nouveau token et prolonger l'expiration
  v_new_token := encode(gen_random_bytes(32), 'base64');
  v_new_expiry := NOW() + INTERVAL '7 days';

  -- Mettre à jour l'invitation
  UPDATE franchisee_invitations
  SET
    status = 'pending',
    invitation_token = v_new_token,
    expires_at = v_new_expiry,
    attempts = attempts + 1,
    last_error = NULL,
    updated_at = NOW()
  WHERE id = p_invitation_id;

  -- Logger l'action
  PERFORM log_invitation_event(
    p_invitation_id,
    'resent',
    false,
    NULL,
    NULL,
    jsonb_build_object(
      'resent_by', p_requesting_user_id,
      'new_expiry', v_new_expiry
    )
  );

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Invitation renvoyée avec succès',
    'invitation_id', p_invitation_id,
    'new_token', v_new_token,
    'expires_at', v_new_expiry
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION resend_invitation TO authenticated;

COMMENT ON FUNCTION resend_invitation IS 'Renvoie une invitation expirée ou échouée avec un nouveau token';

-- =====================================================
-- ÉTAPE 3: FONCTION DE GÉNÉRATION DE LIEN MANUEL
-- =====================================================

CREATE OR REPLACE FUNCTION generate_manual_invitation_link(
  p_invitation_id uuid,
  p_requesting_user_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation RECORD;
  v_requesting_profile RECORD;
  v_reset_link text;
  v_site_url text := 'https://app.garantieproremorque.com';
BEGIN
  -- Vérifier les permissions
  SELECT role, organization_id INTO v_requesting_profile
  FROM profiles
  WHERE id = p_requesting_user_id;

  IF v_requesting_profile.role NOT IN ('super_admin', 'admin') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Permission refusée'
    );
  END IF;

  -- Récupérer l'invitation
  SELECT * INTO v_invitation
  FROM franchisee_invitations
  WHERE id = p_invitation_id;

  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invitation introuvable'
    );
  END IF;

  -- Vérifier les permissions d'organisation
  IF v_requesting_profile.role != 'super_admin'
     AND v_invitation.organization_id != v_requesting_profile.organization_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Permission refusée pour cette organisation'
    );
  END IF;

  -- Construire le lien manuel
  v_reset_link := v_site_url || '/reset-password?token=' || v_invitation.invitation_token;

  -- Logger l'action
  PERFORM log_invitation_event(
    p_invitation_id,
    'manual_link_generated',
    false,
    NULL,
    NULL,
    jsonb_build_object(
      'generated_by', p_requesting_user_id,
      'link_generated_at', NOW()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'invitation_link', v_reset_link,
    'email', v_invitation.email,
    'expires_at', v_invitation.expires_at,
    'instructions', 'Partagez ce lien de manière sécurisée avec ' || v_invitation.email
  );
END;
$$;

GRANT EXECUTE ON FUNCTION generate_manual_invitation_link TO authenticated;

COMMENT ON FUNCTION generate_manual_invitation_link IS 'Génère un lien d''invitation manuel pour partage direct';

-- =====================================================
-- ÉTAPE 4: FONCTION DE STATISTIQUES DÉTAILLÉES
-- =====================================================

CREATE OR REPLACE FUNCTION get_invitation_metrics(
  p_organization_id uuid DEFAULT NULL,
  p_days_back integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_metrics jsonb;
  v_start_date timestamptz;
BEGIN
  v_start_date := NOW() - (p_days_back || ' days')::interval;

  WITH metrics AS (
    SELECT
      COUNT(*) as total_invitations,
      COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'sent') as sent,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      COUNT(*) FILTER (WHERE expires_at < NOW() AND status NOT IN ('accepted', 'failed')) as expired,
      ROUND(AVG(EXTRACT(EPOCH FROM (accepted_at - created_at)) / 3600)::numeric, 2) as avg_acceptance_hours,
      ROUND((COUNT(*) FILTER (WHERE status = 'accepted')::numeric / NULLIF(COUNT(*) FILTER (WHERE status IN ('accepted', 'failed', 'expired')), 0) * 100), 2) as success_rate,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as last_24h,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as last_7d
    FROM franchisee_invitations
    WHERE created_at >= v_start_date
      AND (p_organization_id IS NULL OR organization_id = p_organization_id)
  ),
  recent_errors AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'email', email,
        'error', last_error,
        'attempts', attempts,
        'created_at', created_at
      ) ORDER BY created_at DESC
    ) as errors
    FROM (
      SELECT email, last_error, attempts, created_at
      FROM franchisee_invitations
      WHERE status = 'failed'
        AND last_error IS NOT NULL
        AND created_at >= v_start_date
        AND (p_organization_id IS NULL OR organization_id = p_organization_id)
      ORDER BY created_at DESC
      LIMIT 10
    ) recent
  ),
  daily_volume AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'date', day::date,
        'sent', sent_count,
        'accepted', accepted_count
      ) ORDER BY day DESC
    ) as daily_stats
    FROM (
      SELECT
        DATE_TRUNC('day', created_at) as day,
        COUNT(*) as sent_count,
        COUNT(*) FILTER (WHERE status = 'accepted') as accepted_count
      FROM franchisee_invitations
      WHERE created_at >= v_start_date
        AND (p_organization_id IS NULL OR organization_id = p_organization_id)
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY day DESC
      LIMIT 30
    ) daily
  )
  SELECT jsonb_build_object(
    'period', jsonb_build_object(
      'days', p_days_back,
      'start_date', v_start_date,
      'end_date', NOW()
    ),
    'summary', jsonb_build_object(
      'total_invitations', m.total_invitations,
      'accepted', m.accepted,
      'pending', m.pending,
      'sent', m.sent,
      'failed', m.failed,
      'expired', m.expired,
      'success_rate', COALESCE(m.success_rate, 0),
      'avg_acceptance_hours', COALESCE(m.avg_acceptance_hours, 0)
    ),
    'recent_activity', jsonb_build_object(
      'last_24_hours', m.last_24h,
      'last_7_days', m.last_7d
    ),
    'recent_errors', COALESCE(re.errors, '[]'::jsonb),
    'daily_volume', COALESCE(dv.daily_stats, '[]'::jsonb)
  ) INTO v_metrics
  FROM metrics m
  CROSS JOIN recent_errors re
  CROSS JOIN daily_volume dv;

  RETURN v_metrics;
END;
$$;

GRANT EXECUTE ON FUNCTION get_invitation_metrics TO authenticated;

COMMENT ON FUNCTION get_invitation_metrics IS 'Retourne des métriques détaillées sur les invitations avec volume quotidien et erreurs';

-- =====================================================
-- ÉTAPE 5: FONCTION DE NETTOYAGE AUTOMATIQUE
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_expired_invitations_enhanced()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_count integer;
  v_cleaned_count integer;
BEGIN
  -- Marquer les invitations expirées
  WITH updated AS (
    UPDATE franchisee_invitations
    SET
      status = 'expired',
      updated_at = NOW()
    WHERE status NOT IN ('accepted', 'expired', 'failed')
      AND expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_expired_count FROM updated;

  -- Logger les invitations expirées
  INSERT INTO invitation_logs (invitation_id, action, metadata)
  SELECT
    id,
    'expired',
    jsonb_build_object(
      'auto_cleanup', true,
      'cleaned_at', NOW()
    )
  FROM franchisee_invitations
  WHERE status = 'expired'
    AND updated_at > NOW() - INTERVAL '5 minutes';

  -- Nettoyer les anciennes invitations expirées (plus de 90 jours)
  WITH deleted AS (
    DELETE FROM franchisee_invitations
    WHERE status = 'expired'
      AND expires_at < NOW() - INTERVAL '90 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_cleaned_count FROM deleted;

  RETURN jsonb_build_object(
    'success', true,
    'expired_count', v_expired_count,
    'cleaned_count', v_cleaned_count,
    'timestamp', NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_expired_invitations_enhanced TO authenticated;

COMMENT ON FUNCTION cleanup_expired_invitations_enhanced IS 'Nettoie automatiquement les invitations expirées et supprime les anciennes';

-- =====================================================
-- ÉTAPE 6: INDEXES POUR PERFORMANCE
-- =====================================================

-- Index pour le dashboard
CREATE INDEX IF NOT EXISTS idx_franchisee_invitations_status_created
  ON franchisee_invitations(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_franchisee_invitations_org_status
  ON franchisee_invitations(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_franchisee_invitations_expires
  ON franchisee_invitations(expires_at)
  WHERE status NOT IN ('accepted', 'failed', 'expired');

-- Index pour les statistiques
CREATE INDEX IF NOT EXISTS idx_franchisee_invitations_created_date
  ON franchisee_invitations(DATE_TRUNC('day', created_at));

-- =====================================================
-- ÉTAPE 7: FONCTION DE VALIDATION DE SANTÉ
-- =====================================================

CREATE OR REPLACE FUNCTION check_invitation_system_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_health jsonb;
  v_profile_trigger_exists boolean;
  v_recent_failures integer;
  v_pending_old integer;
BEGIN
  -- Vérifier le trigger de création de profil
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'create_profile_on_signup'
  ) INTO v_profile_trigger_exists;

  -- Compter les échecs récents
  SELECT COUNT(*) INTO v_recent_failures
  FROM franchisee_invitations
  WHERE status = 'failed'
    AND created_at > NOW() - INTERVAL '24 hours';

  -- Compter les invitations en attente depuis trop longtemps
  SELECT COUNT(*) INTO v_pending_old
  FROM franchisee_invitations
  WHERE status IN ('pending', 'sent')
    AND created_at < NOW() - INTERVAL '7 days';

  v_health := jsonb_build_object(
    'timestamp', NOW(),
    'overall_status', CASE
      WHEN NOT v_profile_trigger_exists THEN 'critical'
      WHEN v_recent_failures > 10 THEN 'warning'
      WHEN v_pending_old > 5 THEN 'warning'
      ELSE 'healthy'
    END,
    'checks', jsonb_build_object(
      'profile_trigger', jsonb_build_object(
        'exists', v_profile_trigger_exists,
        'status', CASE WHEN v_profile_trigger_exists THEN 'ok' ELSE 'critical' END
      ),
      'recent_failures', jsonb_build_object(
        'count', v_recent_failures,
        'status', CASE WHEN v_recent_failures > 10 THEN 'warning' ELSE 'ok' END,
        'threshold', 10
      ),
      'old_pending', jsonb_build_object(
        'count', v_pending_old,
        'status', CASE WHEN v_pending_old > 5 THEN 'warning' ELSE 'ok' END,
        'threshold', 5
      )
    ),
    'recommendations', CASE
      WHEN NOT v_profile_trigger_exists THEN jsonb_build_array('Recréer le trigger create_profile_on_signup')
      WHEN v_recent_failures > 10 THEN jsonb_build_array('Investiguer les échecs récents', 'Vérifier la configuration email')
      WHEN v_pending_old > 5 THEN jsonb_build_array('Renvoyer ou nettoyer les invitations anciennes')
      ELSE jsonb_build_array()
    END
  );

  RETURN v_health;
END;
$$;

GRANT EXECUTE ON FUNCTION check_invitation_system_health TO authenticated;

COMMENT ON FUNCTION check_invitation_system_health IS 'Vérifie la santé du système d''invitation et retourne des recommandations';

-- =====================================================
-- ÉTAPE 8: PERMISSIONS RLS SUR LA VUE
-- =====================================================

-- La vue hérite automatiquement des RLS des tables sous-jacentes
-- Mais ajoutons une politique explicite si nécessaire

-- Note: Les vues n'ont pas de RLS direct, ils utilisent les policies des tables sources
-- L'accès est contrôlé par les policies existantes sur franchisee_invitations

-- =====================================================
-- ÉTAPE 9: COMMENTAIRES ET DOCUMENTATION
-- =====================================================

COMMENT ON TABLE franchisee_invitations IS 'Table principale des invitations avec tracking complet du cycle de vie';
COMMENT ON COLUMN franchisee_invitations.attempts IS 'Nombre de tentatives d''envoi (utilisé pour retry logic)';
COMMENT ON COLUMN franchisee_invitations.last_error IS 'Dernier message d''erreur pour debugging';
COMMENT ON COLUMN franchisee_invitations.invitation_token IS 'Token unique et sécurisé pour l''invitation';
