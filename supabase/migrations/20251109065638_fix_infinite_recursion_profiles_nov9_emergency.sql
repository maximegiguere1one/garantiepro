/*
  # FIX URGENT - Récursion Infinie Profiles
  
  ## Problème
  Les policies créées causent une récursion infinie:
  - Policy "Admins can read org profiles" fait un EXISTS sur profiles
  - Policy "Master sees all profiles" fait un EXISTS sur profiles
  - Cela crée une boucle infinie !
  
  ## Solution
  Utiliser auth.uid() directement sans sous-queries sur profiles
*/

-- ============================================================================
-- 1. DROP toutes les policies problématiques
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own profile - simple" ON profiles;
DROP POLICY IF EXISTS "Admins can read org profiles" ON profiles;
DROP POLICY IF EXISTS "Master sees all profiles" ON profiles;

-- ============================================================================
-- 2. Créer UNE SEULE policy sans récursion
-- ============================================================================

-- Policy ultra-simple: l'utilisateur voit UNIQUEMENT son propre profil
CREATE POLICY "users_read_own_profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- ============================================================================
-- 3. Pour les admins et master, utiliser user metadata (pas de recursion)
-- ============================================================================

-- Les admins peuvent voir les profils de leur org
-- SANS faire de subquery sur profiles (utilise auth metadata)
CREATE POLICY "admins_read_org_profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Utiliser les metadata de auth.users au lieu de profiles
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('master', 'franchisee_admin', 'admin')
    AND organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid
  );

-- Master voit TOUS les profils
CREATE POLICY "master_read_all_profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'master'
  );

-- ============================================================================
-- 4. Vérification
-- ============================================================================

DO $$ 
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'profiles' AND cmd = 'SELECT';
  
  RAISE NOTICE '✓ Profiles policies fixed: % SELECT policies (no recursion)', policy_count;
END $$;
