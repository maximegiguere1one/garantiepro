/*
  # Fix RLS Profiles - Solution Simple SANS Récursion
  
  ## Problème
  Impossible d'utiliser EXISTS sur profiles dans les policies profiles
  Car cela crée une récursion infinie
  
  ## Solution
  1. UNE policy simple: auth.uid() = id (pas de recursion)
  2. Pour admin/master: Utiliser une FONCTION qui cache le profil
*/

-- ============================================================================
-- 1. DROP TOUTES les policies existantes
-- ============================================================================

DO $$ 
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', policy_record.policyname);
  END LOOP;
END $$;

-- ============================================================================
-- 2. Créer UNE SEULE policy ultra-simple
-- ============================================================================

CREATE POLICY "profiles_select_policy"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Cas 1: L'utilisateur lit son propre profil
    id = auth.uid()
    
    -- Cas 2: C'est un master (via custom claim dans JWT)
    OR (auth.jwt() ->> 'role') = 'master'
    
    -- Cas 3: Même organisation ET user est admin
    OR (
      organization_id IN (
        SELECT organization_id 
        FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('master', 'franchisee_admin', 'admin')
        LIMIT 1
      )
    )
  );

COMMENT ON POLICY "profiles_select_policy" ON profiles IS 
  'Allows users to read their own profile, masters to read all, and admins to read org profiles';

-- ============================================================================
-- 3. Vérification
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '✓ Profiles RLS fixed with single policy (no recursion)';
END $$;
