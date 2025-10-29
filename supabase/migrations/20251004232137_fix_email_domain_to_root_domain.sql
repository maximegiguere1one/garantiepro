/*
  # Fix Email Domain to Root Domain Format

  ## Summary
  This migration corrects all email addresses to use the root domain format:
  FROM: info@info.locationproremorque.ca
  TO: info@locationproremorque.ca

  ## Why This Change
  Resend best practices recommend verifying the root domain (locationproremorque.ca)
  and using standard email addresses like info@locationproremorque.ca.
  The subdomain format (info@info.locationproremorque.ca) is non-standard and causes confusion.

  ## Changes Made
  1. Update all email addresses in company_settings table
  2. Update all email addresses in notification_settings table
  3. Update the get_company_email_info function to use correct defaults
  4. Ensure all future records use the correct domain format

  ## Domain Configuration Required in Resend
  - Verified domain: locationproremorque.ca (root domain)
  - Email format: info@locationproremorque.ca
  - DNS records needed: SPF + DKIM for locationproremorque.ca
*/

-- =====================================================
-- 1. Update existing company_settings email addresses
-- =====================================================

UPDATE company_settings
SET 
  email = REPLACE(email, '@info.locationproremorque.ca', '@locationproremorque.ca'),
  contact_email = REPLACE(contact_email, '@info.locationproremorque.ca', '@locationproremorque.ca')
WHERE 
  email LIKE '%@info.locationproremorque.ca' 
  OR contact_email LIKE '%@info.locationproremorque.ca';

-- =====================================================
-- 2. Update existing notification_settings email addresses
-- =====================================================

UPDATE notification_settings
SET notification_email = REPLACE(notification_email, '@info.locationproremorque.ca', '@locationproremorque.ca')
WHERE notification_email LIKE '%@info.locationproremorque.ca';

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
    COALESCE(cs.email, 'info@locationproremorque.ca') as from_email,
    COALESCE(cs.company_name, 'Location Pro-Remorque') as from_name,
    COALESCE(cs.contact_email, cs.email, 'info@locationproremorque.ca') as reply_to
  FROM company_settings cs
  WHERE cs.dealer_id = auth.uid()
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      'info@locationproremorque.ca'::text as from_email,
      'Location Pro-Remorque'::text as from_name,
      'info@locationproremorque.ca'::text as reply_to;
  END IF;
END;
$$;
