/*
  # Add user_id to settings tables

  1. Changes
    - Add user_id column to tax_settings
    - Add user_id column to pricing_settings
    - Create indexes for performance

  2. Security
    - Maintain existing RLS policies
*/

-- Add user_id to tax_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tax_settings' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE tax_settings ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add user_id to pricing_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pricing_settings' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE pricing_settings ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tax_settings_user_id ON tax_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_tax_settings_organization_id ON tax_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_pricing_settings_user_id ON pricing_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_pricing_settings_organization_id ON pricing_settings(organization_id);
