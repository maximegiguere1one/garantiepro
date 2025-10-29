/*
  # Système de Rôle Employee - Gestion Unifiée des Employés

  ## Résumé
  Cette migration ajoute un système simplifié de gestion des employés avec un rôle
  "employee" unifié qui remplace la complexité des rôles multiples (dealer, f_and_i, operations).

  ## Changements Principaux

  ### 1. Nouveau Rôle Employee
  - Ajoute le rôle "employee" comme rôle standard pour tous les employés
  - Maintient les rôles existants pour compatibilité arrière
  - Simplifie la gestion des permissions

  ### 2. Fonctions Helper
  - `is_employee(role)`: Détermine si un rôle est un employé
  - `is_client(role)`: Détermine si un rôle est un client
  - `can_manage_employee(manager_role)`: Vérifie si peut gérer des employés
  - `get_user_category(role)`: Retourne la catégorie (admin/employee/client)

  ### 3. Hiérarchie Simplifiée
  - super_admin: Accès complet
  - admin: Gestion de l'organisation
  - employee: Employé avec accès complet aux opérations
  - dealer, f_and_i, operations: Rôles spécialisés (compatibilité)
  - client: Accès client limité

  ## Sécurité
  - Les RLS policies sont mises à jour pour supporter employee
  - La hiérarchie des permissions reste stricte
  - Validation au niveau base de données
*/

-- =====================================================
-- ÉTAPE 1: AJOUTER LE RÔLE EMPLOYEE À LA TABLE PROFILES
-- =====================================================

-- Supprimer l'ancienne contrainte
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
  END IF;
END $$;

-- Ajouter la nouvelle contrainte avec employee
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('super_admin', 'admin', 'employee', 'dealer', 'f_and_i', 'operations', 'client'));

-- =====================================================
-- ÉTAPE 2: METTRE À JOUR FRANCHISEE_INVITATIONS
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'franchisee_invitations') THEN
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'franchisee_invitations_role_check'
      AND conrelid = 'public.franchisee_invitations'::regclass
    ) THEN
      ALTER TABLE public.franchisee_invitations DROP CONSTRAINT franchisee_invitations_role_check;
    END IF;

    ALTER TABLE public.franchisee_invitations
    ADD CONSTRAINT franchisee_invitations_role_check
    CHECK (role IN ('super_admin', 'admin', 'employee', 'dealer', 'f_and_i', 'operations', 'client'));
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 3: FONCTIONS HELPER POUR CATÉGORISATION
-- =====================================================

-- Fonction: Vérifie si un rôle est un employé
CREATE OR REPLACE FUNCTION public.is_employee(p_role text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN p_role IN ('employee', 'dealer', 'f_and_i', 'operations');
END;
$$;

-- Fonction: Vérifie si un rôle est un client
CREATE OR REPLACE FUNCTION public.is_client(p_role text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN p_role = 'client';
END;
$$;

-- Fonction: Vérifie si un rôle est un administrateur
CREATE OR REPLACE FUNCTION public.is_admin(p_role text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN p_role IN ('super_admin', 'admin');
END;
$$;

-- Fonction: Retourne la catégorie d'un utilisateur
CREATE OR REPLACE FUNCTION public.get_user_category(p_role text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE
    WHEN p_role = 'super_admin' THEN 'super_admin'
    WHEN p_role = 'admin' THEN 'admin'
    WHEN public.is_employee(p_role) THEN 'employee'
    WHEN public.is_client(p_role) THEN 'client'
    ELSE 'unknown'
  END;
END;
$$;

-- =====================================================
-- ÉTAPE 4: HIÉRARCHIE DE PERMISSIONS SIMPLIFIÉE
-- =====================================================

-- Remplacer la fonction can_manage_role avec logique simplifiée
CREATE OR REPLACE FUNCTION public.can_manage_role(
  p_manager_role text,
  p_target_role text
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Super admin peut tout gérer
  IF p_manager_role = 'super_admin' THEN
    RETURN true;
  END IF;

  -- Admin peut gérer tous les rôles sauf super_admin
  IF p_manager_role = 'admin' THEN
    RETURN p_target_role != 'super_admin';
  END IF;

  -- Employés peuvent gérer uniquement les clients
  IF public.is_employee(p_manager_role) THEN
    RETURN public.is_client(p_target_role);
  END IF;

  -- Par défaut, refuser
  RETURN false;
END;
$$;

-- Fonction: Vérifie si un utilisateur peut inviter des employés
CREATE OR REPLACE FUNCTION public.can_invite_employee(p_manager_role text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN p_manager_role IN ('super_admin', 'admin');
END;
$$;

-- =====================================================
-- ÉTAPE 5: FONCTION GET_ROLE_LEVEL MISE À JOUR
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_role_level(p_role text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE p_role
    WHEN 'super_admin' THEN 10
    WHEN 'admin' THEN 8
    WHEN 'employee' THEN 5
    WHEN 'dealer' THEN 4
    WHEN 'f_and_i' THEN 4
    WHEN 'operations' THEN 4
    WHEN 'client' THEN 1
    ELSE 0
  END;
END;
$$;

-- =====================================================
-- ÉTAPE 6: FONCTION POUR OBTENIR LES PERMISSIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_role_permissions(p_role text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE
    WHEN p_role = 'super_admin' THEN jsonb_build_object(
      'can_manage_users', true,
      'can_manage_organizations', true,
      'can_manage_warranties', true,
      'can_manage_claims', true,
      'can_manage_settings', true,
      'can_manage_billing', true,
      'can_invite_admins', true,
      'can_invite_employees', true,
      'can_delete_users', true,
      'full_access', true
    )
    WHEN p_role = 'admin' THEN jsonb_build_object(
      'can_manage_users', true,
      'can_manage_organizations', true,
      'can_manage_warranties', true,
      'can_manage_claims', true,
      'can_manage_settings', true,
      'can_manage_billing', true,
      'can_invite_admins', false,
      'can_invite_employees', true,
      'can_delete_users', true,
      'full_access', false
    )
    WHEN p_role = 'employee' THEN jsonb_build_object(
      'can_manage_users', false,
      'can_manage_organizations', false,
      'can_manage_warranties', true,
      'can_manage_claims', true,
      'can_manage_settings', false,
      'can_manage_billing', false,
      'can_invite_admins', false,
      'can_invite_employees', false,
      'can_delete_users', false,
      'full_access', false
    )
    WHEN public.is_employee(p_role) THEN jsonb_build_object(
      'can_manage_users', false,
      'can_manage_organizations', false,
      'can_manage_warranties', true,
      'can_manage_claims', true,
      'can_manage_settings', false,
      'can_manage_billing', false,
      'can_invite_admins', false,
      'can_invite_employees', false,
      'can_delete_users', false,
      'full_access', false
    )
    WHEN public.is_client(p_role) THEN jsonb_build_object(
      'can_manage_users', false,
      'can_manage_organizations', false,
      'can_manage_warranties', false,
      'can_manage_claims', false,
      'can_manage_settings', false,
      'can_manage_billing', false,
      'can_invite_admins', false,
      'can_invite_employees', false,
      'can_delete_users', false,
      'full_access', false
    )
    ELSE jsonb_build_object('full_access', false)
  END;
END;
$$;

-- =====================================================
-- ÉTAPE 7: MISE À JOUR DES STATISTIQUES UTILISATEURS
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_users_statistics()
RETURNS TABLE (
  total_users bigint,
  super_admin_count bigint,
  admin_count bigint,
  employee_count bigint,
  dealer_count bigint,
  f_and_i_count bigint,
  operations_count bigint,
  client_count bigint,
  active_invitations bigint,
  pending_invitations bigint,
  expired_invitations bigint,
  total_employees bigint,
  total_staff bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_active_invitations bigint := 0;
  v_pending_invitations bigint := 0;
  v_expired_invitations bigint := 0;
BEGIN
  -- Statistiques sur les invitations si la table existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'franchisee_invitations') THEN
    SELECT COUNT(*) INTO v_active_invitations FROM public.franchisee_invitations WHERE status IN ('sent', 'pending');
    SELECT COUNT(*) INTO v_pending_invitations FROM public.franchisee_invitations WHERE status = 'pending';
    SELECT COUNT(*) INTO v_expired_invitations FROM public.franchisee_invitations WHERE status = 'expired';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.profiles)::bigint as total_users,
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'super_admin')::bigint as super_admin_count,
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin')::bigint as admin_count,
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'employee')::bigint as employee_count,
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'dealer')::bigint as dealer_count,
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'f_and_i')::bigint as f_and_i_count,
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'operations')::bigint as operations_count,
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'client')::bigint as client_count,
    v_active_invitations,
    v_pending_invitations,
    v_expired_invitations,
    (SELECT COUNT(*) FROM public.profiles WHERE public.is_employee(role))::bigint as total_employees,
    (SELECT COUNT(*) FROM public.profiles WHERE role IN ('super_admin', 'admin') OR public.is_employee(role))::bigint as total_staff;
END;
$$;

-- =====================================================
-- ÉTAPE 8: MISE À JOUR DES RLS POLICIES
-- =====================================================

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can view profiles in organization" ON public.profiles;
DROP POLICY IF EXISTS "Users can update profiles based on role" ON public.profiles;

-- Policy de lecture: Employés peuvent voir les profils de leur organisation
CREATE POLICY "Users can view profiles in organization"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    -- Les utilisateurs peuvent voir leur propre profil
    id = auth.uid()
    OR
    -- Les admins et super_admins peuvent voir tous les profils de leur organisation
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND public.is_admin(p.role)
      AND (
        p.organization_id = profiles.organization_id
        OR p.role = 'super_admin'
      )
    )
    OR
    -- Les employés peuvent voir les profils de leur organisation
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND public.is_employee(p.role)
      AND p.organization_id = profiles.organization_id
    )
  );

-- Policy de mise à jour: Gestion des profils selon le rôle
CREATE POLICY "Users can update profiles based on role"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    -- Les utilisateurs peuvent mettre à jour leur propre nom et infos de base
    (id = auth.uid())
    OR
    -- Les admins peuvent mettre à jour les profils de leur organisation (sauf super_admin)
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.organization_id = profiles.organization_id
      AND profiles.role != 'super_admin'
    )
    OR
    -- Les super_admins peuvent tout mettre à jour
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'super_admin'
    )
  )
  WITH CHECK (
    -- Vérifier que le changement de rôle est autorisé
    (role = (SELECT role FROM public.profiles WHERE id = profiles.id))
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND public.can_manage_role(p.role, profiles.role)
    )
  );

-- =====================================================
-- ÉTAPE 9: PERMISSIONS SUR LES FONCTIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.is_employee(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_client(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_category(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_invite_employee(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_role_permissions(text) TO authenticated;

-- =====================================================
-- ÉTAPE 10: INDICES DE PERFORMANCE
-- =====================================================

-- Index pour recherche par catégorie d'utilisateur
CREATE INDEX IF NOT EXISTS idx_profiles_employee_users
  ON public.profiles(organization_id)
  WHERE public.is_employee(role);

CREATE INDEX IF NOT EXISTS idx_profiles_client_users
  ON public.profiles(organization_id)
  WHERE role = 'client';

-- =====================================================
-- ÉTAPE 11: COMMENTAIRES
-- =====================================================

COMMENT ON FUNCTION public.is_employee IS 'Vérifie si un rôle représente un employé (employee, dealer, f_and_i, operations)';
COMMENT ON FUNCTION public.is_client IS 'Vérifie si un rôle représente un client';
COMMENT ON FUNCTION public.is_admin IS 'Vérifie si un rôle représente un administrateur';
COMMENT ON FUNCTION public.get_user_category IS 'Retourne la catégorie d''un utilisateur: super_admin, admin, employee, ou client';
COMMENT ON FUNCTION public.can_invite_employee IS 'Vérifie si un utilisateur peut inviter des employés';
COMMENT ON FUNCTION public.get_role_permissions IS 'Retourne un objet JSON avec toutes les permissions d''un rôle';
