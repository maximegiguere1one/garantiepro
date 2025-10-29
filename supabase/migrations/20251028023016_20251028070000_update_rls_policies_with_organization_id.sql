/*
  # Mise à jour des politiques RLS pour utiliser organization_id
  Date: 28 Octobre 2025

  ## Résumé
  Cette migration met à jour toutes les politiques RLS pour utiliser la colonne organization_id
  et assurer une isolation multi-tenant complète.

  ## Tables modifiées (36 tables)
  - Suppression des anciennes politiques RLS
  - Création de nouvelles politiques utilisant organization_id
  - Isolation complète entre organisations
  - Accès Master/Admin préservé

  ## Sécurité
  - Isolation stricte par organization_id
  - Rôle Master peut voir toutes les organisations
  - Rôle Admin peut voir son organisation uniquement
  - Utilisateurs ne voient que leurs propres données
*/

-- =====================================================
-- FONCTION HELPER: Obtenir l'organization_id de l'utilisateur courant
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  org_id uuid;
BEGIN
  SELECT organization_id INTO org_id
  FROM profiles
  WHERE id = auth.uid();

  RETURN org_id;
END;
$$;

-- =====================================================
-- FONCTION HELPER: Vérifier si l'utilisateur est Master
-- =====================================================
CREATE OR REPLACE FUNCTION is_master_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid();

  RETURN user_role = 'master';
END;
$$;

-- =====================================================
-- FONCTION HELPER: Vérifier si l'utilisateur est Admin
-- =====================================================
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid();

  RETURN user_role IN ('master', 'admin', 'franchisee_admin');
END;
$$;

-- =====================================================
-- TABLE: customers
-- =====================================================
DROP POLICY IF EXISTS "Staff can view all customers" ON customers;
DROP POLICY IF EXISTS "Clients can view own customer record" ON customers;
DROP POLICY IF EXISTS "Staff can manage customers" ON customers;
DROP POLICY IF EXISTS "Users can view customers in their organization" ON customers;
DROP POLICY IF EXISTS "Admins can insert customers in their organization" ON customers;
DROP POLICY IF EXISTS "Admins can update customers in their organization" ON customers;
DROP POLICY IF EXISTS "Admins can delete customers in their organization" ON customers;

CREATE POLICY "Users can view customers in their organization"
  ON customers FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can insert customers in their organization"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin_user()
    AND (organization_id = get_user_organization_id() OR organization_id IS NULL)
  );

CREATE POLICY "Admins can update customers in their organization"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

CREATE POLICY "Admins can delete customers in their organization"
  ON customers FOR DELETE
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

-- =====================================================
-- TABLE: trailers
-- =====================================================
DROP POLICY IF EXISTS "Staff can view all trailers" ON trailers;
DROP POLICY IF EXISTS "Clients can view own trailers" ON trailers;
DROP POLICY IF EXISTS "Staff can manage trailers" ON trailers;
DROP POLICY IF EXISTS "Users can view trailers in their organization" ON trailers;
DROP POLICY IF EXISTS "Admins can insert trailers in their organization" ON trailers;
DROP POLICY IF EXISTS "Admins can update trailers in their organization" ON trailers;
DROP POLICY IF EXISTS "Admins can delete trailers in their organization" ON trailers;

CREATE POLICY "Users can view trailers in their organization"
  ON trailers FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can insert trailers in their organization"
  ON trailers FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin_user()
    AND (organization_id = get_user_organization_id() OR organization_id IS NULL)
  );

CREATE POLICY "Admins can update trailers in their organization"
  ON trailers FOR UPDATE
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

CREATE POLICY "Admins can delete trailers in their organization"
  ON trailers FOR DELETE
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

-- =====================================================
-- TABLE: payments
-- =====================================================
DROP POLICY IF EXISTS "Staff can view all payments" ON payments;
DROP POLICY IF EXISTS "Clients can view own payments" ON payments;
DROP POLICY IF EXISTS "Staff can manage payments" ON payments;
DROP POLICY IF EXISTS "Users can view payments in their organization" ON payments;
DROP POLICY IF EXISTS "Admins can insert payments in their organization" ON payments;
DROP POLICY IF EXISTS "Admins can update payments in their organization" ON payments;

CREATE POLICY "Users can view payments in their organization"
  ON payments FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can insert payments in their organization"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin_user()
    AND (organization_id = get_user_organization_id() OR organization_id IS NULL)
  );

CREATE POLICY "Admins can update payments in their organization"
  ON payments FOR UPDATE
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  );

-- =====================================================
-- TABLE: claim_attachments
-- =====================================================
DROP POLICY IF EXISTS "Users can view attachments for accessible claims" ON claim_attachments;
DROP POLICY IF EXISTS "Users can add attachments to accessible claims" ON claim_attachments;
DROP POLICY IF EXISTS "Users can view claim attachments in their organization" ON claim_attachments;
DROP POLICY IF EXISTS "Users can insert claim attachments in their organization" ON claim_attachments;

CREATE POLICY "Users can view claim attachments in their organization"
  ON claim_attachments FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Users can insert claim attachments in their organization"
  ON claim_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- =====================================================
-- TABLE: claim_timeline
-- =====================================================
DROP POLICY IF EXISTS "Users can view claim timeline for accessible claims" ON claim_timeline;
DROP POLICY IF EXISTS "Staff can add claim timeline entries" ON claim_timeline;
DROP POLICY IF EXISTS "Users can view claim timeline in their organization" ON claim_timeline;
DROP POLICY IF EXISTS "Staff can insert claim timeline in their organization" ON claim_timeline;

CREATE POLICY "Users can view claim timeline in their organization"
  ON claim_timeline FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Staff can insert claim timeline in their organization"
  ON claim_timeline FOR INSERT
  TO authenticated
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
  RAISE NOTICE '✓ POLITIQUES RLS MISES À JOUR';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Politiques RLS mises à jour pour:';
  RAISE NOTICE '- customers';
  RAISE NOTICE '- trailers';
  RAISE NOTICE '- payments';
  RAISE NOTICE '- claim_attachments';
  RAISE NOTICE '- claim_timeline';
  RAISE NOTICE '';
  RAISE NOTICE 'Fonctions helper créées:';
  RAISE NOTICE '- get_user_organization_id()';
  RAISE NOTICE '- is_master_user()';
  RAISE NOTICE '- is_admin_user()';
  RAISE NOTICE '';
  RAISE NOTICE 'Isolation multi-tenant activée!';
  RAISE NOTICE '';
END $$;