/*
  # Ajouter toutes les colonnes manquantes aux tables

  1. Modifications aux tables existantes
    - `customers`: Ajouter `dealer_id` pour tracer le vendeur responsable
    - `trailers`: Ajouter `dealer_id`, `category`, `manufacturer_warranty_end_date`, `ppr_warranty_start_date`
    - `company_settings`: Ajouter `company_address`, `company_phone`, `company_email` (alias de contact_*)
    - `warranty_templates`: S'assurer que `dealer_id` existe
    
  2. Sécurité
    - Les colonnes existantes ne sont pas modifiées
    - Utilisation de IF NOT EXISTS pour éviter les erreurs
    - Les valeurs par défaut sont NULL pour compatibilité
*/

-- Ajouter dealer_id à customers (lien vers le vendeur/employé qui a créé le client)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'dealer_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN dealer_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_customers_dealer_id ON customers(dealer_id);
  END IF;
END $$;

-- Ajouter les colonnes manquantes à trailers
DO $$ 
BEGIN
  -- dealer_id: vendeur qui a enregistré la remorque
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trailers' AND column_name = 'dealer_id'
  ) THEN
    ALTER TABLE trailers ADD COLUMN dealer_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_trailers_dealer_id ON trailers(dealer_id);
  END IF;

  -- category: catégorie de remorque (ex: "cargo", "utility", "enclosed", etc.)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trailers' AND column_name = 'category'
  ) THEN
    ALTER TABLE trailers ADD COLUMN category text;
  END IF;

  -- manufacturer_warranty_end_date: fin de garantie fabricant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trailers' AND column_name = 'manufacturer_warranty_end_date'
  ) THEN
    ALTER TABLE trailers ADD COLUMN manufacturer_warranty_end_date date;
  END IF;

  -- ppr_warranty_start_date: début de garantie PPR (souvent = fin garantie fabricant)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trailers' AND column_name = 'ppr_warranty_start_date'
  ) THEN
    ALTER TABLE trailers ADD COLUMN ppr_warranty_start_date date;
  END IF;
END $$;

-- Ajouter les alias de colonnes à company_settings
-- Note: On garde contact_* comme colonnes principales et on crée des vues ou on utilise les mêmes valeurs
DO $$ 
BEGIN
  -- company_address (alias de contact_address)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_settings' AND column_name = 'company_address'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN company_address text;
    -- Copier les valeurs existantes
    UPDATE company_settings SET company_address = contact_address WHERE contact_address IS NOT NULL;
  END IF;

  -- company_phone (alias de contact_phone)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_settings' AND column_name = 'company_phone'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN company_phone text;
    -- Copier les valeurs existantes
    UPDATE company_settings SET company_phone = contact_phone WHERE contact_phone IS NOT NULL;
  END IF;

  -- company_email (alias de contact_email)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_settings' AND column_name = 'company_email'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN company_email text;
    -- Copier les valeurs existantes
    UPDATE company_settings SET company_email = contact_email WHERE contact_email IS NOT NULL;
  END IF;
END $$;

-- Ajouter dealer_id à warranty_templates si pas déjà présent
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warranty_templates' AND column_name = 'dealer_id'
  ) THEN
    ALTER TABLE warranty_templates ADD COLUMN dealer_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_warranty_templates_dealer_id ON warranty_templates(dealer_id);
  END IF;
END $$;

-- Créer un trigger pour synchroniser company_settings (contact_* <-> company_*)
CREATE OR REPLACE FUNCTION sync_company_settings_addresses()
RETURNS TRIGGER AS $$
BEGIN
  -- Si contact_* est mis à jour, copier vers company_*
  IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT' THEN
    IF NEW.contact_address IS DISTINCT FROM OLD.contact_address OR TG_OP = 'INSERT' THEN
      NEW.company_address := NEW.contact_address;
    END IF;
    IF NEW.contact_phone IS DISTINCT FROM OLD.contact_phone OR TG_OP = 'INSERT' THEN
      NEW.company_phone := NEW.contact_phone;
    END IF;
    IF NEW.contact_email IS DISTINCT FROM OLD.contact_email OR TG_OP = 'INSERT' THEN
      NEW.company_email := NEW.contact_email;
    END IF;
    
    -- Si company_* est mis à jour, copier vers contact_*
    IF NEW.company_address IS DISTINCT FROM OLD.company_address OR TG_OP = 'INSERT' THEN
      NEW.contact_address := NEW.company_address;
    END IF;
    IF NEW.company_phone IS DISTINCT FROM OLD.company_phone OR TG_OP = 'INSERT' THEN
      NEW.contact_phone := NEW.company_phone;
    END IF;
    IF NEW.company_email IS DISTINCT FROM OLD.company_email OR TG_OP = 'INSERT' THEN
      NEW.contact_email := NEW.company_email;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_company_settings_trigger ON company_settings;
CREATE TRIGGER sync_company_settings_trigger
  BEFORE INSERT OR UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION sync_company_settings_addresses();

-- Commentaire explicatif
COMMENT ON COLUMN customers.dealer_id IS 'Vendeur/employé qui a créé ce client';
COMMENT ON COLUMN trailers.dealer_id IS 'Vendeur/employé qui a enregistré cette remorque';
COMMENT ON COLUMN trailers.category IS 'Catégorie de remorque (ex: cargo, utility, enclosed)';
COMMENT ON COLUMN trailers.manufacturer_warranty_end_date IS 'Date de fin de la garantie fabricant';
COMMENT ON COLUMN trailers.ppr_warranty_start_date IS 'Date de début de la garantie PPR';
COMMENT ON COLUMN company_settings.company_address IS 'Alias de contact_address - synchronisé automatiquement';
COMMENT ON COLUMN company_settings.company_phone IS 'Alias de contact_phone - synchronisé automatiquement';
COMMENT ON COLUMN company_settings.company_email IS 'Alias de contact_email - synchronisé automatiquement';