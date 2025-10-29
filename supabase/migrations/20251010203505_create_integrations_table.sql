/*
  # Create Integrations Table
  
  ## Summary
  Creates a table for storing third-party integration configurations.
  Each organization can configure integrations with services like QuickBooks, Stripe, Twilio, etc.
  
  ## New Tables
  
  ### `integrations`
  - `id` (uuid, primary key) - Unique identifier
  - `organization_id` (uuid, required) - Organization owning this integration
  - `integration_name` (text, required) - Human-readable name
  - `integration_type` (text, required) - Type of integration
  - `is_enabled` (boolean, default false) - Whether integration is active
  - `config` (jsonb) - Configuration data (API keys, credentials, etc)
  - `last_sync_at` (timestamptz) - Last successful sync timestamp
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ## Security
  - RLS enabled for organization isolation
  - Only authenticated users in the organization can view/manage integrations
  - Config data should be encrypted at rest (handled by Supabase)
*/

-- Create integrations table
CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_name text NOT NULL,
  integration_type text NOT NULL,
  is_enabled boolean DEFAULT false,
  config jsonb DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add check constraint for valid integration types
ALTER TABLE integrations 
  ADD CONSTRAINT integrations_type_check 
  CHECK (integration_type IN ('quickbooks', 'stripe', 'twilio', 'resend', 'custom'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_integrations_organization_id 
  ON integrations(organization_id);

CREATE INDEX IF NOT EXISTS idx_integrations_type_enabled 
  ON integrations(integration_type, is_enabled) 
  WHERE is_enabled = true;

-- Enable Row Level Security
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their org integrations"
  ON integrations FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert their org integrations"
  ON integrations FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their org integrations"
  ON integrations FOR UPDATE
  TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete their org integrations"
  ON integrations FOR DELETE
  TO authenticated
  USING (organization_id = get_user_organization_id());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_integrations_updated_at();
