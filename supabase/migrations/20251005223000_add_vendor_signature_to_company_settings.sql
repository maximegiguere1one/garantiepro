/*
  # Add Vendor Signature to Company Settings

  1. Changes
    - Add `vendor_signature_url` column to store the company/vendor's signature
    - This signature will be automatically included on all contracts on the vendor side
    - Supports base64 data URLs for embedded signatures

  2. Security
    - Existing RLS policies already protect this table
    - Only users in the organization can view/update their signature
*/

-- Add vendor signature column to company_settings
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'vendor_signature_url'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN vendor_signature_url text;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN company_settings.vendor_signature_url IS 'Base64 data URL or storage URL for the company vendor signature that appears on all contracts';
