/*
  # Add user_id and organization_id to claim_settings

  1. Changes
    - Add user_id column to claim_settings
    - Add organization_id column to claim_settings
    - Create indexes for performance

  2. Security
    - Maintain existing RLS policies
*/

-- Add user_id to claim_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claim_settings' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE claim_settings ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add organization_id to claim_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claim_settings' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE claim_settings ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_claim_settings_user_id ON claim_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_claim_settings_organization_id ON claim_settings(organization_id);
