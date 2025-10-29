/*
  # Ajout des colonnes manquantes pour trailers et warranties

  1. Nouvelles colonnes trailers
    - length (NUMERIC) - Longueur de la remorque en pieds
    - gvwr (INTEGER) - Poids nominal brut du véhicule en livres
    - color (TEXT) - Couleur de la remorque
    
  2. Nouvelles colonnes warranties
    - add_ons (JSONB) - Alias/vue des options sélectionnées
    
  3. Sécurité
    - Les colonnes acceptent NULL par défaut
    - Pas de changement aux politiques RLS existantes
*/

-- Ajouter les colonnes à la table trailers
ALTER TABLE trailers 
ADD COLUMN IF NOT EXISTS length NUMERIC,
ADD COLUMN IF NOT EXISTS gvwr INTEGER,
ADD COLUMN IF NOT EXISTS color TEXT;

-- Créer un index pour améliorer les performances des recherches par couleur
CREATE INDEX IF NOT EXISTS idx_trailers_color ON trailers(color) WHERE color IS NOT NULL;

-- Créer une vue ou trigger pour add_ons comme alias de selected_options
-- Note: PostgreSQL ne supporte pas les colonnes alias directement, 
-- mais on peut créer une colonne générée (PostgreSQL 12+)
-- ou simplement ajouter la colonne et la synchroniser

-- Option: Ajouter add_ons comme colonne qui reflète selected_options
ALTER TABLE warranties 
ADD COLUMN IF NOT EXISTS add_ons JSONB;

-- Créer un trigger pour synchroniser add_ons avec selected_options
CREATE OR REPLACE FUNCTION sync_warranty_add_ons()
RETURNS TRIGGER AS $$
BEGIN
  -- Synchroniser add_ons avec selected_options lors de l'insertion
  IF TG_OP = 'INSERT' THEN
    NEW.add_ons := NEW.selected_options;
  END IF;
  
  -- Synchroniser lors de la mise à jour
  IF TG_OP = 'UPDATE' THEN
    -- Si selected_options change, mettre à jour add_ons
    IF NEW.selected_options IS DISTINCT FROM OLD.selected_options THEN
      NEW.add_ons := NEW.selected_options;
    END IF;
    
    -- Si add_ons change, mettre à jour selected_options
    IF NEW.add_ons IS DISTINCT FROM OLD.add_ons THEN
      NEW.selected_options := NEW.add_ons;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_sync_warranty_add_ons ON warranties;
CREATE TRIGGER trigger_sync_warranty_add_ons
  BEFORE INSERT OR UPDATE ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION sync_warranty_add_ons();

-- Synchroniser les données existantes
UPDATE warranties 
SET add_ons = selected_options 
WHERE add_ons IS NULL AND selected_options IS NOT NULL;

-- Ajouter des commentaires pour documentation
COMMENT ON COLUMN trailers.length IS 'Longueur de la remorque en pieds';
COMMENT ON COLUMN trailers.gvwr IS 'Poids nominal brut du véhicule (GVWR) en livres';
COMMENT ON COLUMN trailers.color IS 'Couleur de la remorque';
COMMENT ON COLUMN warranties.add_ons IS 'Options additionnelles (synchronisé avec selected_options)';
