/*
  # Add tax_number column to company_settings table

  1. Changes
    - Add `tax_number` column to `company_settings` table
      - Type: text (optional)
      - Used for company tax identification number
    
  2. Security
    - No RLS changes needed - existing policies already cover all columns
*/

-- Add tax_number column to company_settings table
ALTER TABLE company_settings 
ADD COLUMN IF NOT EXISTS tax_number text;

-- Add comment for documentation
COMMENT ON COLUMN company_settings.tax_number IS 'Company tax identification number (TPS/TVQ)';
