/*
  # Correctif des fonctions de suppression de franchise
  
  ## Problèmes corrigés
  1. get_franchise_deletion_stats: Utilisation de fi.amount au lieu de fi.total_amount
  2. get_franchise_deletion_stats: Utilisation du statut 'unpaid' qui n'existe pas (devrait être 'overdue' ou 'sent')
  3. get_available_destination_franchises: Paramètre p_franchise_to_delete_id renommé en p_exclude_franchise_id pour correspondre aux appels frontend
  
  ## Tables affectées
  - Aucune modification de tables
  
  ## Fonctions modifiées
  - get_franchise_deletion_stats: Correction des références de colonnes et statuts
  - get_available_destination_franchises: Correction du nom de paramètre et signature de retour
*/

-- =====================================================
-- FONCTION CORRIGÉE: get_franchise_deletion_stats
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
    -- Correction: utiliser total_amount au lieu de amount, et statuts valides (overdue, sent, draft)
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

COMMENT ON FUNCTION get_franchise_deletion_stats IS 'Obtient les statistiques détaillées d''une franchise avant suppression (corrigé: utilise total_amount et statuts valides)';

-- =====================================================
-- FONCTION CORRIGÉE: get_available_destination_franchises
-- =====================================================

-- Supprimer l'ancienne fonction pour pouvoir changer la signature
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

COMMENT ON FUNCTION get_available_destination_franchises IS 'Liste toutes les franchises actives disponibles comme destination de transfert (corrigé: paramètre p_exclude_franchise_id)';

-- =====================================================
-- VÉRIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CORRECTIFS APPLIQUÉS AVEC SUCCÈS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ get_franchise_deletion_stats: Colonne fi.total_amount corrigée';
  RAISE NOTICE '✓ get_franchise_deletion_stats: Statuts valides (overdue, sent, draft)';
  RAISE NOTICE '✓ get_available_destination_franchises: Paramètre p_exclude_franchise_id corrigé';
  RAISE NOTICE '========================================';
END $$;
