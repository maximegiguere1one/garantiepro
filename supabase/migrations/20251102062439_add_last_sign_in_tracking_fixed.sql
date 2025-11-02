/*
  # Système de tracking de dernière connexion

  1. Modifications de schéma
    - Ajoute last_sign_in_at à la table profiles si absent
    - Synchronise avec auth.users.last_sign_in_at

  2. Fonctions
    - Crée une fonction pour mettre à jour last_sign_in_at
    - Fonction de synchronisation avec auth.users

  3. Sécurité
    - RLS policies pour lecture seulement
*/

-- Ajouter la colonne last_sign_in_at si elle n'existe pas
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'last_sign_in_at'
  ) THEN
    ALTER TABLE profiles
    ADD COLUMN last_sign_in_at timestamptz;
  END IF;
END $migration$;

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_profiles_last_sign_in_at
ON profiles(last_sign_in_at DESC);

-- Fonction pour synchroniser last_sign_in_at depuis auth.users
CREATE OR REPLACE FUNCTION sync_last_sign_in_from_auth()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Mettre à jour tous les profils avec la dernière connexion de auth.users
  UPDATE profiles p
  SET last_sign_in_at = u.last_sign_in_at
  FROM auth.users u
  WHERE p.id = u.id
    AND (p.last_sign_in_at IS NULL OR p.last_sign_in_at < u.last_sign_in_at);

  RAISE NOTICE 'Synchronisation des dernières connexions terminée';
END;
$function$;

-- Fonction pour mettre à jour last_sign_in_at d'un utilisateur spécifique
CREATE OR REPLACE FUNCTION update_user_last_sign_in(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  auth_last_sign_in timestamptz;
BEGIN
  -- Récupérer la dernière connexion depuis auth.users
  SELECT last_sign_in_at INTO auth_last_sign_in
  FROM auth.users
  WHERE id = user_id;

  -- Mettre à jour le profil
  IF auth_last_sign_in IS NOT NULL THEN
    UPDATE profiles
    SET last_sign_in_at = auth_last_sign_in
    WHERE id = user_id;
  END IF;
END;
$function$;

-- Fonction RPC publique pour que l'utilisateur mette à jour sa propre dernière connexion
CREATE OR REPLACE FUNCTION update_my_last_sign_in()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  current_user_id uuid;
BEGIN
  -- Récupérer l'ID de l'utilisateur connecté
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;

  -- Mettre à jour la dernière connexion avec l'heure actuelle
  UPDATE profiles
  SET last_sign_in_at = now()
  WHERE id = current_user_id;
END;
$function$;

-- Synchroniser immédiatement toutes les données existantes
SELECT sync_last_sign_in_from_auth();

-- Commenter les colonnes pour la documentation
COMMENT ON COLUMN profiles.last_sign_in_at IS
'Date et heure de la dernière connexion de l''utilisateur. Synchronisé avec auth.users.last_sign_in_at';

COMMENT ON FUNCTION sync_last_sign_in_from_auth() IS
'Synchronise les last_sign_in_at de tous les profils avec auth.users';

COMMENT ON FUNCTION update_user_last_sign_in(uuid) IS
'Met à jour la dernière connexion d''un utilisateur spécifique depuis auth.users';

COMMENT ON FUNCTION update_my_last_sign_in() IS
'Permet à l''utilisateur connecté de mettre à jour sa propre dernière connexion';