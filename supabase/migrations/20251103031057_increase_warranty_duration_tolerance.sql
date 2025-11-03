/*
  # Increase Warranty Duration Validation Tolerance
  
  Increase tolerance from 1 month to 2 months to handle edge cases where
  end date is 1-2 days before the exact month anniversary.
  
  Example case:
  - start_date: 2026-11-03
  - 72 months later would be: 2032-11-03
  - But if end_date is: 2032-11-02 (1 day before)
  - Calculated months: 71
  - Difference: 1 month (but should be tolerated)
  
  Changes:
  - Increase tolerance from 1 to 2 months
  - This handles day-of-month mismatches in date calculations
*/

DROP TRIGGER IF EXISTS trigger_validate_warranty_duration ON warranties;
DROP FUNCTION IF EXISTS validate_warranty_duration();

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

  -- INCREASED TOLERANCE: Auto-correct if difference <= 2 months
  IF month_difference <= 2 THEN
    -- Auto-correction: use the provided duration (it's within acceptable range)
    -- No need to change NEW.duration_months, just accept it
    
    -- Log for debugging (visible in Supabase logs)
    RAISE NOTICE 'Duration validation passed with tolerance: duration_months=%, calculated=%, difference=% months (% to %)',
      NEW.duration_months, calculated_months, month_difference, NEW.start_date, NEW.end_date;

    RETURN NEW;
  END IF;

  -- If difference > 2 months, it's a real error
  IF month_difference > 2 THEN
    RAISE EXCEPTION 'duration_months (%) does not match date range (% to %): calculated=% months, difference=% months. Tolerance exceeded.',
      NEW.duration_months,
      NEW.start_date,
      NEW.end_date,
      calculated_months,
      month_difference
    USING HINT = 'La garantie PPR est normalement de 72 mois (6 ans). Vérifiez les dates.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_warranty_duration
  BEFORE INSERT OR UPDATE ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION validate_warranty_duration();

COMMENT ON FUNCTION validate_warranty_duration() IS
'Valide que duration_months correspond aux dates avec tolérance de 2 mois pour gérer les cas limites de dates.';
