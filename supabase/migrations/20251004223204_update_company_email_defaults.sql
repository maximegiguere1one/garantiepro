/*
  # Update Company Email Defaults

  ## Summary
  This migration updates the default email configuration to use the verified domain
  info@locationproremorque.ca instead of the generic onboarding@resend.dev

  ## Changes Made
  1. Update company_settings default email
  2. Update notification_settings default email
  3. Update notification templates to use the correct from address
  4. Set company name to "Location Pro-Remorque"

  ## Domain
  Verified domain: info.locationproremorque.ca
  From email: info@info.locationproremorque.ca
  Company name: Location Pro-Remorque
*/

-- =====================================================
-- 1. Update existing company_settings records
-- =====================================================

UPDATE company_settings
SET 
  company_name = COALESCE(NULLIF(company_name, 'Mon Entreprise'), 'Location Pro-Remorque'),
  email = CASE
    WHEN email = '' OR email IS NULL THEN 'info@info.locationproremorque.ca'
    ELSE email
  END,
  contact_email = CASE
    WHEN contact_email = '' OR contact_email IS NULL THEN 'info@info.locationproremorque.ca'
    ELSE contact_email
  END
WHERE company_name = 'Mon Entreprise' 
   OR company_name = 'Gestion de Garanties'
   OR email = ''
   OR email IS NULL;

-- =====================================================
-- 2. Update notification_settings default email
-- =====================================================

UPDATE notification_settings
SET notification_email = 'info@info.locationproremorque.ca'
WHERE notification_email = '' OR notification_email IS NULL;

-- =====================================================
-- 3. Update notification templates with company name
-- =====================================================

UPDATE notification_templates
SET 
  body_fr = REPLACE(body_fr, '{{company_name}}', 'Location Pro-Remorque'),
  body_en = REPLACE(body_en, '{{company_name}}', 'Location Pro-Remorque')
WHERE body_fr LIKE '%{{company_name}}%'
   OR body_en LIKE '%{{company_name}}%';

-- =====================================================
-- 4. Update the default template for new records
-- =====================================================

-- This will affect future inserts via the trigger
UPDATE notification_templates
SET 
  body_fr = REPLACE(REPLACE(body_fr, 'Gestion de Garanties', 'Location Pro-Remorque'), 'Pro-Remorque', 'Location Pro-Remorque'),
  body_en = REPLACE(REPLACE(body_en, 'Warranty Management', 'Location Pro-Remorque'), 'Pro-Remorque', 'Location Pro-Remorque')
WHERE template_name IN ('welcome_email', 'claim_submitted');

-- =====================================================
-- 5. Update the initialization function for new dealers
-- =====================================================

CREATE OR REPLACE FUNCTION initialize_dealer_settings()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IN ('admin', 'f_and_i', 'operations') THEN
    
    INSERT INTO tax_settings (
      dealer_id, gst_rate, qst_rate, pst_rate, hst_rate,
      apply_gst, apply_qst, apply_pst, apply_hst,
      tax_number_gst, tax_number_qst
    ) VALUES (
      NEW.id, 5.0, 9.975, 0, 0,
      true, true, false, false, '', ''
    )
    ON CONFLICT (dealer_id) DO NOTHING;

    INSERT INTO pricing_settings (
      dealer_id, default_margin_percentage, minimum_warranty_price,
      maximum_warranty_price, price_rounding_method, price_rounding_to,
      apply_volume_discounts, volume_discount_threshold, volume_discount_percentage
    ) VALUES (
      NEW.id, 20.0, 50.0, 10000.0,
      'nearest', 0.99, false, 10, 5.0
    )
    ON CONFLICT (dealer_id) DO NOTHING;

    INSERT INTO notification_settings (
      dealer_id, email_notifications, sms_notifications,
      notify_new_warranty, notify_warranty_expiring,
      notify_claim_submitted, notify_claim_approved, notify_claim_rejected,
      expiring_warranty_days, notification_email, notification_phone
    ) VALUES (
      NEW.id, true, false,
      true, true, true, true, true,
      30, 'info@info.locationproremorque.ca', ''
    )
    ON CONFLICT (dealer_id) DO NOTHING;

    INSERT INTO company_settings (
      dealer_id, company_name, address, city, province, postal_code,
      phone, email, website, logo_url, tax_number,
      primary_color, secondary_color
    ) VALUES (
      NEW.id, 'Location Pro-Remorque', '', '', 'QC', '',
      '', 'info@info.locationproremorque.ca', '', '', '',
      '#0f172a', '#3b82f6'
    )
    ON CONFLICT (dealer_id) DO NOTHING;

    INSERT INTO claim_settings (
      dealer_id, sla_hours, auto_approval_threshold,
      require_supervisor_approval_above, auto_approve_under_amount,
      require_manager_approval, manager_approval_threshold,
      allow_partial_approvals, max_claim_processing_days,
      require_photo_evidence, require_receipt,
      email_customer_on_status_change, exclusion_keywords, workflow_steps
    ) VALUES (
      NEW.id, 48, 500, 2000, 100,
      true, 500, true, 14,
      true, false, true, '[]'::jsonb, '[]'::jsonb
    )
    ON CONFLICT (dealer_id) DO NOTHING;

  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error initializing dealer settings: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. Create a function to get company email settings
-- =====================================================

CREATE OR REPLACE FUNCTION get_company_email_info()
RETURNS TABLE (
  from_email text,
  from_name text,
  reply_to text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(cs.email, 'info@info.locationproremorque.ca') as from_email,
    COALESCE(cs.company_name, 'Location Pro-Remorque') as from_name,
    COALESCE(cs.contact_email, cs.email, 'info@info.locationproremorque.ca') as reply_to
  FROM company_settings cs
  WHERE cs.dealer_id = auth.uid()
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      'info@info.locationproremorque.ca'::text as from_email,
      'Location Pro-Remorque'::text as from_name,
      'info@info.locationproremorque.ca'::text as reply_to;
  END IF;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_company_email_info() TO authenticated;
