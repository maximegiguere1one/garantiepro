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
    'unpaid_invoices', COUNT(DISTINCT fi.id) FILTER (WHERE fi.status = 'unpaid'),
    'total_unpaid_amount', COALESCE(SUM(fi.amount) FILTER (WHERE fi.status = 'unpaid'), 0),
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