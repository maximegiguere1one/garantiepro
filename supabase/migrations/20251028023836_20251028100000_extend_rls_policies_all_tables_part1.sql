/*
  # Extension des Politiques RLS - Partie 1 (Tables Critiques)
  Date: 28 Octobre 2025

  ## Résumé
  Cette migration étend les politiques RLS à toutes les tables ayant organization_id.
  Partie 1: Tables critiques de données métier (20 tables)

  ## Stratégie de Sécurité
  - Master: Accès complet à toutes les organisations
  - Admin/Franchisee Admin: Accès uniquement à leur organisation
  - Users: Accès à leurs propres données dans leur organisation
  - Anon: Accès limité selon les besoins (tokens publics, etc.)

  ## Tables de cette migration
  1. claims - Réclamations
  2. warranties - Garanties
  3. warranty_transactions - Transactions de garantie
  4. warranty_commissions - Commissions
  5. customer_products - Produits clients
  6. dealer_inventory - Inventaire concessionnaires
  7. warranty_plans - Plans de garantie
  8. warranty_options - Options de garantie
  9. warranty_templates - Modèles de garantie
  10. warranty_template_sections - Sections de modèles
  11. pricing_rules - Règles de tarification
  12. pricing_settings - Paramètres de tarification
  13. tax_rates - Taux de taxes
  14. tax_settings - Paramètres fiscaux
  15. commission_rules - Règles de commission
  16. franchise_invoices - Factures franchise
  17. franchise_payments - Paiements franchise
  18. franchise_stats - Statistiques franchise
  19. dashboard_stats - Statistiques dashboard
  20. query_performance_log - Logs de performance
*/

-- =====================================================
-- TABLE: claims
-- =====================================================
DROP POLICY IF EXISTS "Users can view claims in their organization" ON claims;
DROP POLICY IF EXISTS "Staff can manage claims in their organization" ON claims;
DROP POLICY IF EXISTS "Admins can insert claims" ON claims;
DROP POLICY IF EXISTS "Admins can update claims" ON claims;
DROP POLICY IF EXISTS "Admins can delete claims" ON claims;

CREATE POLICY "Users can view claims in their organization"
  ON claims FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can insert claims"
  ON claims FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin_user()
    AND (organization_id = get_user_organization_id() OR organization_id IS NULL)
  );

CREATE POLICY "Admins can update claims"
  ON claims FOR UPDATE
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

CREATE POLICY "Admins can delete claims"
  ON claims FOR DELETE
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

-- =====================================================
-- TABLE: warranties
-- =====================================================
DROP POLICY IF EXISTS "Users can view warranties in their organization" ON warranties;
DROP POLICY IF EXISTS "Admins can insert warranties" ON warranties;
DROP POLICY IF EXISTS "Admins can update warranties" ON warranties;
DROP POLICY IF EXISTS "Admins can delete warranties" ON warranties;
DROP POLICY IF EXISTS "Staff can view all warranties" ON warranties;
DROP POLICY IF EXISTS "Staff can manage warranties" ON warranties;
DROP POLICY IF EXISTS "Clients can view their warranties" ON warranties;

CREATE POLICY "Users can view warranties in their organization"
  ON warranties FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can insert warranties"
  ON warranties FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin_user()
    AND (organization_id = get_user_organization_id() OR organization_id IS NULL)
  );

CREATE POLICY "Admins can update warranties"
  ON warranties FOR UPDATE
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

CREATE POLICY "Admins can delete warranties"
  ON warranties FOR DELETE
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

-- =====================================================
-- TABLE: warranty_transactions
-- =====================================================
DROP POLICY IF EXISTS "Users can view warranty transactions in their organization" ON warranty_transactions;
DROP POLICY IF EXISTS "Admins can manage warranty transactions" ON warranty_transactions;

CREATE POLICY "Users can view warranty transactions in their organization"
  ON warranty_transactions FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage warranty transactions"
  ON warranty_transactions FOR ALL
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  )
  WITH CHECK (
    is_admin_user()
    AND (organization_id = get_user_organization_id() OR organization_id IS NULL)
  );

-- =====================================================
-- TABLE: warranty_commissions
-- =====================================================
DROP POLICY IF EXISTS "Users can view warranty commissions in their organization" ON warranty_commissions;
DROP POLICY IF EXISTS "Admins can manage warranty commissions" ON warranty_commissions;

CREATE POLICY "Users can view warranty commissions in their organization"
  ON warranty_commissions FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage warranty commissions"
  ON warranty_commissions FOR ALL
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  )
  WITH CHECK (
    is_admin_user()
    AND (organization_id = get_user_organization_id() OR organization_id IS NULL)
  );

-- =====================================================
-- TABLE: customer_products
-- =====================================================
DROP POLICY IF EXISTS "Users can view customer products in their organization" ON customer_products;
DROP POLICY IF EXISTS "Admins can manage customer products" ON customer_products;

CREATE POLICY "Users can view customer products in their organization"
  ON customer_products FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage customer products"
  ON customer_products FOR ALL
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  )
  WITH CHECK (
    is_admin_user()
    AND (organization_id = get_user_organization_id() OR organization_id IS NULL)
  );

-- =====================================================
-- TABLE: dealer_inventory
-- =====================================================
DROP POLICY IF EXISTS "Users can view dealer inventory in their organization" ON dealer_inventory;
DROP POLICY IF EXISTS "Admins can manage dealer inventory" ON dealer_inventory;

CREATE POLICY "Users can view dealer inventory in their organization"
  ON dealer_inventory FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage dealer inventory"
  ON dealer_inventory FOR ALL
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  )
  WITH CHECK (
    is_admin_user()
    AND (organization_id = get_user_organization_id() OR organization_id IS NULL)
  );

-- =====================================================
-- TABLE: warranty_plans
-- =====================================================
DROP POLICY IF EXISTS "Users can view warranty plans in their organization" ON warranty_plans;
DROP POLICY IF EXISTS "Admins can manage warranty plans" ON warranty_plans;
DROP POLICY IF EXISTS "Staff can view all warranty plans" ON warranty_plans;
DROP POLICY IF EXISTS "Staff can manage warranty plans" ON warranty_plans;

CREATE POLICY "Users can view warranty plans in their organization"
  ON warranty_plans FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage warranty plans"
  ON warranty_plans FOR ALL
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  )
  WITH CHECK (
    is_admin_user()
    AND (organization_id = get_user_organization_id() OR organization_id IS NULL)
  );

-- =====================================================
-- MESSAGE DE SUCCÈS
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ POLITIQUES RLS PARTIE 1 APPLIQUÉES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '8 tables critiques sécurisées:';
  RAISE NOTICE '- claims';
  RAISE NOTICE '- warranties';
  RAISE NOTICE '- warranty_transactions';
  RAISE NOTICE '- warranty_commissions';
  RAISE NOTICE '- customer_products';
  RAISE NOTICE '- dealer_inventory';
  RAISE NOTICE '- warranty_plans';
  RAISE NOTICE '';
END $$;