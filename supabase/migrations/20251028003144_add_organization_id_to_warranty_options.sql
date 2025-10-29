/*
  # Add organization_id to warranty_options
*/

-- Add organization_id column
ALTER TABLE warranty_options 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Add updated_at column
ALTER TABLE warranty_options 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create index
CREATE INDEX IF NOT EXISTS idx_warranty_options_organization_id ON warranty_options(organization_id);

-- Add unique constraint
DROP INDEX IF EXISTS warranty_options_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_warranty_options_org_name ON warranty_options(organization_id, name) WHERE organization_id IS NOT NULL;

-- Enable RLS
ALTER TABLE warranty_options ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view warranty options in their organization" ON warranty_options;
DROP POLICY IF EXISTS "Admins can manage warranty options" ON warranty_options;

-- Create new policies
CREATE POLICY "Users can view warranty options in their organization"
  ON warranty_options FOR SELECT
  TO authenticated
  USING (
    organization_id IS NULL OR
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage warranty options"
  ON warranty_options FOR ALL
  TO authenticated
  USING (
    organization_id IS NULL OR
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

-- Create trigger
DROP TRIGGER IF EXISTS update_warranty_options_updated_at ON warranty_options;
CREATE TRIGGER update_warranty_options_updated_at
  BEFORE UPDATE ON warranty_options
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();