/*
  # Consolidation des Customers Duplicatas - Fix "Aucune Garantie Active"
  
  ## Probl\u00e8me Identifi\u00e9
  - 48 enregistrements customers pour maxime@giguere-influence.com
  - 4 enregistrements customers pour maxime@agence1.com
  - Chaque garantie est li\u00e9e \u00e0 un customer diff\u00e9rent
  - Contrainte UNIQUE sur customers.user_id emp\u00eache liaison multiple
  - R\u00e9sultat: impossible de trouver les garanties quand user se connecte
  
  ## Solution
  1. Pour chaque email en double, garder le customer le plus r\u00e9cent avec garanties
  2. D\u00e9placer toutes les garanties vers ce customer principal
  3. Assigner le user_id au customer principal
  4. Supprimer les customers duplicatas vides
  
  ## S\u00e9curit\u00e9
  - Aucune garantie ne sera supprim\u00e9e
  - Toutes les donn\u00e9es sont pr\u00e9serv\u00e9es
  - Transaction atomique pour \u00e9viter les incoh\u00e9rences
*/

DO $$
DECLARE
  email_to_fix text;
  primary_customer_id uuid;
  profile_user_id uuid;
  duplicate_customer record;
  warranties_moved int := 0;
  customers_deleted int := 0;
BEGIN
  RAISE NOTICE '=== CONSOLIDATION DES CUSTOMERS DUPLICATAS ===';
  RAISE NOTICE '';
  
  -- Parcourir chaque email ayant des duplicatas
  FOR email_to_fix IN (
    SELECT email
    FROM customers
    GROUP BY email
    HAVING COUNT(*) > 1
  )
  LOOP
    RAISE NOTICE 'Traitement de: %', email_to_fix;
    
    -- 1. Trouver le customer principal (le plus r\u00e9cent avec garanties, sinon le plus r\u00e9cent)
    SELECT c.id INTO primary_customer_id
    FROM customers c
    LEFT JOIN warranties w ON w.customer_id = c.id
    WHERE c.email = email_to_fix
    GROUP BY c.id, c.created_at
    ORDER BY COUNT(w.id) DESC, c.created_at DESC
    LIMIT 1;
    
    RAISE NOTICE '  Customer principal: %', primary_customer_id;
    
    -- 2. Trouver le profile correspondant par email
    SELECT id INTO profile_user_id
    FROM profiles
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(email_to_fix))
    LIMIT 1;
    
    IF profile_user_id IS NOT NULL THEN
      RAISE NOTICE '  Profile trouv\u00e9: %', profile_user_id;
      
      -- 3. Assigner le user_id au customer principal
      UPDATE customers
      SET user_id = profile_user_id
      WHERE id = primary_customer_id
        AND user_id IS NULL;
      
      RAISE NOTICE '  user_id assign\u00e9 au customer principal';
    ELSE
      RAISE NOTICE '  Aucun profile trouv\u00e9 pour cet email';
    END IF;
    
    -- 4. D\u00e9placer toutes les garanties des duplicatas vers le customer principal
    FOR duplicate_customer IN (
      SELECT id 
      FROM customers 
      WHERE email = email_to_fix 
        AND id != primary_customer_id
    )
    LOOP
      -- D\u00e9placer les garanties
      UPDATE warranties
      SET customer_id = primary_customer_id
      WHERE customer_id = duplicate_customer.id;
      
      GET DIAGNOSTICS warranties_moved = ROW_COUNT;
      
      IF warranties_moved > 0 THEN
        RAISE NOTICE '    D\u00e9plac\u00e9 % garantie(s) de % vers %', 
          warranties_moved, duplicate_customer.id, primary_customer_id;
      END IF;
    END LOOP;
    
    -- 5. Supprimer les customers duplicatas (maintenant vides)
    DELETE FROM customers
    WHERE email = email_to_fix
      AND id != primary_customer_id;
    
    GET DIAGNOSTICS customers_deleted = ROW_COUNT;
    RAISE NOTICE '  Supprim\u00e9 % customer(s) duplicata(s)', customers_deleted;
    RAISE NOTICE '';
  END LOOP;
  
  RAISE NOTICE '=== CONSOLIDATION TERMIN\u00c9E ===';
  RAISE NOTICE '';
  
  -- Afficher les statistiques finales
  RAISE NOTICE 'Statistiques finales:';
  RAISE NOTICE '  Total customers: %', (SELECT COUNT(*) FROM customers);
  RAISE NOTICE '  Customers avec user_id: %', (SELECT COUNT(*) FROM customers WHERE user_id IS NOT NULL);
  RAISE NOTICE '  Customers sans user_id: %', (SELECT COUNT(*) FROM customers WHERE user_id IS NULL);
  RAISE NOTICE '  Total garanties: %', (SELECT COUNT(*) FROM warranties);
  
END $$;

-- V\u00e9rification finale: afficher la distribution des customers
SELECT 
  email,
  COUNT(*) as customer_count,
  STRING_AGG(id::text, ', ') as customer_ids
FROM customers
GROUP BY email
HAVING COUNT(*) > 1;

-- Si cette requ\u00eate ne retourne rien, c'est bon!
