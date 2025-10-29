/*
  # Correction du Trigger de Validation de Profil

  1. Problème
    - Le trigger vérifie NEW.email qui n'existe pas dans la table profiles
    - Il faut vérifier l'email depuis auth.users

  2. Solution
    - Récupérer l'email depuis auth.users en utilisant NEW.id
    - Puis vérifier l'invitation avec cet email
*/

-- Recréer la fonction de validation avec la bonne logique
CREATE OR REPLACE FUNCTION validate_profile_creation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  valid_invitation RECORD;
  user_email TEXT;
BEGIN
  -- Si le rôle est 'admin', vérifier qu'il y a une invitation valide
  IF NEW.role = 'admin' THEN
    -- Récupérer l'email de l'utilisateur depuis auth.users
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = NEW.id;
    
    -- Chercher une invitation valide pour cet email
    SELECT * INTO valid_invitation
    FROM franchisee_invitations
    WHERE email = user_email
      AND status = 'pending'
      AND expires_at > NOW();
    
    -- Si aucune invitation valide, bloquer la création
    IF valid_invitation IS NULL THEN
      RAISE EXCEPTION 'Création de compte admin non autorisée. Une invitation valide est requise.';
    END IF;
    
    -- Marquer l'invitation comme acceptée
    UPDATE franchisee_invitations
    SET 
      status = 'accepted',
      accepted_at = NOW()
    WHERE id = valid_invitation.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Commenter pour documentation
COMMENT ON FUNCTION validate_profile_creation() IS 
  'Valide la création de profils - Bloque la création de comptes admin sans invitation valide. Utilise auth.users pour récupérer l''email.';
