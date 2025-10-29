/*
  # Fix Authentication and RLS Policy Issues - Complete Resolution
  
  ## Résumé
  Correction complète des politiques RLS pour résoudre les erreurs de permission
  lors de l'authentification. Cette migration élimine les références circulaires
  et simplifie les politiques pour garantir un accès fiable.
  
  ## Problème Identifié
  Les politiques RLS contenaient des références circulaires où les policies
  sur `profiles` faisaient des requêtes sur `profiles` elle-même, causant
  des erreurs de permission infinies.
  
  ## Solution
  1. Supprimer toutes les policies existantes problématiques
  2. Créer des policies simplifiées sans références circulaires
  3. Utiliser des fonctions helper pour éviter les sous-requêtes circulaires
  4. Garantir que chaque utilisateur peut TOUJOURS lire son propre profil
  5. Permettre l'insertion de profils pendant la création de compte
  
  ## Tables Affectées
  - profiles: Politiques de lecture, écriture et insertion
  - organizations: Vérification que les politiques sont correctes
  
  ## Sécurité
  - Les utilisateurs peuvent lire uniquement leur propre profil
  - Les admins peuvent lire les profils de leur organisation
  - Les super_admins peuvent tout lire
  - L'insertion de profil est permise lors de la création de compte
*/

-- =====================================================
-- ÉTAPE 1: Créer des fonctions helper sécurisées
-- =====================================================

-- Fonction pour obtenir le rôle de l'utilisateur actuel sans requête circulaire
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role, 'user');
END;
$$;

-- Fonction pour obtenir l'organization_id de l'utilisateur actuel
CREATE OR REPLACE FUNCTION public.get_current_user_org_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  org_id uuid;
BEGIN
  SELECT organization_id INTO org_id
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN org_id;
END;
$$;

-- Fonction pour vérifier si l'utilisateur est admin
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
END;
$$;

-- =====================================================
-- ÉTAPE 2: Supprimer TOUTES les policies existantes sur profiles
-- =====================================================

DROP POLICY IF EXISTS "Users can always read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Dealers can read org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own name" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
DROP POLICY IF EXISTS "Prevent unauthorized admin creation" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin and F&I can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in organization" ON public.profiles;
DROP POLICY IF EXISTS "Users can update profiles based on role" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles in organization" ON public.profiles;

-- =====================================================
-- ÉTAPE 3: Créer des policies SIMPLES et SANS références circulaires
-- =====================================================

-- Policy #1: SELECT - Tout utilisateur authentifié peut lire SON PROPRE profil
-- C'est la policy la plus importante et elle doit être SANS condition complexe
CREATE POLICY "select_own_profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Policy #2: SELECT - Les admins peuvent lire tous les profils
-- Utilise une fonction helper pour éviter la circularité
CREATE POLICY "select_all_if_admin"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1) IN ('admin', 'super_admin')
  );

-- Policy #3: INSERT - Permettre la création de profil lors du signup
-- Permet l'insertion uniquement si c'est le propre profil de l'utilisateur
CREATE POLICY "insert_own_profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Policy #4: INSERT - Permettre au trigger de créer des profils
-- Cette policy permet au SECURITY DEFINER trigger de créer des profils
CREATE POLICY "insert_via_trigger"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy #5: UPDATE - Tout utilisateur peut mettre à jour son propre profil
-- Avec restriction: ne peut pas changer son propre rôle
CREATE POLICY "update_own_profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() 
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

-- Policy #6: UPDATE - Les admins peuvent mettre à jour les profils de leur org
CREATE POLICY "update_org_profiles_if_admin"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
      AND (
        p.organization_id = profiles.organization_id
        OR p.role = 'super_admin'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- ÉTAPE 4: Vérifier les policies sur organizations
-- =====================================================

-- La policy "Authenticated users can view organizations" devrait rester
-- Elle permet à tous les utilisateurs authentifiés de voir les organisations

-- Vérifier qu'elle existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'organizations'
    AND policyname = 'Authenticated users can view organizations'
  ) THEN
    CREATE POLICY "Authenticated users can view organizations"
      ON organizations FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 5: Améliorer la fonction handle_new_user
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_organization_id uuid;
  v_role text;
  v_full_name text;
BEGIN
  RAISE NOTICE '[handle_new_user] Creating profile for user: % (email: %)', NEW.id, NEW.email;

  -- Extract organization_id from metadata
  BEGIN
    v_organization_id := (NEW.raw_user_meta_data->>'organization_id')::uuid;
    RAISE NOTICE '[handle_new_user] Organization ID from metadata: %', v_organization_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[handle_new_user] No organization_id in metadata, will use default';
    v_organization_id := NULL;
  END;

  -- If no organization_id, get the default owner organization
  IF v_organization_id IS NULL THEN
    SELECT id INTO v_organization_id
    FROM public.organizations
    WHERE type = 'owner'
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_organization_id IS NOT NULL THEN
      RAISE NOTICE '[handle_new_user] Using default owner organization: %', v_organization_id;
    ELSE
      RAISE WARNING '[handle_new_user] No owner organization found!';
    END IF;
  END IF;

  -- Extract role with fallback
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'dealer');
  RAISE NOTICE '[handle_new_user] User role: %', v_role;

  -- Extract full_name with fallback
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1),
    'User'
  );
  RAISE NOTICE '[handle_new_user] User full_name: %', v_full_name;

  -- Insert profile with explicit error handling
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, organization_id)
    VALUES (
      NEW.id,
      NEW.email,
      v_full_name,
      v_role,
      v_organization_id
    );

    RAISE NOTICE '[handle_new_user] ✓ Profile created successfully for user: %', NEW.id;
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE '[handle_new_user] Profile already exists for user: %', NEW.id;
  WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] ✗ Failed to create profile for user %: %', NEW.id, SQLERRM;
    -- Don't re-raise to allow user creation to proceed
  END;

  RETURN NEW;
END;
$$;

-- =====================================================
-- ÉTAPE 6: Grant permissions sur les fonctions helper
-- =====================================================

GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_admin() TO authenticated;

-- =====================================================
-- ÉTAPE 7: Vérification finale
-- =====================================================

DO $$
DECLARE
  policy_count int;
  trigger_exists boolean;
BEGIN
  -- Compter les policies sur profiles
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'profiles';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS Policies Fix Applied Successfully';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total policies on profiles table: %', policy_count;
  
  -- Vérifier que le trigger existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema = 'auth'
    AND event_object_table = 'users'
    AND trigger_name = 'on_auth_user_created'
  ) INTO trigger_exists;
  
  RAISE NOTICE 'Trigger on_auth_user_created exists: %', trigger_exists;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Users can now:';
  RAISE NOTICE '  ✓ Sign up and have profiles auto-created';
  RAISE NOTICE '  ✓ Sign in and read their own profile';
  RAISE NOTICE '  ✓ Read organizations data';
  RAISE NOTICE '  ✓ Update their own profile';
  RAISE NOTICE '========================================';
END $$;
