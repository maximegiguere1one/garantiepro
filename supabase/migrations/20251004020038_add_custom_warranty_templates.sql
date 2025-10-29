/*
  # Add Custom Warranty Templates

  1. New Tables
    - `warranty_templates`
      - `id` (uuid, primary key)
      - `dealer_id` (uuid, references profiles) - Who created the template
      - `template_name` (text) - Name of the template
      - `template_type` (text) - 'uploaded_pdf' or 'custom_built'
      - `pdf_content_base64` (text) - For uploaded PDFs
      - `template_sections` (jsonb) - For custom built templates (structured sections)
      - `language` (text) - 'fr' or 'en'
      - `is_active` (boolean) - Whether template is available for use
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `warranty_template_sections`
      - `id` (uuid, primary key)
      - `section_name` (text) - e.g., 'coverage', 'exclusions', 'terms'
      - `section_content` (text) - Rich text content
      - `section_order` (integer) - Display order
      - `is_default` (boolean) - Whether this is a system default section

  2. Modifications
    - Add `custom_template_id` to warranties table to link custom templates
    - Add `template_pdf_url` to warranties table for custom PDFs

  3. Security
    - Enable RLS on all new tables
    - Dealers can only access their own templates
    - Dealers can read default template sections
*/

-- Create warranty_templates table
CREATE TABLE IF NOT EXISTS warranty_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  template_name text NOT NULL,
  template_type text NOT NULL CHECK (template_type IN ('uploaded_pdf', 'custom_built')),
  pdf_content_base64 text,
  template_sections jsonb DEFAULT '[]'::jsonb,
  language text NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'en')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create warranty_template_sections table for reusable sections
CREATE TABLE IF NOT EXISTS warranty_template_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_name text NOT NULL,
  section_content text NOT NULL,
  section_order integer DEFAULT 0,
  is_default boolean DEFAULT false,
  language text NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'en')),
  created_at timestamptz DEFAULT now()
);

-- Add columns to warranties table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warranties' AND column_name = 'custom_template_id'
  ) THEN
    ALTER TABLE warranties ADD COLUMN custom_template_id uuid REFERENCES warranty_templates(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warranties' AND column_name = 'template_pdf_url'
  ) THEN
    ALTER TABLE warranties ADD COLUMN template_pdf_url text;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE warranty_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_template_sections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for warranty_templates

-- Dealers can view their own templates
CREATE POLICY "Dealers can view own templates"
  ON warranty_templates FOR SELECT
  TO authenticated
  USING (auth.uid() = dealer_id);

-- Dealers can create their own templates
CREATE POLICY "Dealers can create own templates"
  ON warranty_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = dealer_id);

-- Dealers can update their own templates
CREATE POLICY "Dealers can update own templates"
  ON warranty_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = dealer_id)
  WITH CHECK (auth.uid() = dealer_id);

-- Dealers can delete their own templates
CREATE POLICY "Dealers can delete own templates"
  ON warranty_templates FOR DELETE
  TO authenticated
  USING (auth.uid() = dealer_id);

-- RLS Policies for warranty_template_sections

-- Everyone can view default sections
CREATE POLICY "Anyone can view default sections"
  ON warranty_template_sections FOR SELECT
  TO authenticated
  USING (is_default = true);

-- Only admins can manage default sections
CREATE POLICY "Admins can manage default sections"
  ON warranty_template_sections FOR ALL
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

-- Insert default template sections in French
INSERT INTO warranty_template_sections (section_name, section_content, section_order, is_default, language)
VALUES
  ('Couverture', 'Cette garantie couvre les défauts de fabrication et de matériaux pour une période déterminée.', 1, true, 'fr'),
  ('Exclusions', 'Cette garantie ne couvre pas les dommages causés par une mauvaise utilisation, négligence, accidents ou modifications non autorisées.', 2, true, 'fr'),
  ('Procédure de réclamation', 'Pour soumettre une réclamation, contactez-nous dans les 48 heures suivant la découverte du problème avec une description détaillée et des photos.', 3, true, 'fr'),
  ('Limitations', 'La responsabilité du garantisseur est limitée au montant payé pour cette garantie. Aucuns dommages indirects ou consécutifs ne sont couverts.', 4, true, 'fr')
ON CONFLICT DO NOTHING;

-- Insert default template sections in English
INSERT INTO warranty_template_sections (section_name, section_content, section_order, is_default, language)
VALUES
  ('Coverage', 'This warranty covers manufacturing defects and material defects for a specified period.', 1, true, 'en'),
  ('Exclusions', 'This warranty does not cover damage caused by misuse, negligence, accidents, or unauthorized modifications.', 2, true, 'en'),
  ('Claim Procedure', 'To submit a claim, contact us within 48 hours of discovering the issue with a detailed description and photos.', 3, true, 'en'),
  ('Limitations', 'The guarantor''s liability is limited to the amount paid for this warranty. No indirect or consequential damages are covered.', 4, true, 'en')
ON CONFLICT DO NOTHING;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_warranty_templates_dealer ON warranty_templates(dealer_id);
CREATE INDEX IF NOT EXISTS idx_warranty_templates_active ON warranty_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_template_sections_default ON warranty_template_sections(is_default);
