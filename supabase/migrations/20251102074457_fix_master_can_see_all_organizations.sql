/*
  # Fix Master Can See All Organizations
  
  1. Changes
    - Add RLS policy for master users to see ALL organizations
    - Master users need to see all orgs to switch between them
    
  2. Security
    - Only users with role='master' can see all organizations
    - Other users still see only their own organization
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Master can view all organizations" ON organizations;

-- Create policy for master to see all organizations
CREATE POLICY "Master can view all organizations"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'master'
    )
  );

-- Also ensure admins can see their own organization
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;

CREATE POLICY "Users can view their own organization"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM profiles
      WHERE profiles.id = auth.uid()
    )
  );