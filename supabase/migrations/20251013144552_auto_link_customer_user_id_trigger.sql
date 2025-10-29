/*
  # Trigger automatique pour lier customer.user_id au profile
  
  ## Probl\u00e8me R\u00e9solu
  - Les customers cr\u00e9\u00e9s n'avaient pas de user_id
  - Les utilisateurs ne pouvaient pas voir leurs garanties
  - "Aucune garantie active" m\u00eame avec garanties existantes
  
  ## Solution
  1. Trigger BEFORE INSERT sur customers pour auto-assigner user_id
  2. Fonction pour lier les customers existants sans user_id
  3. Recherche par email pour trouver le profile correspondant
  
  ## S\u00e9curit\u00e9
  - Ne modifie que si user_id est NULL
  - Recherche dans la m\u00eame organisation
  - Logs pour audit
*/

-- Fonction pour auto-assigner user_id bas\u00e9 sur l'email
CREATE OR REPLACE FUNCTION auto_assign_customer_user_id()
RETURNS TRIGGER AS $$
DECLARE
  matching_profile_id uuid;
BEGIN
  -- Si user_id est d\u00e9j\u00e0 d\u00e9fini, ne rien faire
  IF NEW.user_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Chercher un profile avec le m\u00eame email dans la m\u00eame organisation
  SELECT id INTO matching_profile_id
  FROM profiles
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email))
    AND organization_id = NEW.organization_id
  LIMIT 1;
  
  -- Si un profile correspondant est trouv\u00e9, assigner le user_id
  IF matching_profile_id IS NOT NULL THEN
    NEW.user_id := matching_profile_id;
    RAISE NOTICE '[auto_assign_customer_user_id] Linked customer % to user %', NEW.email, matching_profile_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Cr\u00e9er le trigger
DROP TRIGGER IF EXISTS trigger_auto_assign_customer_user_id ON customers;
CREATE TRIGGER trigger_auto_assign_customer_user_id
  BEFORE INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_customer_user_id();

-- Lier les customers existants qui n'ont pas de user_id
DO $$
DECLARE
  customer_rec record;
  profile_user_id uuid;
  updated_count int := 0;
BEGIN
  RAISE NOTICE '=== LIAISON DES CUSTOMERS EXISTANTS ===';
  
  FOR customer_rec IN (
    SELECT id, email, organization_id
    FROM customers
    WHERE user_id IS NULL
  )
  LOOP
    -- Chercher le profile correspondant
    SELECT id INTO profile_user_id
    FROM profiles
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(customer_rec.email))
      AND organization_id = customer_rec.organization_id
    LIMIT 1;
    
    -- Si trouv\u00e9, lier
    IF profile_user_id IS NOT NULL THEN
      UPDATE customers
      SET user_id = profile_user_id
      WHERE id = customer_rec.id;
      
      updated_count := updated_count + 1;
      RAISE NOTICE 'Li\u00e9 customer % (%}) au user %', 
        customer_rec.id, customer_rec.email, profile_user_id;
    END IF;
  END LOOP;
  
  RAISE NOTICE '=== Total customers li\u00e9s: % ===', updated_count;
END $$;

-- V\u00e9rification finale
SELECT 
  COUNT(*) as total_customers,
  COUNT(user_id) as customers_with_user_id,
  COUNT(*) - COUNT(user_id) as customers_without_user_id
FROM customers;
