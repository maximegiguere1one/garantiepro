/*
  # Sécurité de la Création de Comptes Admin

  1. Sécurité
    - Bloque la création de profils avec rôle 'admin' non autorisée
    - Seuls les profils créés via invitation peuvent être admin
    - Ajoute un trigger de validation avant insertion
    - Protection contre les attaques par escalade de privilèges

  2. Changements
    - Crée une fonction de validation `validate_profile_creation`
    - Ajoute un trigger `before_profile_insert_security`
    - Vérifie qu'une invitation valide existe pour les nouveaux admins
    - Empêche la création directe de comptes admin

  3. Exceptions
    - Les invitations valides permettent la création d'admin
    - Les comptes non-admin peuvent être créés normalement (pour futurs clients)
*/

-- Fonction de validation de création de profil
CREATE OR REPLACE FUNCTION validate_profile_creation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  valid_invitation RECORD;
BEGIN
  -- Si le rôle est 'admin', vérifier qu'il y a une invitation valide
  IF NEW.role = 'admin' THEN
    -- Chercher une invitation valide pour cet email
    SELECT * INTO valid_invitation
    FROM franchisee_invitations
    WHERE email = NEW.email
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

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS before_profile_insert_security ON profiles;

-- Créer le nouveau trigger de sécurité
CREATE TRIGGER before_profile_insert_security
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_profile_creation();

-- Ajouter une RLS policy stricte sur profiles
-- Empêcher l'insertion directe de profils admin
DROP POLICY IF EXISTS "Prevent unauthorized admin creation" ON profiles;

CREATE POLICY "Prevent unauthorized admin creation"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Permettre seulement si ce n'est PAS un admin
    -- OU si c'est via le trigger (qui a déjà validé l'invitation)
    role != 'admin'
  );

-- S'assurer que seuls les admins peuvent voir les invitations
DROP POLICY IF EXISTS "Only admins can manage invitations" ON franchisee_invitations;

CREATE POLICY "Only admins can manage invitations"
  ON franchisee_invitations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Commenter pour documentation
COMMENT ON FUNCTION validate_profile_creation() IS 
  'Valide la création de profils - Bloque la création de comptes admin sans invitation valide';

COMMENT ON TRIGGER before_profile_insert_security ON profiles IS
  'Trigger de sécurité empêchant la création non autorisée de comptes admin';
