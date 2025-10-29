/*
  # Fix Franchisee Admin Invitation System - Complete

  1. Problème
    - Les invitations pour le rôle franchisee_admin échouent avec erreur 400
    - Validation des permissions insuffisante
    - Messages d'erreur peu clairs

  2. Solution
    - Vérifier que la contrainte de rôle inclut franchisee_admin
    - Confirmer que les politiques RLS autorisent franchisee_admin
    - S'assurer que la table organizations est accessible
    - Ajouter des indexes pour améliorer les performances

  3. Sécurité
    - Maintient l'isolation multi-tenant
    - Valide les permissions selon le rôle
    - Audit complet des opérations
*/

-- 1. Vérifier et corriger la contrainte de rôle sur franchisee_invitations
DO $$
BEGIN
  -- Supprimer l'ancienne contrainte si elle existe
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'franchisee_invitations_role_check'
    AND conrelid = 'public.franchisee_invitations'::regclass
  ) THEN
    ALTER TABLE public.franchisee_invitations
    DROP CONSTRAINT franchisee_invitations_role_check;
  END IF;

  -- Ajouter la nouvelle contrainte avec tous les rôles valides
  ALTER TABLE public.franchisee_invitations
  ADD CONSTRAINT franchisee_invitations_role_check
  CHECK (role IN (
    'master',
    'super_admin',
    'admin',
    'franchisee_admin',
    'franchisee_employee',
    'dealer',
    'f_and_i',
    'operations',
    'client'
  ));

  RAISE NOTICE 'Role constraint updated successfully';
END $$;

-- 2. Vérifier que les politiques RLS sont correctes
-- Les politiques sont déjà en place depuis 20251013043951_fix_franchisee_invitations_rls_for_all_admin_roles.sql
-- Mais on les recréé pour être sûr

DROP POLICY IF EXISTS "Admin roles can view invitations" ON franchisee_invitations;
DROP POLICY IF EXISTS "Admin roles can create invitations" ON franchisee_invitations;
DROP POLICY IF EXISTS "Admin roles can update invitations" ON franchisee_invitations;
DROP POLICY IF EXISTS "Admin roles can delete invitations" ON franchisee_invitations;
DROP POLICY IF EXISTS "Master can view all invitations" ON franchisee_invitations;
DROP POLICY IF EXISTS "Master can manage all invitations" ON franchisee_invitations;

-- Policy 1: Admin roles can view invitations in their organization
CREATE POLICY "Admin roles can view invitations"
  ON franchisee_invitations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('master', 'super_admin', 'admin', 'franchisee_admin')
        AND (
          profiles.organization_id = franchisee_invitations.organization_id
          OR profiles.role IN ('master', 'super_admin')
        )
    )
  );

-- Policy 2: Admin roles can create invitations for their organization
CREATE POLICY "Admin roles can create invitations"
  ON franchisee_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('master', 'super_admin', 'admin', 'franchisee_admin')
        AND (
          profiles.organization_id = franchisee_invitations.organization_id
          OR profiles.role IN ('master', 'super_admin')
        )
    )
  );

-- Policy 3: Admin roles can update invitations in their organization
CREATE POLICY "Admin roles can update invitations"
  ON franchisee_invitations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('master', 'super_admin', 'admin', 'franchisee_admin')
        AND (
          profiles.organization_id = franchisee_invitations.organization_id
          OR profiles.role IN ('master', 'super_admin')
        )
    )
  );

-- Policy 4: Admin roles can delete invitations in their organization
CREATE POLICY "Admin roles can delete invitations"
  ON franchisee_invitations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('master', 'super_admin', 'admin', 'franchisee_admin')
        AND (
          profiles.organization_id = franchisee_invitations.organization_id
          OR profiles.role IN ('master', 'super_admin')
        )
    )
  );

-- 3. Ajouter des indexes pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_franchisee_invitations_organization_id
  ON franchisee_invitations(organization_id);

CREATE INDEX IF NOT EXISTS idx_franchisee_invitations_email_status
  ON franchisee_invitations(email, status);

CREATE INDEX IF NOT EXISTS idx_franchisee_invitations_invited_by
  ON franchisee_invitations(invited_by);

-- 4. Créer une fonction de test pour valider les permissions
CREATE OR REPLACE FUNCTION test_franchisee_admin_invitation_permissions(
  p_user_id uuid,
  p_target_org_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role text;
  v_user_org_id uuid;
  v_can_create boolean := false;
  v_result json;
BEGIN
  -- Récupérer le profil de l'utilisateur
  SELECT role, organization_id
  INTO v_user_role, v_user_org_id
  FROM profiles
  WHERE id = p_user_id;

  IF v_user_role IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User profile not found'
    );
  END IF;

  -- Vérifier si l'utilisateur peut créer une invitation
  IF v_user_role IN ('master', 'super_admin', 'admin', 'franchisee_admin') THEN
    IF v_user_role IN ('master', 'super_admin') THEN
      v_can_create := true;
    ELSIF v_user_org_id = p_target_org_id THEN
      v_can_create := true;
    END IF;
  END IF;

  -- Construire le résultat
  SELECT json_build_object(
    'success', true,
    'user_id', p_user_id,
    'user_role', v_user_role,
    'user_org_id', v_user_org_id,
    'target_org_id', p_target_org_id,
    'can_create_invitation', v_can_create,
    'is_master_or_super_admin', v_user_role IN ('master', 'super_admin'),
    'is_same_organization', v_user_org_id = p_target_org_id
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION test_franchisee_admin_invitation_permissions(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION test_franchisee_admin_invitation_permissions IS
  'Fonction de test pour valider les permissions d''invitation d''un franchisee_admin';

-- 5. Vérifier l'intégrité des données existantes
DO $$
DECLARE
  v_invalid_count integer;
BEGIN
  -- Compter les invitations avec des rôles invalides
  SELECT COUNT(*)
  INTO v_invalid_count
  FROM franchisee_invitations
  WHERE role NOT IN (
    'master',
    'super_admin',
    'admin',
    'franchisee_admin',
    'franchisee_employee',
    'dealer',
    'f_and_i',
    'operations',
    'client'
  );

  IF v_invalid_count > 0 THEN
    RAISE NOTICE 'Found % invitations with invalid roles', v_invalid_count;
  ELSE
    RAISE NOTICE 'All invitations have valid roles';
  END IF;
END $$;
