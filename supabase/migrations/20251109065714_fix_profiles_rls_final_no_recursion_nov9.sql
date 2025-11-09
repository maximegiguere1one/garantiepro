/*
  # Fix RLS Profiles - Solution FINALE Sans Récursion
  
  ## La vraie solution
  On ne peut PAS utiliser de subquery sur profiles dans les policies profiles.
  Solution: Autoriser tout le monde à lire profiles, et filtrer côté application.
  
  OU utiliser une fonction SECURITY DEFINER qui bypass RLS.
*/

-- ============================================================================
-- 1. DROP TOUTES les policies
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
    RAISE NOTICE 'Dropped: %', policy_record.policyname;
  END LOOP;
END $$;

-- ============================================================================
-- 2. Policy SIMPLE - Auth user lit son profil ONLY
-- ============================================================================

CREATE POLICY "profiles_own_select"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- ============================================================================
-- 3. Pour les autres cas, utiliser des fonctions RPC
-- ============================================================================

-- Fonction pour vérifier si user peut voir un profil
CREATE OR REPLACE FUNCTION can_read_profile(target_profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  caller_org_id uuid;
  target_org_id uuid;
BEGIN
  -- Get caller's role and org (bypass RLS avec SECURITY DEFINER)
  SELECT role, organization_id INTO caller_role, caller_org_id
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  -- Master peut tout voir
  IF caller_role = 'master' THEN
    RETURN true;
  END IF;
  
  -- Admins peuvent voir leur org
  IF caller_role IN ('franchisee_admin', 'admin') THEN
    SELECT organization_id INTO target_org_id
    FROM profiles
    WHERE id = target_profile_id
    LIMIT 1;
    
    RETURN target_org_id = caller_org_id;
  END IF;
  
  -- Sinon, seulement son propre profil
  RETURN target_profile_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION can_read_profile(uuid) TO authenticated;

-- ============================================================================
-- 4. Fonction pour lister les profils accessibles
-- ============================================================================

CREATE OR REPLACE FUNCTION get_accessible_profiles()
RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  caller_org_id uuid;
BEGIN
  -- Get caller info
  SELECT role, organization_id INTO caller_role, caller_org_id
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  -- Master voit tout
  IF caller_role = 'master' THEN
    RETURN QUERY SELECT * FROM profiles;
    RETURN;
  END IF;
  
  -- Admin voit son org
  IF caller_role IN ('franchisee_admin', 'admin') THEN
    RETURN QUERY 
    SELECT * FROM profiles 
    WHERE organization_id = caller_org_id;
    RETURN;
  END IF;
  
  -- User normal voit juste lui-même
  RETURN QUERY 
  SELECT * FROM profiles 
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION get_accessible_profiles() TO authenticated;

-- ============================================================================
-- 5. Vérification
-- ============================================================================

DO $$ 
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'profiles' AND cmd = 'SELECT';
  
  IF policy_count != 1 THEN
    RAISE EXCEPTION 'Expected 1 SELECT policy on profiles, found %', policy_count;
  END IF;
  
  RAISE NOTICE '✓ Profiles RLS fixed: 1 simple policy + 2 SECURITY DEFINER functions';
END $$;
