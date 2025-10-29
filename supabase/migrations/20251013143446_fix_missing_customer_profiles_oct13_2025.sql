/*
  # Fix Missing Customer Profiles - Création automatique des customers

  ## Problème Résolu
  Les utilisateurs avec role='client' n'ont pas toujours un enregistrement dans
  la table `customers`, causant l'erreur "Aucun profil client trouvé" lors de
  la création de réclamations.

  ## Solution
  1. Ajouter une contrainte UNIQUE sur user_id
  2. Créer les customers manquants pour tous les profiles existants
  3. Installer un trigger pour créer automatiquement les customers futurs
  4. Ajouter une fonction pour créer manuellement un customer si nécessaire

  ## Tables Affectées
  - `customers`: Contrainte UNIQUE ajoutée, insertion des enregistrements manquants
  - `profiles`: Trigger ajouté pour auto-création

  ## Sécurité
  - Fonction SECURITY DEFINER pour permettre la création
  - Contrainte UNIQUE pour éviter les doublons
  - Trigger limité au role 'client' uniquement
*/

-- Ajouter une contrainte UNIQUE sur user_id si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'customers_user_id_key'
  ) THEN
    ALTER TABLE customers ADD CONSTRAINT customers_user_id_key UNIQUE (user_id);
    RAISE NOTICE 'Contrainte UNIQUE ajoutée sur customers.user_id';
  END IF;
END $$;

-- Fonction pour créer un customer à partir d'un profile
CREATE OR REPLACE FUNCTION create_customer_from_profile(profile_id uuid)
RETURNS uuid AS $$
DECLARE
  new_customer_id uuid;
  profile_rec record;
BEGIN
  -- Vérifier si le customer existe déjà
  SELECT id INTO new_customer_id
  FROM customers
  WHERE user_id = profile_id;

  IF FOUND THEN
    RETURN new_customer_id;
  END IF;

  -- Récupérer les infos du profile
  SELECT * INTO profile_rec
  FROM profiles
  WHERE id = profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile non trouvé: %', profile_id;
  END IF;

  -- Créer le customer avec des valeurs par défaut
  INSERT INTO customers (
    user_id,
    first_name,
    last_name,
    email,
    phone,
    address,
    city,
    province,
    postal_code,
    organization_id
  )
  VALUES (
    profile_rec.id,
    COALESCE(SPLIT_PART(profile_rec.email, '@', 1), 'Client'),
    'Client',
    profile_rec.email,
    '',  -- phone par défaut vide
    '',  -- address par défaut vide
    '',  -- city par défaut vide
    'QC',  -- province par défaut
    '',  -- postal_code par défaut vide
    profile_rec.organization_id
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    organization_id = EXCLUDED.organization_id
  RETURNING id INTO new_customer_id;

  RETURN new_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION create_customer_from_profile TO authenticated;

COMMENT ON FUNCTION create_customer_from_profile IS 
  'Crée un enregistrement customer à partir d''un profile existant. Retourne l''ID du customer créé ou existant.';

-- Fonction trigger pour créer automatiquement les customers
CREATE OR REPLACE FUNCTION auto_create_customer_from_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Créer un customer seulement pour les rôles 'client'
  IF NEW.role = 'client' THEN
    INSERT INTO customers (
      user_id,
      first_name,
      last_name,
      email,
      phone,
      address,
      city,
      province,
      postal_code,
      organization_id
    )
    VALUES (
      NEW.id,
      COALESCE(SPLIT_PART(NEW.email, '@', 1), 'Client'),
      'Client',
      NEW.email,
      '',
      '',
      '',
      'QC',
      '',
      NEW.organization_id
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_auto_create_customer ON profiles;
CREATE TRIGGER trigger_auto_create_customer
  AFTER INSERT OR UPDATE ON profiles
  FOR EACH ROW
  WHEN (NEW.role = 'client')
  EXECUTE FUNCTION auto_create_customer_from_profile();

COMMENT ON TRIGGER trigger_auto_create_customer ON profiles IS
  'Crée automatiquement un enregistrement customer lors de la création ou modification d''un profile avec role=client';

-- Créer les customers manquants pour tous les profiles existants
INSERT INTO customers (
  user_id,
  first_name,
  last_name,
  email,
  phone,
  address,
  city,
  province,
  postal_code,
  organization_id
)
SELECT
  p.id,
  COALESCE(SPLIT_PART(p.email, '@', 1), 'Client') as first_name,
  'Client' as last_name,
  p.email,
  '' as phone,
  '' as address,
  '' as city,
  'QC' as province,
  '' as postal_code,
  p.organization_id
FROM profiles p
LEFT JOIN customers c ON c.user_id = p.id
WHERE c.id IS NULL
  AND p.role = 'client'
ON CONFLICT (user_id) DO NOTHING;

-- Afficher un résumé
DO $$
DECLARE
  total_profiles int;
  total_customers int;
  missing_customers int;
BEGIN
  SELECT COUNT(*) INTO total_profiles FROM profiles WHERE role = 'client';
  SELECT COUNT(*) INTO total_customers FROM customers;
  SELECT COUNT(*) INTO missing_customers 
  FROM profiles p 
  LEFT JOIN customers c ON c.user_id = p.id 
  WHERE p.role = 'client' AND c.id IS NULL;

  RAISE NOTICE '╔═══════════════════════════════════════════════════╗';
  RAISE NOTICE '║  MIGRATION: Fix Missing Customer Profiles        ║';
  RAISE NOTICE '╠═══════════════════════════════════════════════════╣';
  RAISE NOTICE '║  Total profiles (client): %                       ║', LPAD(total_profiles::text, 26);
  RAISE NOTICE '║  Total customers: %                               ║', LPAD(total_customers::text, 34);
  RAISE NOTICE '║  Customers manquants: %                           ║', LPAD(missing_customers::text, 30);
  RAISE NOTICE '╚═══════════════════════════════════════════════════╝';
  
  IF missing_customers > 0 THEN
    RAISE WARNING 'Il reste % profiles sans customer', missing_customers;
  ELSE
    RAISE NOTICE '✓ Tous les profiles ont maintenant un customer!';
  END IF;
END $$;
