/*
  # Add Automatic Settings Initialization

  ## Summary
  This migration creates database triggers and functions to automatically initialize
  default settings for new dealers when they register. This ensures all settings
  pages load correctly without manual setup.

  ## Functions Created

  ### 1. `initialize_dealer_settings()`
  Automatically creates default settings records for a new dealer profile
  - Creates tax_settings with Quebec defaults
  - Creates pricing_settings with standard margins
  - Creates notification_settings with email enabled
  - Creates company_settings with basic info
  - Creates claim_settings with standard thresholds

  ## Triggers Created

  ### 1. `on_profile_created`
  Fires after a new profile is inserted
  - Calls initialize_dealer_settings() function
  - Only triggers for non-client roles (admin, f_and_i, operations)
  - Ensures settings exist before dealer accesses settings pages

  ## Benefits
  - Zero configuration required for new dealers
  - Settings pages never show loading errors
  - Consistent default values across all dealers
  - Automatic setup eliminates manual initialization steps
  - Settings can be customized after initial creation

  ## Important Notes
  - Triggers fire on INSERT only, not UPDATE
  - Only creates settings if they don't already exist
  - Uses sensible defaults appropriate for Quebec market
  - All operations wrapped in exception handling for safety
*/

-- =====================================================
-- Function to initialize all settings for a new dealer
-- =====================================================
CREATE OR REPLACE FUNCTION initialize_dealer_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Only initialize for dealer roles (not clients)
  IF NEW.role IN ('admin', 'f_and_i', 'operations') THEN
    
    -- Initialize tax_settings with Quebec defaults
    INSERT INTO tax_settings (
      dealer_id,
      gst_rate,
      qst_rate,
      pst_rate,
      hst_rate,
      apply_gst,
      apply_qst,
      apply_pst,
      apply_hst,
      tax_number_gst,
      tax_number_qst
    ) VALUES (
      NEW.id,
      5.0,
      9.975,
      0,
      0,
      true,
      true,
      false,
      false,
      '',
      ''
    )
    ON CONFLICT (dealer_id) DO NOTHING;

    -- Initialize pricing_settings with standard margins
    INSERT INTO pricing_settings (
      dealer_id,
      default_margin_percentage,
      minimum_warranty_price,
      maximum_warranty_price,
      price_rounding_method,
      price_rounding_to,
      apply_volume_discounts,
      volume_discount_threshold,
      volume_discount_percentage
    ) VALUES (
      NEW.id,
      20.0,
      50.0,
      10000.0,
      'nearest',
      0.99,
      false,
      10,
      5.0
    )
    ON CONFLICT (dealer_id) DO NOTHING;

    -- Initialize notification_settings with email enabled
    INSERT INTO notification_settings (
      dealer_id,
      email_notifications,
      sms_notifications,
      notify_new_warranty,
      notify_warranty_expiring,
      notify_claim_submitted,
      notify_claim_approved,
      notify_claim_rejected,
      expiring_warranty_days,
      notification_email,
      notification_phone
    ) VALUES (
      NEW.id,
      true,
      false,
      true,
      true,
      true,
      true,
      true,
      30,
      NEW.email,
      ''
    )
    ON CONFLICT (dealer_id) DO NOTHING;

    -- Initialize company_settings with basic info
    INSERT INTO company_settings (
      dealer_id,
      company_name,
      address,
      city,
      province,
      postal_code,
      phone,
      email,
      website,
      logo_url,
      tax_number,
      primary_color,
      secondary_color
    ) VALUES (
      NEW.id,
      'Mon Entreprise',
      '',
      '',
      'QC',
      '',
      '',
      NEW.email,
      '',
      '',
      '',
      '#0f172a',
      '#3b82f6'
    )
    ON CONFLICT (dealer_id) DO NOTHING;

    -- Initialize claim_settings with standard thresholds
    INSERT INTO claim_settings (
      dealer_id,
      sla_hours,
      auto_approval_threshold,
      require_supervisor_approval_above,
      auto_approve_under_amount,
      require_manager_approval,
      manager_approval_threshold,
      allow_partial_approvals,
      max_claim_processing_days,
      require_photo_evidence,
      require_receipt,
      email_customer_on_status_change,
      exclusion_keywords,
      workflow_steps
    ) VALUES (
      NEW.id,
      48,
      500,
      2000,
      100,
      true,
      500,
      true,
      14,
      true,
      false,
      true,
      '[]'::jsonb,
      '[]'::jsonb
    )
    ON CONFLICT (dealer_id) DO NOTHING;

  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the profile creation
    RAISE WARNING 'Error initializing dealer settings: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Trigger to call initialization function on profile creation
-- =====================================================
DROP TRIGGER IF EXISTS on_profile_created_initialize_settings ON profiles;

CREATE TRIGGER on_profile_created_initialize_settings
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION initialize_dealer_settings();

-- =====================================================
-- Backfill settings for existing dealers
-- =====================================================
-- This ensures existing profiles without settings get initialized
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN 
    SELECT id, email, role 
    FROM profiles 
    WHERE role IN ('admin', 'f_and_i', 'operations')
  LOOP
    -- Tax settings
    INSERT INTO tax_settings (dealer_id, gst_rate, qst_rate, apply_gst, apply_qst)
    VALUES (profile_record.id, 5.0, 9.975, true, true)
    ON CONFLICT (dealer_id) DO NOTHING;

    -- Pricing settings
    INSERT INTO pricing_settings (dealer_id, default_margin_percentage, minimum_warranty_price, maximum_warranty_price)
    VALUES (profile_record.id, 20.0, 50.0, 10000.0)
    ON CONFLICT (dealer_id) DO NOTHING;

    -- Notification settings
    INSERT INTO notification_settings (dealer_id, email_notifications, notification_email)
    VALUES (profile_record.id, true, profile_record.email)
    ON CONFLICT (dealer_id) DO NOTHING;

    -- Company settings
    INSERT INTO company_settings (dealer_id, company_name, email, province)
    VALUES (profile_record.id, 'Mon Entreprise', profile_record.email, 'QC')
    ON CONFLICT (dealer_id) DO NOTHING;

    -- Claim settings
    INSERT INTO claim_settings (dealer_id, auto_approve_under_amount, manager_approval_threshold)
    VALUES (profile_record.id, 100, 500)
    ON CONFLICT (dealer_id) DO NOTHING;
  END LOOP;
END $$;
