/*
  # Add Dealer-Specific Warranty Plan Management

  ## Overview
  This migration adds support for dealer-specific warranty plan configurations,
  allowing each dealer to create and manage their own warranty models with custom
  pricing, including the ability to offer free (0$) warranties.

  ## Changes

  1. Schema Updates
    - Add `dealer_id` column to `warranty_plans` table
    - Add `description` column for plan descriptions
    - Add `coverage_details` column for coverage information
    - Add `duration_months` column for warranty duration
    - Make `name_fr` and `name_en` nullable (dealers may use only one language)
    - Remove global plan concept - all plans are dealer-specific now

  2. Data Migration
    - Existing warranty_plans will be marked as template plans (can be cloned by dealers)
    - Add a `is_template` column to distinguish between template and dealer plans

  3. RLS Policy Updates
    - Update policies to allow dealers to manage their own warranty plans
    - Keep template plans visible to all dealers for cloning purposes

  4. Indexes
    - Add index on `dealer_id` for fast filtering by dealer
    - Add composite index on `dealer_id` and `is_active` for active plan queries

  ## Notes
  - Dealers can set `base_price` to 0 for free warranty offerings
  - Each dealer maintains independent warranty plan configurations
  - Template plans serve as starting points for dealers to customize
*/

-- Add new columns to warranty_plans table
DO $$
BEGIN
  -- Add dealer_id column (nullable for template plans)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warranty_plans' AND column_name = 'dealer_id'
  ) THEN
    ALTER TABLE warranty_plans ADD COLUMN dealer_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  -- Add is_template column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warranty_plans' AND column_name = 'is_template'
  ) THEN
    ALTER TABLE warranty_plans ADD COLUMN is_template boolean DEFAULT false;
  END IF;

  -- Add description column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warranty_plans' AND column_name = 'description'
  ) THEN
    ALTER TABLE warranty_plans ADD COLUMN description text DEFAULT '';
  END IF;

  -- Add coverage_details column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warranty_plans' AND column_name = 'coverage_details'
  ) THEN
    ALTER TABLE warranty_plans ADD COLUMN coverage_details text DEFAULT '';
  END IF;

  -- Add duration_months column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warranty_plans' AND column_name = 'duration_months'
  ) THEN
    ALTER TABLE warranty_plans ADD COLUMN duration_months integer DEFAULT 12;
  END IF;
END $$;

-- Make name_fr and name_en nullable (dealers may use only one language)
ALTER TABLE warranty_plans ALTER COLUMN name_fr DROP NOT NULL;
ALTER TABLE warranty_plans ALTER COLUMN name_en DROP NOT NULL;

-- Mark existing plans as templates
UPDATE warranty_plans SET is_template = true WHERE dealer_id IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_warranty_plans_dealer_id ON warranty_plans(dealer_id);
CREATE INDEX IF NOT EXISTS idx_warranty_plans_dealer_active ON warranty_plans(dealer_id, is_active) WHERE dealer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_warranty_plans_templates ON warranty_plans(is_template) WHERE is_template = true;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Anyone can view published warranty plans" ON warranty_plans;
DROP POLICY IF EXISTS "Admin and F&I can manage warranty plans" ON warranty_plans;

-- Create updated RLS policies

-- Policy 1: Dealers can view their own plans and template plans
CREATE POLICY "Dealers can view own and template plans"
  ON warranty_plans FOR SELECT
  TO authenticated
  USING (
    is_template = true 
    OR dealer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i')
    )
  );

-- Policy 2: Dealers can create their own warranty plans
CREATE POLICY "Dealers can create own warranty plans"
  ON warranty_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    dealer_id = auth.uid()
    AND is_template = false
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i')
    )
  );

-- Policy 3: Dealers can update their own plans
CREATE POLICY "Dealers can update own warranty plans"
  ON warranty_plans FOR UPDATE
  TO authenticated
  USING (
    dealer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i')
    )
  )
  WITH CHECK (
    dealer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i')
    )
  );

-- Policy 4: Dealers can delete their own plans
CREATE POLICY "Dealers can delete own warranty plans"
  ON warranty_plans FOR DELETE
  TO authenticated
  USING (
    dealer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i')
    )
  );

-- Policy 5: Admins can manage template plans
CREATE POLICY "Admins can manage template plans"
  ON warranty_plans FOR ALL
  TO authenticated
  USING (
    is_template = true
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    is_template = true
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
