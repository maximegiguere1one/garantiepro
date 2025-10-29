/*
  # Create Warranty Transaction Trigger

  ## Summary
  Creates a trigger that automatically records a warranty transaction
  whenever a warranty is created. This transaction is used for billing
  franchisees 50% commission.

  ## Trigger Logic
  - Only creates transaction for franchisee organizations (not owner)
  - Calculates 50% commission automatically
  - Sets initial status as 'pending'
*/

-- =====================================================
-- 1. Create function to record warranty transaction
-- =====================================================

CREATE OR REPLACE FUNCTION record_warranty_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_org_type text;
  v_commission_rate numeric(5,2);
BEGIN
  -- Get organization type
  SELECT o.type INTO v_org_type
  FROM organizations o
  WHERE o.id = NEW.organization_id;

  -- Only create transaction for franchisee organizations
  IF v_org_type = 'franchisee' THEN
    -- Get commission rate from billing config
    SELECT percentage_rate INTO v_commission_rate
    FROM organization_billing_config
    WHERE organization_id = NEW.organization_id
    AND is_active = true;

    -- Default to 50% if no config found
    IF v_commission_rate IS NULL THEN
      v_commission_rate := 50.0;
    END IF;

    -- Insert warranty transaction
    INSERT INTO warranty_transactions (
      warranty_id,
      organization_id,
      warranty_total_price,
      commission_percentage,
      commission_amount,
      transaction_date,
      billing_status
    ) VALUES (
      NEW.id,
      NEW.organization_id,
      NEW.total_price,
      v_commission_rate,
      (NEW.total_price * v_commission_rate / 100),
      NEW.created_at,
      'pending'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. Create trigger on warranties table
-- =====================================================

DROP TRIGGER IF EXISTS record_warranty_transaction_trigger ON warranties;

CREATE TRIGGER record_warranty_transaction_trigger
  AFTER INSERT ON warranties
  FOR EACH ROW
  WHEN (NEW.status = 'active' OR NEW.status = 'draft')
  EXECUTE FUNCTION record_warranty_transaction();
