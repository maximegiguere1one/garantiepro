/*
  # Add organization_id to warranty_plans - Oct 28, 2025
  
  ROOT PROBLEM: warranty_plans table missing organization_id column
  - Code tries to filter by organization_id but column doesn't exist
  - Causes 400 errors when loading warranty plans
  
  SOLUTION:
  - Add organization_id column to warranty_plans
  - Make it nullable initially to handle existing data
  - Update RLS policies to use organization isolation
  - Add indexes for performance
*/

-- Add organization_id column (nullable for existing data)
ALTER TABLE warranty_plans 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_warranty_plans_organization_id ON warranty_plans(organization_id);

-- Drop old policies
DROP POLICY IF EXISTS "Admin and F&I can manage warranty plans" ON warranty_plans;
DROP POLICY IF EXISTS "Anyone can view published warranty plans" ON warranty_plans;

-- Create new organization-aware policies
CREATE POLICY "Users can view warranty plans in their organization"
  ON warranty_plans FOR SELECT
  TO authenticated
  USING (
    organization_id IS NULL OR -- For backward compatibility with existing plans
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage warranty plans in their organization"
  ON warranty_plans FOR ALL
  TO authenticated
  USING (
    organization_id IS NULL OR -- For backward compatibility
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('master', 'super_admin', 'admin', 'franchisee_admin', 'f_and_i')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('master', 'super_admin', 'admin', 'franchisee_admin', 'f_and_i')
    )
  );

-- Add other missing columns that code might reference
ALTER TABLE warranty_plans 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS duration_months integer DEFAULT 12,
ADD COLUMN IF NOT EXISTS coverage_details text;

-- Update existing plans to have a default organization_id if needed
-- This will be NULL for now, which is handled by the RLS policies above
COMMENT ON COLUMN warranty_plans.organization_id IS 'Organization that owns this warranty plan. NULL for global/legacy plans.';