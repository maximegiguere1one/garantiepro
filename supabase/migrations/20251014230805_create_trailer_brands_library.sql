/*
  # Create Trailer Brands Library System

  1. New Tables
    - `trailer_brands`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key to organizations)
      - `name` (text, brand name - unique per organization)
      - `logo_url` (text, optional logo)
      - `website` (text, optional website)
      - `country` (text, country of origin)
      - `is_active` (boolean, whether brand is active)
      - `usage_count` (integer, how many times used in inventory)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `created_by` (uuid, user who created it)

    - `trailer_models`
      - `id` (uuid, primary key)
      - `brand_id` (uuid, foreign key to trailer_brands)
      - `organization_id` (uuid, foreign key to organizations)
      - `model_name` (text, model name)
      - `category` (text, fermee/ouverte/utilitaire)
      - `typical_price_range_min` (numeric, optional)
      - `typical_price_range_max` (numeric, optional)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can view brands in their organization
    - Admins and F&I can create/update brands
    - Track usage count automatically

  3. Indexes
    - Index on organization_id for fast filtering
    - Index on name for quick searches
    - Full-text search on brand names
*/

-- Create trailer_brands table
CREATE TABLE IF NOT EXISTS trailer_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  logo_url text,
  website text,
  country text DEFAULT 'Canada',
  is_active boolean DEFAULT true,
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT unique_brand_per_org UNIQUE(organization_id, name)
);

-- Create trailer_models table
CREATE TABLE IF NOT EXISTS trailer_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES trailer_brands(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  model_name text NOT NULL,
  category text CHECK (category IN ('fermee', 'ouverte', 'utilitaire')),
  typical_price_range_min numeric DEFAULT 0,
  typical_price_range_max numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_model_per_brand UNIQUE(brand_id, model_name)
);

-- Enable RLS
ALTER TABLE trailer_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE trailer_models ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trailer_brands
CREATE POLICY "Users can view brands in their organization"
  ON trailer_brands FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins and F&I can create brands"
  ON trailer_brands FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'f_and_i', 'master')
    )
  );

CREATE POLICY "Admins and F&I can update brands"
  ON trailer_brands FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'f_and_i', 'master')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'f_and_i', 'master')
    )
  );

CREATE POLICY "Admins and F&I can delete brands"
  ON trailer_brands FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'f_and_i', 'master')
    )
  );

-- RLS Policies for trailer_models
CREATE POLICY "Users can view models in their organization"
  ON trailer_models FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins and F&I can create models"
  ON trailer_models FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'f_and_i', 'master')
    )
  );

CREATE POLICY "Admins and F&I can update models"
  ON trailer_models FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'f_and_i', 'master')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'f_and_i', 'master')
    )
  );

CREATE POLICY "Admins and F&I can delete models"
  ON trailer_models FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'f_and_i', 'master')
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trailer_brands_organization_id ON trailer_brands(organization_id);
CREATE INDEX IF NOT EXISTS idx_trailer_brands_name ON trailer_brands(name);
CREATE INDEX IF NOT EXISTS idx_trailer_brands_active ON trailer_brands(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_trailer_models_brand_id ON trailer_models(brand_id);
CREATE INDEX IF NOT EXISTS idx_trailer_models_organization_id ON trailer_models(organization_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_trailer_brands_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for trailer_brands
DROP TRIGGER IF EXISTS trigger_update_trailer_brands_updated_at ON trailer_brands;
CREATE TRIGGER trigger_update_trailer_brands_updated_at
  BEFORE UPDATE ON trailer_brands
  FOR EACH ROW
  EXECUTE FUNCTION update_trailer_brands_updated_at();

-- Create trigger for trailer_models
DROP TRIGGER IF EXISTS trigger_update_trailer_models_updated_at ON trailer_models;
CREATE TRIGGER trigger_update_trailer_models_updated_at
  BEFORE UPDATE ON trailer_models
  FOR EACH ROW
  EXECUTE FUNCTION update_trailer_brands_updated_at();

-- Function to increment usage count when a brand is used
CREATE OR REPLACE FUNCTION increment_brand_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.make IS NOT NULL THEN
    UPDATE trailer_brands 
    SET usage_count = usage_count + 1
    WHERE name = NEW.make 
    AND organization_id = (SELECT organization_id FROM profiles WHERE id = NEW.dealer_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to increment usage count when inventory item is created
DROP TRIGGER IF EXISTS trigger_increment_brand_usage ON dealer_inventory;
CREATE TRIGGER trigger_increment_brand_usage
  AFTER INSERT ON dealer_inventory
  FOR EACH ROW
  EXECUTE FUNCTION increment_brand_usage();

-- Insert some common trailer brands for quick start
INSERT INTO trailer_brands (organization_id, name, country, created_by)
SELECT 
  o.id,
  brand_name,
  'Canada',
  (SELECT id FROM profiles WHERE organization_id = o.id AND role IN ('admin', 'master') LIMIT 1)
FROM organizations o
CROSS JOIN (
  VALUES 
    ('Remorques Laroche'),
    ('Remorques Concept'),
    ('Cargo Express'),
    ('Southland Trailers'),
    ('Look Trailers'),
    ('Haulmark'),
    ('Wells Cargo'),
    ('Pace American'),
    ('Continental Cargo'),
    ('Atlas'),
    ('Mission Trailers'),
    ('Aluma'),
    ('PJ Trailers'),
    ('Big Tex Trailers'),
    ('Lamar Trailers'),
    ('Sure-Trac'),
    ('Load Trail'),
    ('Iron Bull'),
    ('Kaufman Trailers'),
    ('Cam Superline')
) AS brands(brand_name)
ON CONFLICT (organization_id, name) DO NOTHING;