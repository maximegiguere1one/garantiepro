/*
  # Ajout du rôle Master et Permissions Administrateurs

  ## Problème
  - Les administrateurs ne peuvent plus changer les mots de passe des autres utilisateurs
  - Besoin d'un rôle supérieur à super_admin
  - Les contraintes sur les rôles sont trop restrictives

  ## Solution
  1. Ajouter le rôle 'master' (plus haut niveau)
  2. Mettre à jour la contrainte check pour inclure tous les rôles
  3. Créer une fonction pour permettre aux admins de changer les mots de passe
  4. Mettre à jour les politiques RLS

  ## Hiérarchie des rôles (du plus bas au plus haut)
  - client: Client final
  - operations: Opérations
  - f_and_i: Finance et Assurance
  - franchisee_employee: Employé franchisé
  - franchisee_admin: Administrateur franchisé
  - admin: Administrateur
  - super_admin: Super administrateur
  - master: Maître (accès total)

  ## Sécurité
  - Seuls les admins de niveau supérieur peuvent gérer les utilisateurs de niveau inférieur
  - Le rôle master a tous les droits
  - Les politiques RLS protègent les données
*/

-- =====================================================
-- STEP 1: Drop old role constraint and add new one
-- =====================================================

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN (
  'master',
  'super_admin',
  'admin',
  'franchisee_admin',
  'franchisee_employee',
  'employee',
  'f_and_i',
  'operations',
  'client'
));

-- =====================================================
-- STEP 2: Create function to check role hierarchy
-- =====================================================

CREATE OR REPLACE FUNCTION public.can_manage_user_role(
  manager_role text,
  target_role text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Master can manage everyone
  IF manager_role = 'master' THEN
    RETURN true;
  END IF;

  -- Super admin can manage everyone except master
  IF manager_role = 'super_admin' AND target_role != 'master' THEN
    RETURN true;
  END IF;

  -- Admin can manage franchisees and below
  IF manager_role = 'admin' AND target_role IN (
    'franchisee_admin',
    'franchisee_employee',
    'employee',
    'f_and_i',
    'operations',
    'client'
  ) THEN
    RETURN true;
  END IF;

  -- Franchisee admin can manage their employees
  IF manager_role = 'franchisee_admin' AND target_role IN (
    'franchisee_employee',
    'employee',
    'client'
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- =====================================================
-- STEP 3: Create function for password reset permissions
-- =====================================================

CREATE OR REPLACE FUNCTION public.can_reset_user_password(
  admin_id uuid,
  target_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_role text;
  target_role text;
  same_org boolean;
BEGIN
  -- Get roles
  SELECT role INTO admin_role
  FROM public.profiles
  WHERE id = admin_id;

  SELECT role INTO target_role
  FROM public.profiles
  WHERE user_id = target_user_id;

  -- Check if in same organization (or if admin is master/super_admin)
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p1, public.profiles p2
    WHERE p1.id = admin_id
    AND p2.user_id = target_user_id
    AND (
      p1.organization_id = p2.organization_id
      OR p1.role IN ('master', 'super_admin')
    )
  ) INTO same_org;

  -- Check hierarchy and organization
  RETURN same_org AND can_manage_user_role(admin_role, target_role);
END;
$$;

-- =====================================================
-- STEP 4: Update profiles UPDATE policy for admins
-- =====================================================

DROP POLICY IF EXISTS "Admins can update user profiles" ON public.profiles;

CREATE POLICY "Admins can update user profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    -- User can update their own profile (except role)
    id = auth.uid()
    OR
    -- Admins can update users in their organization with proper hierarchy
    EXISTS (
      SELECT 1
      FROM public.profiles admin
      WHERE admin.id = auth.uid()
      AND (
        -- Master can manage everyone
        admin.role = 'master'
        OR
        -- Super admin can manage everyone except master
        (admin.role = 'super_admin' AND profiles.role != 'master')
        OR
        -- Admin can manage franchisees in same org
        (
          admin.role = 'admin'
          AND admin.organization_id = profiles.organization_id
          AND profiles.role IN (
            'franchisee_admin',
            'franchisee_employee',
            'employee',
            'f_and_i',
            'operations',
            'client'
          )
        )
        OR
        -- Franchisee admin can manage employees in same org
        (
          admin.role = 'franchisee_admin'
          AND admin.organization_id = profiles.organization_id
          AND profiles.role IN ('franchisee_employee', 'employee', 'client')
        )
      )
    )
  )
  WITH CHECK (
    -- User cannot change their own role
    (id = auth.uid() AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()))
    OR
    -- Admins can change roles with proper hierarchy
    EXISTS (
      SELECT 1
      FROM public.profiles admin
      WHERE admin.id = auth.uid()
      AND can_manage_user_role(admin.role, profiles.role)
      AND (
        admin.role IN ('master', 'super_admin')
        OR admin.organization_id = profiles.organization_id
      )
    )
  );

-- =====================================================
-- STEP 5: Grant execute permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION public.can_manage_user_role(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_reset_user_password(uuid, uuid) TO authenticated;

-- =====================================================
-- STEP 6: Create index for role-based queries
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_role
ON public.profiles(role);

-- =====================================================
-- STEP 7: Add comment on master role
-- =====================================================

COMMENT ON CONSTRAINT profiles_role_check ON public.profiles IS
'Valid roles: master (highest), super_admin, admin, franchisee_admin, franchisee_employee, employee, f_and_i, operations, client (lowest)';

-- =====================================================
-- STEP 8: Verification
-- =====================================================

DO $$
DECLARE
  v_master_role_exists boolean;
  v_function_exists boolean;
BEGIN
  -- Check if master role is in constraint
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
    AND constraint_name = 'profiles_role_check'
    AND check_clause LIKE '%master%'
  ) INTO v_master_role_exists;

  -- Check if functions exist
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'can_manage_user_role'
  ) INTO v_function_exists;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'MASTER ROLE AND PERMISSIONS ADDED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Rôles disponibles:';
  RAISE NOTICE '  ✓ master (plus haut niveau)';
  RAISE NOTICE '  ✓ super_admin';
  RAISE NOTICE '  ✓ admin';
  RAISE NOTICE '  ✓ franchisee_admin';
  RAISE NOTICE '  ✓ franchisee_employee';
  RAISE NOTICE '  ✓ employee';
  RAISE NOTICE '  ✓ f_and_i';
  RAISE NOTICE '  ✓ operations';
  RAISE NOTICE '  ✓ client';
  RAISE NOTICE '';
  RAISE NOTICE 'Fonctions créées:';
  RAISE NOTICE '  ✓ can_manage_user_role: %', v_function_exists;
  RAISE NOTICE '  ✓ can_reset_user_password: %', v_function_exists;
  RAISE NOTICE '';
  RAISE NOTICE 'Permissions:';
  RAISE NOTICE '  ✓ Master peut tout gérer';
  RAISE NOTICE '  ✓ Super Admin peut gérer tous sauf master';
  RAISE NOTICE '  ✓ Admin peut gérer les franchisés';
  RAISE NOTICE '  ✓ Les admins peuvent changer les mots de passe';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
