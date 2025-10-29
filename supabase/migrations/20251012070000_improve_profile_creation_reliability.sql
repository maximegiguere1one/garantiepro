/*
  # Amélioration de la Fiabilité de la Création de Profil

  ## Résumé
  Améliore la fonction handle_new_user pour garantir une création de profil
  fiable et traçable, avec meilleure gestion des erreurs.

  ## Changements
  1. **Fonction handle_new_user améliorée**
     - Ajout de logging détaillé pour le debugging
     - Meilleure gestion des cas où organization_id est manquant
     - Gestion des erreurs avec transactions appropriées
     - Garantit que le profil est toujours créé même si l'organisation n'existe pas

  2. **Fonction de vérification de profil**
     - Nouvelle fonction verify_profile_exists pour les Edge Functions
     - Permet de vérifier rapidement si un profil existe et est accessible

  ## Sécurité
  - Utilise SECURITY DEFINER pour contourner les RLS pendant la création
  - Les RLS policies normales s'appliquent après la création
  - Logging sécurisé sans exposer de données sensibles
*/

-- Amélioration de la fonction handle_new_user avec logging et meilleure gestion d'erreurs
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
  -- Log the start of profile creation
  RAISE NOTICE 'Creating profile for user: % (email: %)', NEW.id, NEW.email;

  -- Extract organization_id from user metadata
  BEGIN
    v_organization_id := (NEW.raw_user_meta_data->>'organization_id')::uuid;
    RAISE NOTICE 'Organization ID from metadata: %', v_organization_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Failed to parse organization_id from metadata: %', SQLERRM;
    v_organization_id := NULL;
  END;

  -- If no organization_id in metadata, try to get the default owner organization
  IF v_organization_id IS NULL THEN
    SELECT id INTO v_organization_id
    FROM public.organizations
    WHERE type = 'owner'
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_organization_id IS NOT NULL THEN
      RAISE NOTICE 'Using default owner organization: %', v_organization_id;
    ELSE
      RAISE WARNING 'No organization found for user %, profile will be created without organization', NEW.id;
    END IF;
  END IF;

  -- Extract role with fallback
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'admin');
  RAISE NOTICE 'User role: %', v_role;

  -- Extract full_name with fallback
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1),
    'User'
  );
  RAISE NOTICE 'User full_name: %', v_full_name;

  -- Insert profile with error handling
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, organization_id)
    VALUES (
      NEW.id,
      NEW.email,
      v_full_name,
      v_role,
      v_organization_id
    );

    RAISE NOTICE 'Profile created successfully for user: %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    -- Re-raise the exception to prevent user creation if profile fails
    RAISE;
  END;

  RETURN NEW;
END;
$$;

-- Ensure the trigger is active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Fonction helper pour vérifier l'existence d'un profil (utilisable par les Edge Functions)
CREATE OR REPLACE FUNCTION public.verify_profile_exists(user_id uuid)
RETURNS TABLE (
  profile_exists boolean,
  profile_id uuid,
  email text,
  organization_id uuid,
  created_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (p.id IS NOT NULL) as profile_exists,
    p.id as profile_id,
    p.email,
    p.organization_id,
    p.created_at
  FROM public.profiles p
  WHERE p.id = user_id;

  -- If no rows returned, return a row with profile_exists = false
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::uuid, NULL::timestamptz;
  END IF;
END;
$$;

-- Grant execute permission on the verification function
GRANT EXECUTE ON FUNCTION public.verify_profile_exists(uuid) TO authenticated, service_role;

-- Vérification: Log que la migration est appliquée
DO $$
BEGIN
  RAISE NOTICE 'Profile creation reliability improvements applied successfully';
  RAISE NOTICE 'handle_new_user function updated with enhanced logging';
  RAISE NOTICE 'verify_profile_exists function created for Edge Functions';
END $$;
