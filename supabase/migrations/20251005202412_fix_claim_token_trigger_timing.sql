/*
  # Correction du trigger de création de token de réclamation

  ## Problème
  Le trigger `trigger_create_claim_token` était défini comme `BEFORE INSERT`, 
  ce qui causait une violation de la contrainte de clé étrangère car il essayait 
  d'insérer dans `warranty_claim_tokens` avant que la garantie n'existe dans la table.

  ## Solution
  1. Supprimer l'ancien trigger BEFORE INSERT
  2. Créer un nouveau trigger AFTER INSERT qui s'exécute après l'insertion de la garantie
  3. Ajuster la fonction pour ne plus modifier NEW.claim_submission_url dans le trigger
     (on utilisera un UPDATE séparé à la place)

  ## Changements
  - Modification du trigger: BEFORE INSERT → AFTER INSERT
  - La fonction ne modifie plus NEW, elle fait un UPDATE après l'insertion
*/

-- Supprimer l'ancien trigger
DROP TRIGGER IF EXISTS trigger_create_claim_token ON warranties;

-- Recréer la fonction pour qu'elle fonctionne en AFTER INSERT
CREATE OR REPLACE FUNCTION create_claim_token_for_warranty()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_token text;
BEGIN
  -- Only create token for active warranties
  IF NEW.status = 'active' THEN
    -- Generate unique token
    new_token := generate_claim_token();
    
    -- Insert token record
    INSERT INTO warranty_claim_tokens (
      warranty_id,
      token,
      expires_at
    ) VALUES (
      NEW.id,
      new_token,
      NEW.end_date::timestamptz
    );
    
    -- Update warranty with claim submission URL
    UPDATE warranties
    SET claim_submission_url = '/claim/submit/' || new_token
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le nouveau trigger AFTER INSERT
CREATE TRIGGER trigger_create_claim_token
  AFTER INSERT ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION create_claim_token_for_warranty();