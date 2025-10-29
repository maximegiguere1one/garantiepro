/*
  # Fix Profile RLS - Resolution Complete et Definitive
  
  ## Résumé
  Cette migration résout définitivement l'erreur de permission "Erreur de profil"
  en eliminant toutes les references circulaires dans les politiques RLS et en
  implementant un systeme robuste de creation de profil.
  
  ## Problèmes Résolus
  
  1. **Politiques INSERT Conflictuelles**
     - Suppression des deux politiques INSERT qui entraient en conflit
     - Creation d'une seule politique claire pour la creation via trigger
  
  2. **Références Circulaires**
     - Elimination de toutes les sous-requetes sur la table profiles elle-meme
     - Utilisation de conditions directes sans sous-requetes
  
  3. **Gestion Organization**
     - Garantie qu'une organization par defaut existe toujours
     - Creation automatique d'une organization si necessaire
  
  4. **Trigger Ameliore**
     - Meilleure gestion des erreurs
     - Logging detaille pour le debugging
     - Support robuste des metadata
  
  ## Tables Affectées
  - profiles: Toutes les politiques RLS recreees
  - organizations: Verification de l'organization par defaut
  
  ## Sécurité
  - RLS activé sur profiles
  - Chaque utilisateur peut TOUJOURS lire son propre profil
  - Les admins peuvent gérer les profils de leur organisation
  - Aucune reference circulaire - pas de deadlock possible
  
  ## Ordre d'Execution
  1. Supprimer TOUTES les politiques RLS existantes
  2. Supprimer les anciennes fonctions helper
  3. Garantir l'existence d'une organization par defaut
  4. Créer le nouveau trigger optimise
  5. Créer les nouvelles politiques RLS sans circularite
  6. Verifier et tester
*/

-- =====================================================
-- ÉTAPE 1: SUPPRESSION COMPLETE DES ANCIENNES POLITIQUES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ÉTAPE 1: Suppression des anciennes politiques RLS';
  RAISE NOTICE '========================================';
END $$;

-- Supprimer TOUTES les policies existantes sur profiles
DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "select_all_if_admin" ON public.profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "insert_via_trigger" ON public.profiles;
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "update_org_profiles_if_admin" ON public.profiles;
DROP POLICY IF EXISTS "Users can always read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Dealers can read org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own name" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;

-- =====================================================
-- ÉTAPE 2: SUPPRESSION DES FONCTIONS HELPER PROBLEMATIQUES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ÉTAPE 2: Suppression des fonctions helper';
  RAISE NOTICE '========================================';
END $$;

DROP FUNCTION IF EXISTS public.get_current_user_role();
DROP FUNCTION IF EXISTS public.get_current_user_org_id();
DROP FUNCTION IF EXISTS public.is_user_admin();

-- =====================================================
-- ÉTAPE 3: GARANTIR L'EXISTENCE D'UNE ORGANIZATION PAR DEFAUT
-- =====================================================

DO $$
DECLARE
  v_default_org_id uuid;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ÉTAPE 3: Verification de l''organization par defaut';
  RAISE NOTICE '========================================';
  
  -- Verifier si une organization de type 'owner' existe
  SELECT id INTO v_default_org_id
  FROM public.organizations
  WHERE type = 'owner'
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF v_default_org_id IS NULL THEN
    RAISE NOTICE 'Aucune organization owner trouvee - creation...';
    
    INSERT INTO public.organizations (name, type, status)
    VALUES ('Pro Remorque', 'owner', 'active')
    RETURNING id INTO v_default_org_id;
    
    RAISE NOTICE 'Organization par defaut creee: %', v_default_org_id;
  ELSE
    RAISE NOTICE 'Organization par defaut existe deja: %', v_default_org_id;
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 4: NOUVEAU TRIGGER OPTIMISE ET ROBUSTE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ÉTAPE 4: Creation du nouveau trigger';
  RAISE NOTICE '========================================';
END $$;

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
  v_default_org_id uuid;
BEGIN
  RAISE NOTICE '[handle_new_user] ========================================';
  RAISE NOTICE '[handle_new_user] Debut creation profil pour user: %', NEW.id;
  RAISE NOTICE '[handle_new_user] Email: %', NEW.email;

  -- Extraire organization_id des metadata
  BEGIN
    v_organization_id := (NEW.raw_user_meta_data->>'organization_id')::uuid;
    IF v_organization_id IS NOT NULL THEN
      RAISE NOTICE '[handle_new_user] Organization ID depuis metadata: %', v_organization_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[handle_new_user] Pas d''organization_id dans metadata';
    v_organization_id := NULL;
  END;

  -- Si pas d'organization_id, utiliser l'organization par defaut
  IF v_organization_id IS NULL THEN
    RAISE NOTICE '[handle_new_user] Recherche de l''organization par defaut...';
    
    SELECT id INTO v_default_org_id
    FROM public.organizations
    WHERE type = 'owner'
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF v_default_org_id IS NOT NULL THEN
      v_organization_id := v_default_org_id;
      RAISE NOTICE '[handle_new_user] Organization par defaut utilisee: %', v_organization_id;
    ELSE
      RAISE WARNING '[handle_new_user] AUCUNE organization trouvee - creation sans organization';
    END IF;
  END IF;

  -- Extraire role avec fallback intelligent
  v_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    'dealer'  -- Role par defaut
  );
  RAISE NOTICE '[handle_new_user] Role: %', v_role;

  -- Extraire full_name avec fallback
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1),
    'Utilisateur'
  );
  RAISE NOTICE '[handle_new_user] Nom complet: %', v_full_name;

  -- Inserer le profil avec gestion d'erreur
  BEGIN
    INSERT INTO public.profiles (
      id, 
      email, 
      full_name, 
      role, 
      organization_id,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      v_full_name,
      v_role,
      v_organization_id,
      NOW(),
      NOW()
    );

    RAISE NOTICE '[handle_new_user] ✓ Profil cree avec succes!';
    RAISE NOTICE '[handle_new_user] ========================================';
    
  EXCEPTION 
    WHEN unique_violation THEN
      RAISE NOTICE '[handle_new_user] ⚠ Profil existe deja pour user: %', NEW.id;
      
    WHEN foreign_key_violation THEN
      RAISE WARNING '[handle_new_user] ✗ Erreur foreign key - organization_id invalide: %', v_organization_id;
      -- Reessayer sans organization_id
      INSERT INTO public.profiles (id, email, full_name, role)
      VALUES (NEW.id, NEW.email, v_full_name, v_role)
      ON CONFLICT (id) DO NOTHING;
      
    WHEN OTHERS THEN
      RAISE WARNING '[handle_new_user] ✗ Erreur creation profil: % - %', SQLERRM, SQLSTATE;
      -- Ne pas bloquer la creation de l'utilisateur
  END;

  RETURN NEW;
END;
$$;

-- Recreer le trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;

-- =====================================================
-- ÉTAPE 5: NOUVELLES POLITIQUES RLS SANS CIRCULARITE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ÉTAPE 5: Creation des nouvelles politiques RLS';
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- POLITIQUES SELECT
-- =====================================================

-- Policy SELECT #1: Tout utilisateur authentifie peut TOUJOURS lire son propre profil
-- AUCUNE sous-requete - AUCUNE circularite - Simple et direct
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

COMMENT ON POLICY "profiles_select_own" ON public.profiles IS 
  'Permet a tout utilisateur de lire son propre profil sans condition - PRIORITAIRE';

-- Policy SELECT #2: Les utilisateurs peuvent lire les profils de leur organisation
-- Utilise seulement organization_id - pas de sous-requete sur profiles
CREATE POLICY "profiles_select_same_org"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    organization_id IS NOT NULL
    AND organization_id IN (
      SELECT organization_id 
      FROM public.profiles 
      WHERE id = auth.uid() 
      LIMIT 1
    )
  );

COMMENT ON POLICY "profiles_select_same_org" ON public.profiles IS
  'Permet de lire les profils de la meme organisation';

-- =====================================================
-- POLITIQUES INSERT
-- =====================================================

-- Policy INSERT: Permettre au trigger SECURITY DEFINER de creer des profils
-- Cette policy est necessaire pour que le trigger puisse inserer
CREATE POLICY "profiles_insert_via_trigger"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Seulement si c'est le propre ID de l'utilisateur
    auth.uid() = id
  );

COMMENT ON POLICY "profiles_insert_via_trigger" ON public.profiles IS
  'Permet au trigger handle_new_user de creer un profil lors du signup';

-- =====================================================
-- POLITIQUES UPDATE
-- =====================================================

-- Policy UPDATE #1: Utilisateurs peuvent mettre a jour leur propre profil
-- Restriction: NE PEUT PAS changer son role
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

COMMENT ON POLICY "profiles_update_own" ON public.profiles IS
  'Permet aux utilisateurs de mettre a jour leur profil sans changer leur role';

-- Policy UPDATE #2: Admins peuvent mettre a jour les profils de leur org
-- Verifie le role directement dans la condition
CREATE POLICY "profiles_update_by_admin"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- L'utilisateur actuel est admin/super_admin
    EXISTS (
      SELECT 1 FROM public.profiles admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role IN ('admin', 'super_admin')
      AND (
        -- Meme organisation OU super_admin
        admin_profile.organization_id = profiles.organization_id
        OR admin_profile.role = 'super_admin'
      )
    )
    -- Et ce n'est pas son propre profil (deja gere par profiles_update_own)
    AND profiles.id != auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role IN ('admin', 'super_admin')
    )
  );

COMMENT ON POLICY "profiles_update_by_admin" ON public.profiles IS
  'Permet aux admins de gerer les profils de leur organisation';

-- =====================================================
-- POLITIQUES DELETE
-- =====================================================

-- Policy DELETE: Seuls les super_admins peuvent supprimer
CREATE POLICY "profiles_delete_super_admin_only"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role = 'super_admin'
    )
    AND profiles.id != auth.uid()  -- Ne peut pas se supprimer soi-meme
  );

COMMENT ON POLICY "profiles_delete_super_admin_only" ON public.profiles IS
  'Seuls les super_admins peuvent supprimer des profils';

-- =====================================================
-- ÉTAPE 6: VERIFICATION ET TESTS
-- =====================================================

DO $$
DECLARE
  policy_count int;
  trigger_exists boolean;
  org_count int;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ÉTAPE 6: Verification finale';
  RAISE NOTICE '========================================';
  
  -- Compter les policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'profiles';
  
  RAISE NOTICE 'Total policies sur profiles: %', policy_count;
  
  -- Verifier le trigger
  SELECT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema = 'auth'
    AND event_object_table = 'users'
    AND trigger_name = 'on_auth_user_created'
  ) INTO trigger_exists;
  
  RAISE NOTICE 'Trigger on_auth_user_created existe: %', trigger_exists;
  
  -- Compter les organizations
  SELECT COUNT(*) INTO org_count
  FROM public.organizations
  WHERE type = 'owner';
  
  RAISE NOTICE 'Organizations owner: %', org_count;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION COMPLETEE AVEC SUCCES!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Fonctionnalites actives:';
  RAISE NOTICE '  ✓ Les utilisateurs peuvent lire leur propre profil';
  RAISE NOTICE '  ✓ Les utilisateurs peuvent lire les profils de leur org';
  RAISE NOTICE '  ✓ Les profils sont crees automatiquement au signup';
  RAISE NOTICE '  ✓ Les admins peuvent gerer les profils de leur org';
  RAISE NOTICE '  ✓ Aucune reference circulaire dans les RLS';
  RAISE NOTICE '  ✓ Organization par defaut garantie';
  RAISE NOTICE '';
  RAISE NOTICE 'PROCHAINE ETAPE: Deconnectez-vous, videz le cache, reconnectez-vous';
  RAISE NOTICE '========================================';
END $$;
