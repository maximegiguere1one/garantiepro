/*
  # Ajout des colonnes pour la Garantie Prolongée PPR

  ## Modifications

  ### Table `warranties`
  - Ajout de colonnes pour gérer les règles spécifiques PPR:
    - `franchise_amount` - Franchise de 100$ par réclamation
    - `annual_claim_limit` - Limite annuelle selon valeur d'achat (1000$ à 4000$)
    - `total_claimed_current_year` - Montant réclamé cette année
    - `warranty_year` - Année de garantie en cours (1 à 6)
    - `is_promotional_purchase` - Si achat en promotion (affecte fidélité)
    - `entretien_annuel_completed_years` - Années où entretien a été fait
    - `last_entretien_date` - Date du dernier entretien
    - `next_entretien_due` - Date du prochain entretien dû

  ### Table `trailers`
  - Ajout de colonnes pour info remorque et garantie:
    - `category` - Catégorie: fermée, ouverte, utilitaire
    - `manufacturer_warranty_end_date` - Fin garantie fabricant
    - `ppr_warranty_start_date` - Début garantie PPR

  ### Table `claims`
  - Ajout de colonnes pour validation PPR:
    - `franchise_applied` - Montant de franchise appliqué (100$)
    - `is_entretien_up_to_date` - Si entretien est à jour
    - `is_within_annual_limit` - Si dans limite annuelle
    - `exclusion_reasons` - Liste des exclusions applicables
    - `estimated_repair_cost` - Coût estimé de réparation
    - `towing_assistance_amount` - Montant assistance remorquage (max 100$)
    - `claim_type` - Type: freins, structure, electrique, autre
    - `warranty_year_at_claim` - Année de garantie au moment de la réclamation
*/

-- Table warranties - Colonnes PPR
DO $$
BEGIN
  -- Franchise
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warranties' AND column_name = 'franchise_amount'
  ) THEN
    ALTER TABLE warranties ADD COLUMN franchise_amount NUMERIC DEFAULT 100;
  END IF;

  -- Limite annuelle
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warranties' AND column_name = 'annual_claim_limit'
  ) THEN
    ALTER TABLE warranties ADD COLUMN annual_claim_limit NUMERIC DEFAULT 1000;
  END IF;

  -- Total réclamé année en cours
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warranties' AND column_name = 'total_claimed_current_year'
  ) THEN
    ALTER TABLE warranties ADD COLUMN total_claimed_current_year NUMERIC DEFAULT 0;
  END IF;

  -- Année de garantie
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warranties' AND column_name = 'warranty_year'
  ) THEN
    ALTER TABLE warranties ADD COLUMN warranty_year INTEGER DEFAULT 1 CHECK (warranty_year >= 1 AND warranty_year <= 6);
  END IF;

  -- Achat promotionnel
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warranties' AND column_name = 'is_promotional_purchase'
  ) THEN
    ALTER TABLE warranties ADD COLUMN is_promotional_purchase BOOLEAN DEFAULT false;
  END IF;

  -- Années entretien complétées
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warranties' AND column_name = 'entretien_annuel_completed_years'
  ) THEN
    ALTER TABLE warranties ADD COLUMN entretien_annuel_completed_years INTEGER[] DEFAULT '{}';
  END IF;

  -- Dernière date entretien
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warranties' AND column_name = 'last_entretien_date'
  ) THEN
    ALTER TABLE warranties ADD COLUMN last_entretien_date DATE;
  END IF;

  -- Prochain entretien dû
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warranties' AND column_name = 'next_entretien_due'
  ) THEN
    ALTER TABLE warranties ADD COLUMN next_entretien_due DATE;
  END IF;
END $$;

-- Table trailers - Colonnes PPR
DO $$
BEGIN
  -- Catégorie
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trailers' AND column_name = 'category'
  ) THEN
    ALTER TABLE trailers ADD COLUMN category TEXT DEFAULT 'fermee' CHECK (category IN ('fermee', 'ouverte', 'utilitaire'));
  END IF;

  -- Fin garantie fabricant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trailers' AND column_name = 'manufacturer_warranty_end_date'
  ) THEN
    ALTER TABLE trailers ADD COLUMN manufacturer_warranty_end_date DATE;
  END IF;

  -- Début garantie PPR
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trailers' AND column_name = 'ppr_warranty_start_date'
  ) THEN
    ALTER TABLE trailers ADD COLUMN ppr_warranty_start_date DATE;
  END IF;
END $$;

-- Table claims - Colonnes PPR
DO $$
BEGIN
  -- Franchise appliquée
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'claims' AND column_name = 'franchise_applied'
  ) THEN
    ALTER TABLE claims ADD COLUMN franchise_applied NUMERIC DEFAULT 100;
  END IF;

  -- Entretien à jour
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'claims' AND column_name = 'is_entretien_up_to_date'
  ) THEN
    ALTER TABLE claims ADD COLUMN is_entretien_up_to_date BOOLEAN;
  END IF;

  -- Dans limite annuelle
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'claims' AND column_name = 'is_within_annual_limit'
  ) THEN
    ALTER TABLE claims ADD COLUMN is_within_annual_limit BOOLEAN;
  END IF;

  -- Raisons d'exclusion
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'claims' AND column_name = 'exclusion_reasons'
  ) THEN
    ALTER TABLE claims ADD COLUMN exclusion_reasons TEXT[] DEFAULT '{}';
  END IF;

  -- Coût estimé réparation
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'claims' AND column_name = 'estimated_repair_cost'
  ) THEN
    ALTER TABLE claims ADD COLUMN estimated_repair_cost NUMERIC;
  END IF;

  -- Montant assistance remorquage
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'claims' AND column_name = 'towing_assistance_amount'
  ) THEN
    ALTER TABLE claims ADD COLUMN towing_assistance_amount NUMERIC DEFAULT 0;
  END IF;

  -- Type de réclamation
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'claims' AND column_name = 'claim_type'
  ) THEN
    ALTER TABLE claims ADD COLUMN claim_type TEXT CHECK (claim_type IN ('freins', 'structure', 'electrique', 'autre'));
  END IF;

  -- Année de garantie au moment de la réclamation
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'claims' AND column_name = 'warranty_year_at_claim'
  ) THEN
    ALTER TABLE claims ADD COLUMN warranty_year_at_claim INTEGER;
  END IF;
END $$;

-- Créer index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_warranties_next_entretien ON warranties(next_entretien_due) WHERE next_entretien_due IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_claims_type ON claims(claim_type) WHERE claim_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trailers_category ON trailers(category);