/*
  # Correction de l'isolation des garanties par franchisé

  1. Problème identifié
    - Les politiques RLS actuelles permettent aux propriétaires (owner) de voir toutes les garanties
    - Les franchisés peuvent potentiellement voir les garanties d'autres franchises
    - La condition `OR is_owner()` bypasse la vérification d'organisation

  2. Changements appliqués
    - Suppression des anciennes politiques trop permissives
    - Création de nouvelles politiques strictes basées sur organization_id
    - Les franchisés ne voient QUE les garanties de leur organisation
    - Les propriétaires (master) voient toutes les garanties de leurs franchisés
    - Ajout d'une fonction helper pour vérifier si un utilisateur est master

  3. Sécurité
    - Chaque franchisé est strictement isolé
    - Les clients voient uniquement leurs propres garanties
    - Les administrateurs master peuvent gérer toutes les organisations
*/

-- Drop existing policies on warranties
DROP POLICY IF EXISTS "Users can view own org warranties" ON warranties;
DROP POLICY IF EXISTS "Staff can manage own org warranties" ON warranties;
DROP POLICY IF EXISTS "Clients can view own warranties" ON warranties;

-- Create helper function to check if user is master admin
CREATE OR REPLACE FUNCTION is_master_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    INNER JOIN organizations o ON p.organization_id = o.id
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'master')
      AND (o.is_master = true OR o.type = 'owner')
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create helper function to check if user belongs to an organization or its parent
CREATE OR REPLACE FUNCTION user_can_access_organization(target_org_id uuid)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    INNER JOIN organizations o ON p.organization_id = o.id
    WHERE p.id = auth.uid()
      AND (
        -- User belongs to the target organization
        p.organization_id = target_org_id
        -- OR user is master admin and target org is a franchisee of their master org
        OR (
          (o.is_master = true OR o.type = 'owner')
          AND p.role IN ('admin', 'master')
          AND EXISTS (
            SELECT 1 
            FROM organizations franchisee
            WHERE franchisee.id = target_org_id
              AND (
                franchisee.owner_organization_id = o.id
                OR franchisee.parent_organization_id = o.id
              )
          )
        )
      )
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Policy 1: Clients can view their own warranties
CREATE POLICY "Clients view own warranties"
  ON warranties
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM customers c
      WHERE c.id = warranties.customer_id
        AND c.user_id = auth.uid()
    )
  );

-- Policy 2: Franchisees can view warranties from their organization only
CREATE POLICY "Franchisees view own org warranties"
  ON warranties
  FOR SELECT
  TO authenticated
  USING (
    user_can_access_organization(warranties.organization_id)
  );

-- Policy 3: Franchisees can insert warranties for their organization only
CREATE POLICY "Franchisees insert own org warranties"
  ON warranties
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
  );

-- Policy 4: Franchisees can update warranties from their organization only
CREATE POLICY "Franchisees update own org warranties"
  ON warranties
  FOR UPDATE
  TO authenticated
  USING (
    user_can_access_organization(warranties.organization_id)
  )
  WITH CHECK (
    user_can_access_organization(warranties.organization_id)
  );

-- Policy 5: Only admins can delete warranties from their organization
CREATE POLICY "Admins delete own org warranties"
  ON warranties
  FOR DELETE
  TO authenticated
  USING (
    user_can_access_organization(warranties.organization_id)
    AND EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'master')
    )
  );

-- Add comment explaining the security model
COMMENT ON TABLE warranties IS 'Warranties are strictly isolated by organization_id. Franchisees can only access warranties from their own organization. Master admins can access warranties from all their franchisees.';
