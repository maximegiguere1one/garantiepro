/*
  # Extension des Rôles Utilisateurs pour Gestion Complète
  
  ## Résumé
  Étend les rôles disponibles dans le système pour supporter la gestion complète
  des utilisateurs incluant les rôles "dealer" et "super_admin".
  
  ## Changements
  
  ### 1. Modification de la table profiles
  - Supprime l'ancienne contrainte CHECK sur le rôle
  - Ajoute une nouvelle contrainte avec les rôles étendus:
    * super_admin: Accès complet au système
    * admin: Administrateur d'organisation
    * dealer: Concessionnaire/Vendeur
    * f_and_i: Finance et Assurance
    * operations: Opérations
    * client: Client final
  
  ### 2. Modification de la table franchisee_invitations
  - Met à jour la contrainte CHECK pour supporter les nouveaux rôles
  
  ### 3. Fonction de validation des rôles
  - Crée une fonction pour valider la hiérarchie des permissions
  - Vérifie qu'un utilisateur ne peut créer que des rôles inférieurs ou égaux au sien
  
  ### 4. Indices de performance
  - Ajoute des indices optimisés pour les requêtes par rôle
  
  ## Sécurité
  - Hiérarchie des rôles strictement appliquée
  - Validation au niveau de la base de données
  - RLS policies mises à jour pour supporter les nouveaux rôles
  
  ## Notes Importantes
  - Cette migration est sûre et n'affecte pas les données existantes
  - Les rôles existants restent valides
  - La hiérarchie: super_admin > admin > dealer > f_and_i = operations > client
*/

-- =====================================================
-- 1. Supprimer l'ancienne contrainte de rôle sur profiles
-- =====================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
  END IF;
END $$;

-- =====================================================
-- 2. Ajouter la nouvelle contrainte avec rôles étendus
-- =====================================================
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('super_admin', 'admin', 'dealer', 'f_and_i', 'operations', 'client'));

-- =====================================================
-- 3. Mettre à jour la contrainte sur franchisee_invitations si elle existe
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'franchisee_invitations' AND table_schema = 'public') THEN
    IF EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'franchisee_invitations_role_check'
      AND conrelid = 'public.franchisee_invitations'::regclass
    ) THEN
      ALTER TABLE public.franchisee_invitations DROP CONSTRAINT franchisee_invitations_role_check;
    END IF;
    
    ALTER TABLE public.franchisee_invitations 
    ADD CONSTRAINT franchisee_invitations_role_check 
    CHECK (role IN ('super_admin', 'admin', 'dealer', 'f_and_i', 'operations', 'client'));
  END IF;
END $$;

-- =====================================================
-- 4. Fonction pour obtenir le niveau hiérarchique d'un rôle
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_role_level(p_role text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE p_role
    WHEN 'super_admin' THEN 6
    WHEN 'admin' THEN 5
    WHEN 'dealer' THEN 4
    WHEN 'f_and_i' THEN 3
    WHEN 'operations' THEN 3
    WHEN 'client' THEN 1
    ELSE 0
  END;
END;
$$;

-- =====================================================
-- 5. Fonction pour valider si un utilisateur peut créer/modifier un rôle
-- =====================================================
CREATE OR REPLACE FUNCTION public.can_manage_role(
  p_manager_role text,
  p_target_role text
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Super admin peut tout faire
  IF p_manager_role = 'super_admin' THEN
    RETURN true;
  END IF;
  
  -- Admin peut gérer tous les rôles sauf super_admin
  IF p_manager_role = 'admin' AND p_target_role != 'super_admin' THEN
    RETURN true;
  END IF;
  
  -- Dealer peut gérer f_and_i, operations et client
  IF p_manager_role = 'dealer' AND p_target_role IN ('f_and_i', 'operations', 'client') THEN
    RETURN true;
  END IF;
  
  -- Par défaut, refuser
  RETURN false;
END;
$$;

-- =====================================================
-- 6. Fonction pour vérifier les dépendances d'un utilisateur
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_user_dependencies(p_user_id uuid)
RETURNS TABLE (
  has_warranties boolean,
  warranties_count bigint,
  has_claims boolean,
  claims_count bigint,
  has_invitations boolean,
  invitations_count bigint,
  can_delete boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_warranties_count bigint := 0;
  v_claims_count bigint := 0;
  v_invitations_count bigint := 0;
BEGIN
  -- Compter les garanties liées à l'utilisateur (si la colonne existe)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'warranties' AND column_name = 'created_by') THEN
    EXECUTE 'SELECT COUNT(*) FROM public.warranties WHERE created_by = $1' INTO v_warranties_count USING p_user_id;
  END IF;
  
  -- Compter les réclamations liées à l'utilisateur (si la table existe)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'warranty_claims') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'warranty_claims' AND column_name = 'created_by') THEN
      EXECUTE 'SELECT COUNT(*) FROM public.warranty_claims WHERE created_by = $1' INTO v_claims_count USING p_user_id;
    END IF;
  END IF;
  
  -- Compter les invitations envoyées par l'utilisateur (si la table existe)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'franchisee_invitations') THEN
    EXECUTE 'SELECT COUNT(*) FROM public.franchisee_invitations WHERE invited_by = $1' INTO v_invitations_count USING p_user_id;
  END IF;
  
  RETURN QUERY SELECT
    v_warranties_count > 0,
    v_warranties_count,
    v_claims_count > 0,
    v_claims_count,
    v_invitations_count > 0,
    v_invitations_count,
    (v_warranties_count = 0 AND v_claims_count = 0);
END;
$$;

-- =====================================================
-- 7. Fonction pour obtenir les statistiques des utilisateurs
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_users_statistics()
RETURNS TABLE (
  total_users bigint,
  super_admin_count bigint,
  admin_count bigint,
  dealer_count bigint,
  f_and_i_count bigint,
  operations_count bigint,
  client_count bigint,
  active_invitations bigint,
  pending_invitations bigint,
  expired_invitations bigint
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
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'dealer')::bigint as dealer_count,
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'f_and_i')::bigint as f_and_i_count,
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'operations')::bigint as operations_count,
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'client')::bigint as client_count,
    v_active_invitations,
    v_pending_invitations,
    v_expired_invitations;
END;
$$;

-- =====================================================
-- 8. Indices de performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role_organization 
  ON public.profiles(role, organization_id) 
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_email_lower 
  ON public.profiles(LOWER(email));

CREATE INDEX IF NOT EXISTS idx_profiles_full_name_search 
  ON public.profiles USING gin(to_tsvector('simple', full_name));

-- =====================================================
-- 9. Permissions sur les nouvelles fonctions
-- =====================================================
GRANT EXECUTE ON FUNCTION public.get_role_level(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_role(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_dependencies(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_users_statistics() TO authenticated;

-- =====================================================
-- 10. Mise à jour des RLS policies existantes
-- =====================================================

-- Supprimer les anciennes policies pour profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles in organization" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in organization" ON public.profiles;
DROP POLICY IF EXISTS "Users can update profiles based on role" ON public.profiles;

-- Politique de lecture pour les profils
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
      AND p.role IN ('admin', 'super_admin')
      AND (
        p.organization_id = profiles.organization_id
        OR p.role = 'super_admin'
      )
    )
    OR
    -- Les dealers peuvent voir les profils de leur organisation
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'dealer'
      AND p.organization_id = profiles.organization_id
    )
  );

-- Politique de mise à jour pour les profils
CREATE POLICY "Users can update profiles based on role"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    -- Les utilisateurs peuvent mettre à jour leur propre nom
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