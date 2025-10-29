/*
  # Fix Validation Trigger to Allow Organization Migration

  ## Summary
  Modifies the validate_claim_coverage trigger to only run on INSERT or when
  key claim fields change, not when just updating organization_id during migration.
*/

CREATE OR REPLACE FUNCTION validate_claim_coverage()
RETURNS TRIGGER AS $$
DECLARE
  v_warranty_start date;
  v_warranty_end date;
  v_warranty_status text;
BEGIN
  -- Skip validation if only organization_id is being updated (migration scenario)
  IF TG_OP = 'UPDATE' THEN
    IF OLD.incident_date = NEW.incident_date 
       AND OLD.warranty_id = NEW.warranty_id 
       AND OLD.organization_id IS NULL 
       AND NEW.organization_id IS NOT NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Get warranty details
  SELECT start_date, end_date, status
  INTO v_warranty_start, v_warranty_end, v_warranty_status
  FROM warranties
  WHERE id = NEW.warranty_id;

  -- Validate warranty exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Warranty not found';
  END IF;

  -- Validate warranty is active
  IF v_warranty_status != 'active' THEN
    RAISE EXCEPTION 'Warranty must be active to file a claim. Current status: %', v_warranty_status;
  END IF;

  -- Validate incident date is within warranty period
  IF NEW.incident_date < v_warranty_start THEN
    RAISE EXCEPTION 'Incident date (%) is before warranty start date (%)', NEW.incident_date, v_warranty_start;
  END IF;

  IF NEW.incident_date > v_warranty_end THEN
    RAISE EXCEPTION 'Incident date (%) is after warranty end date (%)', NEW.incident_date, v_warranty_end;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
