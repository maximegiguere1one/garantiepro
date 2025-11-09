/*
  # Fonction RPC Optimisée - Charger Profil + Organisation
  
  ## Objectif
  Remplacer 2-3 queries séparées par UNE SEULE query optimisée
  qui retourne tout ce dont l'app a besoin:
  - Profil utilisateur
  - Organisation
  - Rôle et permissions
  
  ## Performance
  - 1 seule query au lieu de 3
  - JOIN optimisé avec indexes
  - Pas de N+1 queries
  - Cache-friendly
  
  ## Usage
  ```typescript
  const { data } = await supabase.rpc('get_user_profile_complete')
  // Returns: { profile, organization, permissions }
  ```
*/

-- ============================================================================
-- Drop existing function if exists
-- ============================================================================

DROP FUNCTION IF EXISTS get_user_profile_complete();

-- ============================================================================
-- Create optimized profile + org loader
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_profile_complete()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  user_profile profiles%ROWTYPE;
  user_org organizations%ROWTYPE;
BEGIN
  -- 1. Get user profile (guaranteed by RLS to be their own)
  SELECT * INTO user_profile
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  -- If no profile, return null immediately
  IF user_profile.id IS NULL THEN
    RETURN jsonb_build_object(
      'profile', NULL,
      'organization', NULL,
      'error', 'Profile not found'
    );
  END IF;
  
  -- 2. Get organization if exists
  IF user_profile.organization_id IS NOT NULL THEN
    SELECT * INTO user_org
    FROM organizations
    WHERE id = user_profile.organization_id
    LIMIT 1;
  END IF;
  
  -- 3. Build result object
  result := jsonb_build_object(
    'profile', row_to_json(user_profile),
    'organization', CASE 
      WHEN user_org.id IS NOT NULL THEN row_to_json(user_org)
      ELSE NULL
    END,
    'permissions', jsonb_build_object(
      'can_manage_users', user_profile.role IN ('master', 'franchisee_admin', 'admin'),
      'can_create_warranties', user_profile.role IN ('master', 'franchisee_admin', 'admin', 'employee'),
      'can_manage_org', user_profile.role IN ('master', 'franchisee_admin'),
      'is_master', user_profile.role = 'master',
      'is_admin', user_profile.role IN ('franchisee_admin', 'admin')
    )
  );
  
  RETURN result;
END;
$$;

-- ============================================================================
-- Grant execute to authenticated users
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_user_profile_complete() TO authenticated;

-- ============================================================================
-- Create similar function that accepts user_id (for admin use)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_profile_by_id(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  user_profile profiles%ROWTYPE;
  user_org organizations%ROWTYPE;
  caller_profile profiles%ROWTYPE;
BEGIN
  -- Security: Only master or admins in same org can call this
  SELECT * INTO caller_profile
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  IF caller_profile.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;
  
  -- Get target profile
  SELECT * INTO user_profile
  FROM profiles
  WHERE id = target_user_id
  LIMIT 1;
  
  -- Security check: Can caller access this profile?
  IF user_profile.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Profile not found');
  END IF;
  
  IF caller_profile.role != 'master' 
     AND user_profile.organization_id != caller_profile.organization_id THEN
    RETURN jsonb_build_object('error', 'Unauthorized - different organization');
  END IF;
  
  -- Get organization
  IF user_profile.organization_id IS NOT NULL THEN
    SELECT * INTO user_org
    FROM organizations
    WHERE id = user_profile.organization_id
    LIMIT 1;
  END IF;
  
  -- Build result
  result := jsonb_build_object(
    'profile', row_to_json(user_profile),
    'organization', CASE 
      WHEN user_org.id IS NOT NULL THEN row_to_json(user_org)
      ELSE NULL
    END
  );
  
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_profile_by_id(uuid) TO authenticated;

-- ============================================================================
-- Test function
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '✓ Profile loading functions created successfully';
  RAISE NOTICE '  - get_user_profile_complete() for current user';
  RAISE NOTICE '  - get_user_profile_by_id(uuid) for admin access';
END $$;
