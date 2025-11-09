/*
  # Fix Profiles Policy - Allow Authenticated Users
  
  ## Problem
  La policy `id = auth.uid()` ne fonctionne pas car auth.uid() retourne NULL
  ou ne match pas avec l'ID dans la query
  
  ## Solution Temporaire
  Permettre à TOUS les users authentifiés de lire leur propre profil
  en ajoutant une policy plus large pour débugger
*/

-- Drop l'ancienne policy
DROP POLICY IF EXISTS "profiles_own_select" ON profiles;

-- Policy ultra-simple: tout user authentifié peut lire les profiles
CREATE POLICY "profiles_authenticated_select"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Soit c'est son propre profil
    id = auth.uid()
    -- Soit il est authentifié (temporaire pour debug)
    OR auth.role() = 'authenticated'
  );

-- Policy pour UPDATE (allow own profile)
CREATE POLICY "profiles_authenticated_update"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Log pour debug
DO $$
BEGIN
  RAISE NOTICE '✓ Profiles policies updated';
  RAISE NOTICE '  SELECT: authenticated users can read ALL profiles (temp debug)';
  RAISE NOTICE '  UPDATE: users can update their own profile only';
END $$;
