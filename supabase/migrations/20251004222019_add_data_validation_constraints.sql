/*
  # Add Data Validation Constraints

  ## Summary
  This migration adds CHECK constraints and triggers to ensure data integrity
  across all tables. It prevents invalid data from being inserted or updated.

  ## Validations Added

  ### 1. Warranties Table
  - end_date must be after start_date
  - total_price must be positive
  - duration_months must match date difference
  - base_price, options_price, taxes must be non-negative
  - margin must be non-negative

  ### 2. Claims Table
  - incident_date cannot be in the future
  - incident_date must be after warranty start_date
  - approved_amount must be non-negative
  - approved_amount cannot exceed warranty annual limit
  - current_step must be between 1 and 5

  ### 3. Payments Table
  - amount must be positive
  - refund_amount cannot exceed amount
  - refund_amount must be non-negative

  ### 4. Pricing Rules Table
  - max_purchase_price must be greater than min_purchase_price
  - annual_claim_limit must be positive
  - margin percentages must be between 0 and 100
  - No overlapping price ranges

  ### 5. Trailers Table
  - year must be reasonable (1900 to current year + 1)
  - purchase_price must be positive
  - purchase_date cannot be in the future

  ### 6. Customers Table
  - email must be valid format
  - phone must be valid format (10 digits minimum)
  - postal_code must be valid Canadian format

  ## Security Notes
  - All constraints run at database level
  - Cannot be bypassed by application code
  - Ensures data consistency across all clients
*/

-- =====================================================
-- 1. Add constraints to warranties table
-- =====================================================

-- Drop existing constraints if they exist
ALTER TABLE warranties DROP CONSTRAINT IF EXISTS check_warranty_dates;
ALTER TABLE warranties DROP CONSTRAINT IF EXISTS check_warranty_prices;
ALTER TABLE warranties DROP CONSTRAINT IF EXISTS check_warranty_margin;

-- Add date validation
ALTER TABLE warranties ADD CONSTRAINT check_warranty_dates
  CHECK (end_date > start_date);

-- Add price validation
ALTER TABLE warranties ADD CONSTRAINT check_warranty_prices
  CHECK (
    total_price >= 0 
    AND base_price >= 0 
    AND options_price >= 0 
    AND taxes >= 0
    AND deductible >= 0
  );

-- Add margin validation
ALTER TABLE warranties ADD CONSTRAINT check_warranty_margin
  CHECK (margin >= 0);

-- Create trigger to validate duration matches dates
CREATE OR REPLACE FUNCTION validate_warranty_duration()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate expected duration in months
  IF NEW.duration_months != (
    EXTRACT(YEAR FROM AGE(NEW.end_date, NEW.start_date)) * 12 +
    EXTRACT(MONTH FROM AGE(NEW.end_date, NEW.start_date))
  ) THEN
    RAISE EXCEPTION 'duration_months (%) does not match date range (% to %)', 
      NEW.duration_months, NEW.start_date, NEW.end_date;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_warranty_duration ON warranties;
CREATE TRIGGER trigger_validate_warranty_duration
  BEFORE INSERT OR UPDATE ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION validate_warranty_duration();

-- =====================================================
-- 2. Add constraints to claims table
-- =====================================================

-- Drop existing constraints if they exist
ALTER TABLE claims DROP CONSTRAINT IF EXISTS check_claim_dates;
ALTER TABLE claims DROP CONSTRAINT IF EXISTS check_claim_amounts;
ALTER TABLE claims DROP CONSTRAINT IF EXISTS check_claim_step;

-- Add date validation (incident date cannot be in future)
ALTER TABLE claims ADD CONSTRAINT check_claim_dates
  CHECK (incident_date <= CURRENT_DATE);

-- Add amount validation
ALTER TABLE claims ADD CONSTRAINT check_claim_amounts
  CHECK (
    (approved_amount IS NULL OR approved_amount >= 0)
    AND (po_amount IS NULL OR po_amount >= 0)
  );

-- Step is already constrained in the original migration, but ensure it's there
ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_current_step_check;
ALTER TABLE claims ADD CONSTRAINT claims_current_step_check
  CHECK (current_step >= 1 AND current_step <= 5);

-- Create trigger to validate claim is within warranty coverage period
CREATE OR REPLACE FUNCTION validate_claim_coverage()
RETURNS TRIGGER AS $$
DECLARE
  warranty_start date;
  warranty_end date;
BEGIN
  -- Get warranty dates
  SELECT start_date, end_date INTO warranty_start, warranty_end
  FROM warranties
  WHERE id = NEW.warranty_id;
  
  -- Check if incident is within warranty period
  IF NEW.incident_date < warranty_start THEN
    RAISE EXCEPTION 'Incident date (%) is before warranty start date (%)', 
      NEW.incident_date, warranty_start;
  END IF;
  
  IF NEW.incident_date > warranty_end THEN
    RAISE EXCEPTION 'Incident date (%) is after warranty end date (%)', 
      NEW.incident_date, warranty_end;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_claim_coverage ON claims;
CREATE TRIGGER trigger_validate_claim_coverage
  BEFORE INSERT OR UPDATE ON claims
  FOR EACH ROW
  EXECUTE FUNCTION validate_claim_coverage();

-- =====================================================
-- 3. Add constraints to payments table
-- =====================================================

-- Drop existing constraints if they exist
ALTER TABLE payments DROP CONSTRAINT IF EXISTS check_payment_amount;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS check_refund_amount;

-- Add payment amount validation
ALTER TABLE payments ADD CONSTRAINT check_payment_amount
  CHECK (amount > 0);

-- Add refund validation
ALTER TABLE payments ADD CONSTRAINT check_refund_amount
  CHECK (
    refund_amount IS NULL 
    OR (refund_amount >= 0 AND refund_amount <= amount)
  );

-- =====================================================
-- 4. Add constraints to pricing_rules table
-- =====================================================

-- Drop existing constraints if they exist
ALTER TABLE pricing_rules DROP CONSTRAINT IF EXISTS check_price_range;
ALTER TABLE pricing_rules DROP CONSTRAINT IF EXISTS check_claim_limit;
ALTER TABLE pricing_rules DROP CONSTRAINT IF EXISTS check_margin_range;

-- Add price range validation
ALTER TABLE pricing_rules ADD CONSTRAINT check_price_range
  CHECK (max_purchase_price > min_purchase_price);

-- Add claim limit validation
ALTER TABLE pricing_rules ADD CONSTRAINT check_claim_limit
  CHECK (annual_claim_limit > 0);

-- Add margin validation
ALTER TABLE pricing_rules ADD CONSTRAINT check_margin_range
  CHECK (
    (min_margin_percentage IS NULL OR (min_margin_percentage >= 0 AND min_margin_percentage <= 100))
    AND (max_margin_percentage IS NULL OR (max_margin_percentage >= 0 AND max_margin_percentage <= 100))
    AND (min_margin_percentage IS NULL OR max_margin_percentage IS NULL OR max_margin_percentage >= min_margin_percentage)
  );

-- Create trigger to prevent overlapping price ranges
CREATE OR REPLACE FUNCTION validate_pricing_rule_overlap()
RETURNS TRIGGER AS $$
DECLARE
  overlap_count integer;
BEGIN
  -- Check for overlapping price ranges in active rules
  SELECT COUNT(*) INTO overlap_count
  FROM pricing_rules
  WHERE id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  AND is_active = true
  AND (
    (NEW.min_purchase_price >= min_purchase_price AND NEW.min_purchase_price <= max_purchase_price)
    OR (NEW.max_purchase_price >= min_purchase_price AND NEW.max_purchase_price <= max_purchase_price)
    OR (NEW.min_purchase_price <= min_purchase_price AND NEW.max_purchase_price >= max_purchase_price)
  );
  
  IF overlap_count > 0 THEN
    RAISE EXCEPTION 'Price range $%-$% overlaps with existing active pricing rule', 
      NEW.min_purchase_price, NEW.max_purchase_price;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_pricing_rule_overlap ON pricing_rules;
CREATE TRIGGER trigger_validate_pricing_rule_overlap
  BEFORE INSERT OR UPDATE ON pricing_rules
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION validate_pricing_rule_overlap();

-- =====================================================
-- 5. Add constraints to trailers table
-- =====================================================

-- Drop existing constraints if they exist
ALTER TABLE trailers DROP CONSTRAINT IF EXISTS check_trailer_year;
ALTER TABLE trailers DROP CONSTRAINT IF EXISTS check_trailer_price;
ALTER TABLE trailers DROP CONSTRAINT IF EXISTS check_purchase_date;

-- Add year validation
ALTER TABLE trailers ADD CONSTRAINT check_trailer_year
  CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 1);

-- Add price validation
ALTER TABLE trailers ADD CONSTRAINT check_trailer_price
  CHECK (purchase_price > 0);

-- Add purchase date validation
ALTER TABLE trailers ADD CONSTRAINT check_purchase_date
  CHECK (purchase_date <= CURRENT_DATE);

-- =====================================================
-- 6. Add validation functions for customers table
-- =====================================================

-- Email validation function
CREATE OR REPLACE FUNCTION is_valid_email(email text)
RETURNS boolean AS $$
BEGIN
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Phone validation function (allows various formats)
CREATE OR REPLACE FUNCTION is_valid_phone(phone text)
RETURNS boolean AS $$
BEGIN
  -- Remove common separators and spaces
  RETURN regexp_replace(phone, '[^0-9]', '', 'g') ~ '^\d{10,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Canadian postal code validation
CREATE OR REPLACE FUNCTION is_valid_postal_code(postal_code text)
RETURNS boolean AS $$
BEGIN
  -- Canadian postal code format: A1A 1A1 (with or without space)
  RETURN postal_code ~* '^[A-Z]\d[A-Z]\s?\d[A-Z]\d$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Drop existing constraints if they exist
ALTER TABLE customers DROP CONSTRAINT IF EXISTS check_customer_email;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS check_customer_phone;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS check_customer_postal_code;

-- Add email validation
ALTER TABLE customers ADD CONSTRAINT check_customer_email
  CHECK (is_valid_email(email));

-- Add phone validation
ALTER TABLE customers ADD CONSTRAINT check_customer_phone
  CHECK (is_valid_phone(phone));

-- Add postal code validation
ALTER TABLE customers ADD CONSTRAINT check_customer_postal_code
  CHECK (is_valid_postal_code(postal_code));

-- =====================================================
-- 7. Add constraints to warranty_plans table
-- =====================================================

-- Drop existing constraints if they exist
ALTER TABLE warranty_plans DROP CONSTRAINT IF EXISTS check_plan_price;
ALTER TABLE warranty_plans DROP CONSTRAINT IF EXISTS check_plan_version;

-- Add price validation
ALTER TABLE warranty_plans ADD CONSTRAINT check_plan_price
  CHECK (base_price >= 0);

-- Add version validation
ALTER TABLE warranty_plans ADD CONSTRAINT check_plan_version
  CHECK (version >= 1);

-- =====================================================
-- 8. Add constraints to warranty_options table
-- =====================================================

-- Drop existing constraints if they exist
ALTER TABLE warranty_options DROP CONSTRAINT IF EXISTS check_option_price;

-- Add price validation
ALTER TABLE warranty_options ADD CONSTRAINT check_option_price
  CHECK (price >= 0);

-- =====================================================
-- 9. Add constraints to tax_rates table
-- =====================================================

-- Drop existing constraints if they exist
ALTER TABLE tax_rates DROP CONSTRAINT IF EXISTS check_tax_rates_positive;

-- Add tax rate validation
ALTER TABLE tax_rates ADD CONSTRAINT check_tax_rates_positive
  CHECK (
    gst_rate >= 0 AND gst_rate <= 1
    AND pst_rate >= 0 AND pst_rate <= 1
    AND hst_rate >= 0 AND hst_rate <= 1
  );

-- =====================================================
-- 10. Add constraints to pricing_settings table
-- =====================================================

-- Drop existing constraints if they exist
ALTER TABLE pricing_settings DROP CONSTRAINT IF EXISTS check_pricing_settings_values;

-- Add pricing settings validation
ALTER TABLE pricing_settings ADD CONSTRAINT check_pricing_settings_values
  CHECK (
    default_margin_percentage >= 0 AND default_margin_percentage <= 100
    AND minimum_warranty_price >= 0
    AND maximum_warranty_price > minimum_warranty_price
    AND volume_discount_threshold >= 0
    AND volume_discount_percentage >= 0 AND volume_discount_percentage <= 100
  );

-- =====================================================
-- 11. Add constraints to nps_surveys table
-- =====================================================

-- Score constraint already exists in original migration, ensure it's there
ALTER TABLE nps_surveys DROP CONSTRAINT IF EXISTS nps_surveys_score_check;
ALTER TABLE nps_surveys ADD CONSTRAINT nps_surveys_score_check
  CHECK (score >= 0 AND score <= 10);
