/*
  # Create Email Templates Table
  
  ## Summary
  Creates a table for storing customizable email templates used throughout the system.
  Each organization can have their own set of email templates for warranty and claim notifications.
  
  ## New Tables
  
  ### `email_templates`
  - `id` (uuid, primary key) - Unique identifier
  - `organization_id` (uuid, required) - Organization owning this template
  - `template_name` (text, required) - Human-readable name
  - `template_type` (text, required) - Type of template (warranty_created, claim_submitted, etc)
  - `subject` (text, required) - Email subject line with variable placeholders
  - `body` (text, required) - Email body content with variable placeholders
  - `variables` (text[], default []) - List of variables used in this template
  - `is_active` (boolean, default true) - Whether template is currently in use
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ## Security
  - RLS enabled for organization isolation
  - Only authenticated users in the organization can view/manage templates
*/

-- Drop table if exists to start fresh
DROP TABLE IF EXISTS email_templates CASCADE;

-- Create email_templates table
CREATE TABLE email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  template_type text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  variables text[] DEFAULT ARRAY[]::text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add check constraint for valid template types
ALTER TABLE email_templates 
  ADD CONSTRAINT email_templates_type_check 
  CHECK (template_type IN ('warranty_created', 'claim_submitted', 'claim_approved', 'claim_rejected', 'custom'));

-- Create index for faster lookups
CREATE INDEX idx_email_templates_organization_id 
  ON email_templates(organization_id);

CREATE INDEX idx_email_templates_type_active 
  ON email_templates(template_type, is_active) 
  WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their org email templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert their org email templates"
  ON email_templates FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their org email templates"
  ON email_templates FOR UPDATE
  TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete their org email templates"
  ON email_templates FOR DELETE
  TO authenticated
  USING (organization_id = get_user_organization_id());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_email_templates_updated_at();
