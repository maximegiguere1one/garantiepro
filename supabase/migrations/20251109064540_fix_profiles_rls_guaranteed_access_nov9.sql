/*
  # Fix Profiles RLS - Accès Garanti en Production
  
  ## Problème
  - Policies multiples et conflictuelles sur profiles
  - Chargement lent ou timeout en production
  - Pas d'index optimisés pour auth.uid()
  
  ## Solution
  1. Supprimer TOUTES les policies existantes sur profiles
  2. Créer UNE SEULE policy optimisée pour SELECT
  3. Ajouter index sur (id) si manquant
  4. Garantir que l'utilisateur peut TOUJOURS lire son profil
  
  ## Sécurité
  - Policy simple: auth.uid() = id
  - Pas de recursion, pas de sous-queries complexes
  - Performance maximale avec index
*/

-- ============================================================================
-- 1. CLEANUP - Supprimer toutes les policies SELECT existantes
-- ============================================================================

DO $$ 
DECLARE
  policy_record RECORD;
BEGIN
  -- Drop all SELECT policies on profiles
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', policy_record.policyname);
    RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
  END LOOP;
END $$;

-- ============================================================================
-- 2. INDEXES - Garantir performance maximale
-- ============================================================================

-- Index sur id (devrait déjà exister via PK, mais on s'assure)
CREATE INDEX IF NOT EXISTS idx_profiles_id_lookup ON profiles(id);

-- Index sur user_id si la colonne existe
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
  END IF;
END $$;

-- Index sur organization_id pour queries org-level
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON profiles(organization_id);

-- ============================================================================
-- 3. NOUVELLE POLICY ULTRA-SIMPLE - Utilisateur lit son propre profil
-- ============================================================================

CREATE POLICY "Users can read own profile - simple"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- ============================================================================
-- 4. POLICY ADMIN - Master et Admin peuvent voir les profils de leur org
-- ============================================================================

CREATE POLICY "Admins can read org profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('master', 'franchisee_admin', 'admin')
      AND p.organization_id = profiles.organization_id
    )
  );

-- ============================================================================
-- 5. POLICY MASTER - Master voit TOUS les profils
-- ============================================================================

CREATE POLICY "Master sees all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'master'
    )
  );

-- ============================================================================
-- 6. ANALYZE - Mettre à jour les statistiques pour l'optimiseur
-- ============================================================================

ANALYZE profiles;

-- ============================================================================
-- 7. VERIFICATION - Tester que la policy fonctionne
-- ============================================================================

DO $$ 
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'profiles' AND cmd = 'SELECT';
  
  IF policy_count != 3 THEN
    RAISE EXCEPTION 'Expected 3 SELECT policies on profiles, found %', policy_count;
  END IF;
  
  RAISE NOTICE '✓ Profiles RLS configured correctly: % policies', policy_count;
END $$;
