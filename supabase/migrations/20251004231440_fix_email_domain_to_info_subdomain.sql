/*
  # Fix Email Domain Configuration
  
  ## Summary
  This migration corrects all email addresses from info@locationproremorque.ca 
  to info@info.locationproremorque.ca to match the verified Resend domain.
  
  ## Changes Made
  1. Update all existing email addresses in company_settings
  2. Update all existing email addresses in notification_settings
  3. Ensure future records use the correct domain
  
  ## Domain Configuration
  Verified domain in Resend: info.locationproremorque.ca
  Correct email format: info@info.locationproremorque.ca
*/

-- =====================================================
-- 1. Update existing company_settings email addresses
-- =====================================================

UPDATE company_settings
SET 
  email = REPLACE(email, 'info@locationproremorque.ca', 'info@info.locationproremorque.ca'),
  contact_email = REPLACE(contact_email, 'info@locationproremorque.ca', 'info@info.locationproremorque.ca')
WHERE 
  email LIKE '%@locationproremorque.ca' 
  OR contact_email LIKE '%@locationproremorque.ca';

-- =====================================================
-- 2. Update existing notification_settings email addresses
-- =====================================================

UPDATE notification_settings
SET notification_email = REPLACE(notification_email, 'info@locationproremorque.ca', 'info@info.locationproremorque.ca')
WHERE notification_email LIKE '%@locationproremorque.ca';

-- =====================================================
-- 3. Update the get_company_email_info function
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