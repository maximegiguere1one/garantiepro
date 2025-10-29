/*
  # Add Comprehensive Settings System

  ## Overview
  This migration creates a complete settings management system allowing clients
  to configure every aspect of the warranty management platform autonomously.

  ## New Tables

  ### 1. `company_settings`
  Global company configuration and branding
  - `id` (uuid, primary key)
  - `company_name` (text)
  - `logo_url` (text)
  - `primary_color` (text)
  - `secondary_color` (text)
  - `contact_email` (text)
  - `contact_phone` (text)
  - `contact_address` (text)
  - `website_url` (text)
  - `business_number` (text)
  - `license_numbers` (jsonb)
  - `updated_at` (timestamptz)
  - `updated_by` (uuid, references profiles)

  ### 2. `tax_rates`
  Provincial tax rate configuration
  - `id` (uuid, primary key)
  - `province_code` (text)
  - `province_name` (text)
  - `gst_rate` (numeric)
  - `pst_rate` (numeric)
  - `hst_rate` (numeric)
  - `is_active` (boolean)
  - `effective_date` (date)
  - `updated_at` (timestamptz)
  - `updated_by` (uuid, references profiles)

  ### 3. `pricing_rules`
  Dynamic pricing and margin configuration
  - `id` (uuid, primary key)
  - `rule_name` (text)
  - `min_purchase_price` (numeric)
  - `max_purchase_price` (numeric)
  - `annual_claim_limit` (numeric)
  - `loyalty_credit_amount` (numeric)
  - `default_deductible` (numeric)
  - `min_margin_percentage` (numeric)
  - `max_margin_percentage` (numeric)
  - `is_active` (boolean)
  - `priority` (integer)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - `updated_by` (uuid, references profiles)

  ### 4. `notification_templates`
  Email and SMS template configuration
  - `id` (uuid, primary key)
  - `template_name` (text, unique)
  - `template_type` (text: email, sms)
  - `subject` (text)
  - `body_fr` (text)
  - `body_en` (text)
  - `variables` (jsonb)
  - `trigger_event` (text)
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - `updated_by` (uuid, references profiles)

  ### 5. `claim_settings`
  Claims processing configuration
  - `id` (uuid, primary key)
  - `sla_hours` (integer)
  - `auto_approval_threshold` (numeric)
  - `require_supervisor_approval_above` (numeric)
  - `exclusion_keywords` (jsonb)
  - `workflow_steps` (jsonb)
  - `updated_at` (timestamptz)
  - `updated_by` (uuid, references profiles)

  ### 6. `integration_settings`
  Third-party integration configuration
  - `id` (uuid, primary key)
  - `integration_name` (text)
  - `is_enabled` (boolean)
  - `api_key_encrypted` (text)
  - `config_json` (jsonb)
  - `last_sync_at` (timestamptz)
  - `updated_at` (timestamptz)
  - `updated_by` (uuid, references profiles)

  ### 7. `settings_audit_log`
  Track all settings changes for compliance
  - `id` (uuid, primary key)
  - `table_name` (text)
  - `record_id` (text)
  - `setting_name` (text)
  - `old_value` (jsonb)
  - `new_value` (jsonb)
  - `changed_by` (uuid, references profiles)
  - `changed_at` (timestamptz)
  - `ip_address` (text)

  ## Security
  - Enable RLS on all new tables
  - Only admins can modify settings
  - All users can read company_settings for branding
  - Audit log is read-only for admins, write-only via trigger
*/

-- Company Settings Table
CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'Mon Entreprise',
  logo_url text,
  primary_color text DEFAULT '#0f172a',
  secondary_color text DEFAULT '#3b82f6',
  contact_email text,
  contact_phone text,
  contact_address text,
  website_url text,
  business_number text,
  license_numbers jsonb DEFAULT '[]'::jsonb,
  email_signature_fr text,
  email_signature_en text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view company settings"
  ON company_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can update company settings"
  ON company_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can insert company settings"
  ON company_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Tax Rates Table
CREATE TABLE IF NOT EXISTS tax_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  province_code text NOT NULL UNIQUE,
  province_name text NOT NULL,
  gst_rate numeric(5,4) NOT NULL DEFAULT 0,
  pst_rate numeric(5,4) NOT NULL DEFAULT 0,
  hst_rate numeric(5,4) NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  effective_date date DEFAULT CURRENT_DATE,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);

ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tax rates"
  ON tax_rates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify tax rates"
  ON tax_rates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Pricing Rules Table
CREATE TABLE IF NOT EXISTS pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  min_purchase_price numeric NOT NULL,
  max_purchase_price numeric NOT NULL,
  annual_claim_limit numeric NOT NULL,
  loyalty_credit_amount numeric NOT NULL DEFAULT 0,
  loyalty_credit_promotional numeric NOT NULL DEFAULT 0,
  default_deductible numeric NOT NULL DEFAULT 0,
  min_margin_percentage numeric(5,2) DEFAULT 10,
  max_margin_percentage numeric(5,2) DEFAULT 50,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);

ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pricing rules"
  ON pricing_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify pricing rules"
  ON pricing_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Notification Templates Table
CREATE TABLE IF NOT EXISTS notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL UNIQUE,
  template_type text NOT NULL CHECK (template_type IN ('email', 'sms')),
  subject text,
  body_fr text NOT NULL,
  body_en text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  trigger_event text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and operations can view notification templates"
  ON notification_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'operations')
    )
  );

CREATE POLICY "Only admins can modify notification templates"
  ON notification_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Claim Settings Table
CREATE TABLE IF NOT EXISTS claim_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sla_hours integer DEFAULT 48,
  auto_approval_threshold numeric DEFAULT 500,
  require_supervisor_approval_above numeric DEFAULT 2000,
  exclusion_keywords jsonb DEFAULT '[]'::jsonb,
  workflow_steps jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);

ALTER TABLE claim_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operations and admins can view claim settings"
  ON claim_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'operations')
    )
  );

CREATE POLICY "Only admins can modify claim settings"
  ON claim_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Integration Settings Table
CREATE TABLE IF NOT EXISTS integration_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_name text NOT NULL UNIQUE,
  is_enabled boolean DEFAULT false,
  api_key_encrypted text,
  config_json jsonb DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);

ALTER TABLE integration_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view integration settings"
  ON integration_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can modify integration settings"
  ON integration_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Settings Audit Log Table
CREATE TABLE IF NOT EXISTS settings_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id text NOT NULL,
  setting_name text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  changed_by uuid REFERENCES profiles(id),
  changed_at timestamptz DEFAULT now(),
  ip_address text
);

ALTER TABLE settings_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view settings audit log"
  ON settings_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert default company settings
INSERT INTO company_settings (company_name, primary_color, secondary_color)
VALUES ('Gestion de Garanties', '#0f172a', '#3b82f6')
ON CONFLICT DO NOTHING;

-- Insert default Canadian tax rates
INSERT INTO tax_rates (province_code, province_name, gst_rate, pst_rate, hst_rate) VALUES
  ('AB', 'Alberta', 0.05, 0, 0),
  ('BC', 'British Columbia', 0.05, 0.07, 0),
  ('MB', 'Manitoba', 0.05, 0.07, 0),
  ('NB', 'New Brunswick', 0, 0, 0.15),
  ('NL', 'Newfoundland and Labrador', 0, 0, 0.15),
  ('NS', 'Nova Scotia', 0, 0, 0.15),
  ('ON', 'Ontario', 0, 0, 0.13),
  ('PE', 'Prince Edward Island', 0, 0, 0.15),
  ('QC', 'Quebec', 0.05, 0.09975, 0),
  ('SK', 'Saskatchewan', 0.05, 0.06, 0)
ON CONFLICT (province_code) DO NOTHING;

-- Insert default pricing rules based on current PPR logic
INSERT INTO pricing_rules (rule_name, min_purchase_price, max_purchase_price, annual_claim_limit, loyalty_credit_amount, loyalty_credit_promotional, default_deductible, priority) VALUES
  ('Tier 1: 0$ - 5,000$', 0, 5000, 1000, 250, 0, 100, 1),
  ('Tier 2: 5,001$ - 10,000$', 5001, 10000, 1500, 250, 0, 100, 2),
  ('Tier 3: 10,001$ - 20,000$', 10001, 20000, 2000, 500, 0, 100, 3),
  ('Tier 4: 20,001$ - 30,000$', 20001, 30000, 3000, 500, 0, 100, 4),
  ('Tier 5: 30,001$ - 40,000$', 30001, 40000, 3500, 500, 0, 100, 5),
  ('Tier 6: 40,001$ - 70,000$', 40001, 70000, 4000, 500, 0, 100, 6)
ON CONFLICT DO NOTHING;

-- Insert default claim settings
INSERT INTO claim_settings (sla_hours, auto_approval_threshold, require_supervisor_approval_above)
VALUES (48, 500, 2000)
ON CONFLICT DO NOTHING;

-- Insert default notification templates
INSERT INTO notification_templates (template_name, template_type, subject, body_fr, body_en, variables, trigger_event) VALUES
  (
    'welcome_email',
    'email',
    'Bienvenue - Welcome',
    'Bonjour {{customer_name}},\n\nBienvenue! Merci d''avoir choisi notre programme de garantie.\n\nNuméro de contrat: {{contract_number}}\nDate de début: {{start_date}}\n\nCordialement,\n{{company_name}}',
    'Hello {{customer_name}},\n\nWelcome! Thank you for choosing our warranty program.\n\nContract number: {{contract_number}}\nStart date: {{start_date}}\n\nBest regards,\n{{company_name}}',
    '["customer_name", "contract_number", "start_date", "company_name"]'::jsonb,
    'warranty_created'
  ),
  (
    'claim_submitted',
    'email',
    'Réclamation reçue - Claim Received',
    'Bonjour {{customer_name}},\n\nNous avons bien reçu votre réclamation #{{claim_number}}.\n\nNotre équipe la traitera dans un délai de {{sla_hours}} heures.\n\nCordialement,\n{{company_name}}',
    'Hello {{customer_name}},\n\nWe have received your claim #{{claim_number}}.\n\nOur team will process it within {{sla_hours}} hours.\n\nBest regards,\n{{company_name}}',
    '["customer_name", "claim_number", "sla_hours", "company_name"]'::jsonb,
    'claim_submitted'
  )
ON CONFLICT (template_name) DO NOTHING;

-- Insert default integration placeholders
INSERT INTO integration_settings (integration_name, is_enabled) VALUES
  ('stripe', false),
  ('twilio', false),
  ('sendgrid', false)
ON CONFLICT (integration_name) DO NOTHING;
