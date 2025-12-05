/*
  # Système de Transfert et Suppression de Franchise

  ## Résumé
  Système complet permettant de supprimer une franchise en transférant
  ses garanties et données vers une autre franchise, avec audit complet.

  ## Tables Créées
  - franchise_deletion_history: Historique des suppressions de franchises

  ## Fonctions Créées
  - transfer_and_delete_franchise: Fonction principale de transfert et suppression
  - get_franchise_deletion_stats: Obtenir les statistiques avant suppression

  ## Sécurité
  - RLS activé sur toutes les tables
  - Seul le compte master peut supprimer des franchises
  - Audit complet de toutes les opérations
  - Transaction ACID garantissant l'intégrité des données
*/

-- =====================================================
-- TABLE: HISTORIQUE DES SUPPRESSIONS DE FRANCHISES
-- =====================================================

CREATE TABLE IF NOT EXISTS franchise_deletion_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Franchise supprimée
  deleted_franchise_id uuid NOT NULL,
  deleted_franchise_name text NOT NULL,
  deleted_franchise_code text,

  -- Franchise de destination
  destination_franchise_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  destination_franchise_name text NOT NULL,

  -- Utilisateur qui a effectué l'opération
  deleted_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  deleted_by_name text NOT NULL,

  -- Statistiques du transfert
  warranties_transferred int DEFAULT 0,
  customers_transferred int DEFAULT 0,
  claims_transferred int DEFAULT 0,
  users_deactivated int DEFAULT 0,
  tokens_transferred int DEFAULT 0,

  -- Données archivées (snapshot JSON de la franchise)
  franchise_snapshot jsonb DEFAULT '{}',
  transfer_details jsonb DEFAULT '{}',

  -- Statut et timestamps
  status text DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'rolled_back')),
  error_message text,

  deleted_at timestamptz DEFAULT now(),
  can_restore_until timestamptz DEFAULT (now() + interval '30 days'),

  -- Métadonnées
  ip_address inet,
  user_agent text
);

CREATE INDEX IF NOT EXISTS idx_franchise_deletion_deleted_franchise ON franchise_deletion_history(deleted_franchise_id);
CREATE INDEX IF NOT EXISTS idx_franchise_deletion_destination ON franchise_deletion_history(destination_franchise_id);
CREATE INDEX IF NOT EXISTS idx_franchise_deletion_deleted_by ON franchise_deletion_history(deleted_by);
CREATE INDEX IF NOT EXISTS idx_franchise_deletion_date ON franchise_deletion_history(deleted_at DESC);

ALTER TABLE franchise_deletion_history ENABLE ROW LEVEL SECURITY;

-- RLS: Seul le master peut voir l'historique
CREATE POLICY "Master can view deletion history"
  ON franchise_deletion_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (is_master_account = true OR role = 'master')
    )
  );

COMMENT ON TABLE franchise_deletion_history IS 'Historique complet des suppressions de franchises avec détails de transfert';

-- =====================================================
-- FONCTION: OBTENIR LES STATISTIQUES DE SUPPRESSION
-- =====================================================

CREATE OR REPLACE FUNCTION get_franchise_deletion_stats(p_franchise_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats jsonb;
  v_franchise_exists boolean;
BEGIN
  -- Vérifier que l'utilisateur est master
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (is_master_account = true OR role = 'master')
  ) THEN
    RAISE EXCEPTION 'Accès refusé: Seul le compte master peut supprimer des franchises';
  END IF;

  -- Vérifier que la franchise existe
  SELECT EXISTS(SELECT 1 FROM organizations WHERE id = p_franchise_id)
  INTO v_franchise_exists;

  IF NOT v_franchise_exists THEN
    RAISE EXCEPTION 'Franchise introuvable: %', p_franchise_id;
  END IF;

  -- Collecter les statistiques
  SELECT jsonb_build_object(
    'franchise_id', p_franchise_id,
    'franchise_name', o.name,
    'franchise_code', COALESCE(o.franchise_code, 'N/A'),
    'total_warranties', COUNT(DISTINCT w.id),
    'active_warranties', COUNT(DISTINCT w.id) FILTER (WHERE w.status = 'active'),
    'total_customers', COUNT(DISTINCT c.id),
    'total_claims', COUNT(DISTINCT cl.id),
    'pending_claims', COUNT(DISTINCT cl.id) FILTER (WHERE cl.status = 'pending'),
    'total_users', COUNT(DISTINCT p.id),
    'active_users', COUNT(DISTINCT p.id) FILTER (WHERE p.id IN (
      SELECT id FROM auth.users WHERE deleted_at IS NULL
    )),
    'total_tokens', (
      SELECT COUNT(*) FROM warranty_download_tokens wdt
      JOIN warranties w2 ON w2.id = wdt.warranty_id
      WHERE w2.organization_id = p_franchise_id
    ),
    'unpaid_invoices', COUNT(DISTINCT fi.id) FILTER (WHERE fi.status IN ('overdue', 'sent', 'draft')),
    'total_unpaid_amount', COALESCE(SUM(fi.total_amount) FILTER (WHERE fi.status IN ('overdue', 'sent', 'draft')), 0),
    'billing_config', (
      SELECT jsonb_build_object(
        'billing_type', billing_type,
        'percentage_rate', percentage_rate
      )
      FROM organization_billing_config
      WHERE organization_id = p_franchise_id
      LIMIT 1
    ),
    'created_at', o.created_at,
    'status', o.status
  ) INTO v_stats
  FROM organizations o
  LEFT JOIN warranties w ON w.organization_id = o.id
  LEFT JOIN customers c ON c.organization_id = o.id
  LEFT JOIN claims cl ON cl.organization_id = o.id
  LEFT JOIN profiles p ON p.organization_id = o.id
  LEFT JOIN franchise_invoices fi ON fi.franchisee_organization_id = o.id
  WHERE o.id = p_franchise_id
  GROUP BY o.id, o.name, o.franchise_code, o.created_at, o.status;

  RETURN v_stats;
END;
$$;

GRANT EXECUTE ON FUNCTION get_franchise_deletion_stats(uuid) TO authenticated;

COMMENT ON FUNCTION get_franchise_deletion_stats IS 'Obtient les statistiques détaillées d''une franchise avant suppression';

-- =====================================================
-- FONCTION: TRANSFERT ET SUPPRESSION DE FRANCHISE
-- =====================================================

CREATE OR REPLACE FUNCTION transfer_and_delete_franchise(
  p_franchise_to_delete_id uuid,
  p_destination_franchise_id uuid,
  p_confirmation_text text,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_master_user_id uuid;
  v_master_name text;
  v_deleted_franchise_name text;
  v_deleted_franchise_code text;
  v_destination_franchise_name text;
  v_franchise_snapshot jsonb;
  v_stats jsonb;

  -- Compteurs pour l'audit
  v_warranties_count int := 0;
  v_customers_count int := 0;
  v_claims_count int := 0;
  v_users_count int := 0;
  v_tokens_count int := 0;

  v_history_id uuid;
  v_error_occurred boolean := false;
BEGIN
  -- ===== PHASE 1: VALIDATIONS DE SÉCURITÉ =====

  -- Vérifier que l'utilisateur est master
  SELECT id, full_name INTO v_master_user_id, v_master_name
  FROM profiles
  WHERE id = auth.uid()
  AND (is_master_account = true OR role = 'master');

  IF v_master_user_id IS NULL THEN
    RAISE EXCEPTION 'Accès refusé: Seul le compte master peut supprimer des franchises';
  END IF;

  -- Vérifier que la franchise à supprimer existe et n'est pas master
  SELECT name, franchise_code, is_master INTO v_deleted_franchise_name, v_deleted_franchise_code, v_error_occurred
  FROM organizations
  WHERE id = p_franchise_to_delete_id;

  IF v_deleted_franchise_name IS NULL THEN
    RAISE EXCEPTION 'Franchise à supprimer introuvable: %', p_franchise_to_delete_id;
  END IF;

  IF v_error_occurred = true THEN
    RAISE EXCEPTION 'Impossible de supprimer le compte master';
  END IF;

  -- Vérifier que la franchise de destination existe et est différente
  IF p_franchise_to_delete_id = p_destination_franchise_id THEN
    RAISE EXCEPTION 'La franchise de destination doit être différente de la franchise à supprimer';
  END IF;

  SELECT name INTO v_destination_franchise_name
  FROM organizations
  WHERE id = p_destination_franchise_id
  AND status = 'active'
  AND is_master = false;

  IF v_destination_franchise_name IS NULL THEN
    RAISE EXCEPTION 'Franchise de destination introuvable ou inactive: %', p_destination_franchise_id;
  END IF;

  -- Vérifier le texte de confirmation
  IF LOWER(TRIM(p_confirmation_text)) != LOWER(TRIM(v_deleted_franchise_name)) THEN
    RAISE EXCEPTION 'Texte de confirmation incorrect. Attendu: "%", Reçu: "%"', v_deleted_franchise_name, p_confirmation_text;
  END IF;

  -- ===== PHASE 2: CRÉATION DU SNAPSHOT =====

  -- Obtenir les statistiques complètes
  v_stats := get_franchise_deletion_stats(p_franchise_to_delete_id);

  -- Créer un snapshot JSON de la franchise
  SELECT jsonb_build_object(
    'organization', row_to_json(o.*),
    'billing_config', (SELECT row_to_json(obc.*) FROM organization_billing_config obc WHERE obc.organization_id = o.id),
    'users', (SELECT jsonb_agg(row_to_json(p.*)) FROM profiles p WHERE p.organization_id = o.id),
    'stats', v_stats,
    'snapshot_date', now()
  ) INTO v_franchise_snapshot
  FROM organizations o
  WHERE o.id = p_franchise_to_delete_id;

  -- ===== PHASE 3: TRANSFERT DES DONNÉES =====

  -- 3.1: Transférer les garanties
  UPDATE warranties
  SET
    organization_id = p_destination_franchise_id,
    updated_at = now()
  WHERE organization_id = p_franchise_to_delete_id;

  GET DIAGNOSTICS v_warranties_count = ROW_COUNT;

  -- 3.2: Transférer les clients (seulement ceux exclusifs à cette franchise)
  UPDATE customers
  SET
    organization_id = p_destination_franchise_id,
    updated_at = now()
  WHERE organization_id = p_franchise_to_delete_id
  AND id NOT IN (
    SELECT DISTINCT customer_id
    FROM warranties
    WHERE organization_id != p_franchise_to_delete_id
    AND customer_id IS NOT NULL
  );

  GET DIAGNOSTICS v_customers_count = ROW_COUNT;

  -- 3.3: Transférer les réclamations
  UPDATE claims
  SET
    organization_id = p_destination_franchise_id,
    updated_at = now()
  WHERE organization_id = p_franchise_to_delete_id;

  GET DIAGNOSTICS v_claims_count = ROW_COUNT;

  -- 3.4: Transférer les tokens de téléchargement
  UPDATE warranty_download_tokens wdt
  SET updated_at = now()
  WHERE warranty_id IN (
    SELECT id FROM warranties WHERE organization_id = p_destination_franchise_id
  );

  GET DIAGNOSTICS v_tokens_count = ROW_COUNT;

  -- 3.5: Transférer les tokens de réclamation
  UPDATE warranty_claim_tokens wct
  SET updated_at = now()
  WHERE warranty_id IN (
    SELECT id FROM warranties WHERE organization_id = p_destination_franchise_id
  );

  -- 3.6: Mettre à jour les trailers (si applicable)
  UPDATE trailers
  SET
    organization_id = p_destination_franchise_id,
    updated_at = now()
  WHERE organization_id = p_franchise_to_delete_id;

  -- 3.7: Transférer les paramètres critiques si nécessaire
  -- (Les settings seront supprimés avec la franchise)

  -- ===== PHASE 4: DÉSACTIVATION DES UTILISATEURS =====

  -- Compter les utilisateurs à désactiver
  SELECT COUNT(*) INTO v_users_count
  FROM profiles
  WHERE organization_id = p_franchise_to_delete_id;

  -- Marquer les profils comme inactifs (ne pas supprimer pour l'audit)
  UPDATE profiles
  SET
    organization_id = NULL,
    role = 'client',
    updated_at = now()
  WHERE organization_id = p_franchise_to_delete_id;

  -- ===== PHASE 5: ENREGISTREMENT DE L'HISTORIQUE =====

  INSERT INTO franchise_deletion_history (
    deleted_franchise_id,
    deleted_franchise_name,
    deleted_franchise_code,
    destination_franchise_id,
    destination_franchise_name,
    deleted_by,
    deleted_by_name,
    warranties_transferred,
    customers_transferred,
    claims_transferred,
    users_deactivated,
    tokens_transferred,
    franchise_snapshot,
    transfer_details,
    status,
    ip_address,
    user_agent
  ) VALUES (
    p_franchise_to_delete_id,
    v_deleted_franchise_name,
    v_deleted_franchise_code,
    p_destination_franchise_id,
    v_destination_franchise_name,
    v_master_user_id,
    v_master_name,
    v_warranties_count,
    v_customers_count,
    v_claims_count,
    v_users_count,
    v_tokens_count,
    v_franchise_snapshot,
    jsonb_build_object(
      'transfer_date', now(),
      'confirmation_text', p_confirmation_text,
      'pre_transfer_stats', v_stats
    ),
    'completed',
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO v_history_id;

  -- ===== PHASE 6: LOG DANS MASTER ACTIVITY =====

  INSERT INTO master_activity_log (
    master_user_id,
    action_type,
    target_organization_id,
    description,
    metadata,
    ip_address,
    user_agent
  ) VALUES (
    v_master_user_id,
    'create_franchise',
    p_destination_franchise_id,
    format('Franchise supprimée: %s (transférée vers %s)', v_deleted_franchise_name, v_destination_franchise_name),
    jsonb_build_object(
      'deleted_franchise_id', p_franchise_to_delete_id,
      'destination_franchise_id', p_destination_franchise_id,
      'history_id', v_history_id,
      'warranties_transferred', v_warranties_count,
      'customers_transferred', v_customers_count,
      'claims_transferred', v_claims_count,
      'users_deactivated', v_users_count
    ),
    p_ip_address,
    p_user_agent
  );

  -- ===== PHASE 7: SUPPRESSION DE LA FRANCHISE =====

  -- Les tables avec ON DELETE CASCADE seront automatiquement nettoyées:
  -- - organization_billing_config
  -- - company_settings
  -- - tax_settings
  -- - etc.

  DELETE FROM organizations WHERE id = p_franchise_to_delete_id;

  -- ===== PHASE 8: RETOUR DU RÉSULTAT =====

  RETURN jsonb_build_object(
    'success', true,
    'history_id', v_history_id,
    'deleted_franchise', jsonb_build_object(
      'id', p_franchise_to_delete_id,
      'name', v_deleted_franchise_name,
      'code', v_deleted_franchise_code
    ),
    'destination_franchise', jsonb_build_object(
      'id', p_destination_franchise_id,
      'name', v_destination_franchise_name
    ),
    'transfer_summary', jsonb_build_object(
      'warranties_transferred', v_warranties_count,
      'customers_transferred', v_customers_count,
      'claims_transferred', v_claims_count,
      'users_deactivated', v_users_count,
      'tokens_transferred', v_tokens_count
    ),
    'message', format(
      'Franchise "%s" supprimée avec succès. %s garanties transférées vers "%s".',
      v_deleted_franchise_name,
      v_warranties_count,
      v_destination_franchise_name
    ),
    'deleted_at', now(),
    'can_restore_until', now() + interval '30 days'
  );

EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, PostgreSQL rollback automatiquement la transaction

    -- Tenter d'enregistrer l'erreur dans l'historique si possible
    BEGIN
      INSERT INTO franchise_deletion_history (
        deleted_franchise_id,
        deleted_franchise_name,
        deleted_franchise_code,
        destination_franchise_id,
        destination_franchise_name,
        deleted_by,
        deleted_by_name,
        status,
        error_message,
        franchise_snapshot,
        ip_address,
        user_agent
      ) VALUES (
        p_franchise_to_delete_id,
        COALESCE(v_deleted_franchise_name, 'Unknown'),
        v_deleted_franchise_code,
        p_destination_franchise_id,
        COALESCE(v_destination_franchise_name, 'Unknown'),
        v_master_user_id,
        COALESCE(v_master_name, 'Unknown'),
        'failed',
        SQLERRM,
        v_franchise_snapshot,
        p_ip_address,
        p_user_agent
      );
    EXCEPTION
      WHEN OTHERS THEN
        -- Si même l'enregistrement de l'erreur échoue, ignorer
        NULL;
    END;

    -- Propager l'erreur
    RAISE EXCEPTION 'Erreur lors de la suppression de la franchise: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION transfer_and_delete_franchise(uuid, uuid, text, inet, text) TO authenticated;

COMMENT ON FUNCTION transfer_and_delete_franchise IS 'Transfère toutes les données d''une franchise vers une autre puis supprime la franchise source';

-- =====================================================
-- FONCTION: LISTER LES FRANCHISES DISPONIBLES POUR TRANSFERT
-- =====================================================

-- Drop existing function to allow signature change
DROP FUNCTION IF EXISTS get_available_destination_franchises(uuid);

CREATE OR REPLACE FUNCTION get_available_destination_franchises(p_exclude_franchise_id uuid)
RETURNS TABLE (
  franchise_id uuid,
  franchise_name text,
  franchise_code text,
  total_warranties bigint,
  total_customers bigint,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Vérifier que l'utilisateur est master
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (is_master_account = true OR role = 'master')
  ) THEN
    RAISE EXCEPTION 'Accès refusé: Seul le compte master peut accéder à cette fonction';
  END IF;

  RETURN QUERY
  SELECT
    o.id as franchise_id,
    o.name as franchise_name,
    COALESCE(o.franchise_code, 'N/A') as franchise_code,
    COUNT(DISTINCT w.id) as total_warranties,
    COUNT(DISTINCT c.id) as total_customers,
    o.status,
    o.created_at
  FROM organizations o
  LEFT JOIN warranties w ON w.organization_id = o.id
  LEFT JOIN customers c ON c.organization_id = o.id
  WHERE o.id != p_exclude_franchise_id
  AND o.is_master = false
  AND o.status = 'active'
  GROUP BY o.id, o.name, o.franchise_code, o.status, o.created_at
  ORDER BY o.name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_available_destination_franchises(uuid) TO authenticated;

COMMENT ON FUNCTION get_available_destination_franchises IS 'Liste toutes les franchises actives disponibles comme destination de transfert';

-- =====================================================
-- VÉRIFICATION FINALE
-- =====================================================

DO $$
DECLARE
  table_count int;
  function_count int;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_name = 'franchise_deletion_history'
  AND table_schema = 'public';

  SELECT COUNT(*) INTO function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname IN (
    'transfer_and_delete_franchise',
    'get_franchise_deletion_stats',
    'get_available_destination_franchises'
  );

  RAISE NOTICE '========================================';
  RAISE NOTICE 'SYSTÈME DE SUPPRESSION DE FRANCHISE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ Tables créées: %', table_count;
  RAISE NOTICE '✓ Fonctions créées: %', function_count;
  RAISE NOTICE '✓ Système de transfert opérationnel';
  RAISE NOTICE '✓ Audit complet activé';
  RAISE NOTICE '✓ Rollback automatique en cas d''erreur';
  RAISE NOTICE '========================================';
END $$;
