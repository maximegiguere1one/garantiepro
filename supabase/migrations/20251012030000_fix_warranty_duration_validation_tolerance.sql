/*
  # Correctif - Validation de durée de garantie avec tolérance

  ## Modifications

  1. Modification du trigger `validate_warranty_duration` pour:
     - Ajouter une tolérance de 1 mois dans le calcul
     - Auto-corriger la durée si elle est proche mais pas exacte
     - Améliorer les messages d'erreur avec plus de détails
     - Gérer les cas limites (mois incomplets, années bissextiles)

  2. Raison du changement:
     - Le calcul PostgreSQL AGE() peut différer légèrement des calculs JavaScript
     - La garantie PPR est toujours de 72 mois (6 ans)
     - Besoin de flexibilité pour les dates de début/fin qui tombent à des jours différents

  ## Sécurité
  - Maintien de la validation de cohérence
  - Auto-correction plutôt que rejet pour meilleure UX
  - Logs détaillés pour debugging
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_validate_warranty_duration ON warranties;
DROP FUNCTION IF EXISTS validate_warranty_duration();

-- Create improved validation function with tolerance
CREATE OR REPLACE FUNCTION validate_warranty_duration()
RETURNS TRIGGER AS $$
DECLARE
  calculated_months INTEGER;
  month_difference INTEGER;
BEGIN
  -- Calculate expected duration in months using AGE function
  calculated_months := (
    EXTRACT(YEAR FROM AGE(NEW.end_date, NEW.start_date)) * 12 +
    EXTRACT(MONTH FROM AGE(NEW.end_date, NEW.start_date))
  )::INTEGER;

  -- Calculate absolute difference
  month_difference := ABS(NEW.duration_months - calculated_months);

  -- STRATÉGIE: Auto-corriger si différence <= 1 mois (tolérance pour calculs)
  IF month_difference = 1 THEN
    -- Auto-correction: utiliser la durée calculée
    NEW.duration_months := calculated_months;

    -- Log pour debugging (visible dans les logs Supabase)
    RAISE NOTICE 'Auto-corrected duration_months from % to % for warranty (% to %)',
      NEW.duration_months, calculated_months, NEW.start_date, NEW.end_date;

    RETURN NEW;
  END IF;

  -- Si différence > 1 mois, c'est une erreur réelle
  IF month_difference > 1 THEN
    RAISE EXCEPTION 'duration_months (%) does not match date range (% to %): calculated=% months, difference=% months',
      NEW.duration_months,
      NEW.start_date,
      NEW.end_date,
      calculated_months,
      month_difference
    USING HINT = 'La garantie PPR est toujours de 72 mois (6 ans). Vérifiez que start_date et end_date sont séparés de 6 ans.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER trigger_validate_warranty_duration
  BEFORE INSERT OR UPDATE ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION validate_warranty_duration();

-- Add comment for documentation
COMMENT ON FUNCTION validate_warranty_duration() IS
'Valide que duration_months correspond aux dates avec tolérance de 1 mois. Auto-corrige les petites différences.';
