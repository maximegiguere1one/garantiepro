/*
  # Add province_code to tax_settings

  1. Changes
    - Add `province_code` column to `tax_settings` table
    - Default to 'QC' (Quebec) for existing rows

  2. Notes
    - This allows saving and loading the selected province
    - Fixes the issue where province selection was not persisting
*/

-- Add province_code column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tax_settings' AND column_name = 'province_code'
  ) THEN
    ALTER TABLE tax_settings ADD COLUMN province_code text DEFAULT 'QC';
  END IF;
END $$;

-- Update existing rows without province_code to default 'QC'
UPDATE tax_settings
SET province_code = 'QC'
WHERE province_code IS NULL;
