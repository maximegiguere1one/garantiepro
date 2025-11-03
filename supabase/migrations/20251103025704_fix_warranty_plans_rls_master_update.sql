/*
  # Fix Warranty Plans RLS for Master Users
  
  Allow Master users to UPDATE warranty plans for ANY organization, not just their own.
  This enables Masters to manage franchise warranty plans.
  
  Changes:
  - Add policy for Master users to update warranty plans from any organization
*/

-- Drop the old restrictive update policy
DROP POLICY IF EXISTS "Users can update own organization warranty plans" ON warranty_plans;

-- Create new policy that allows users to update their own org plans
CREATE POLICY "Users can update own organization warranty plans"
  ON warranty_plans
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT profiles.organization_id
      FROM profiles
      WHERE profiles.id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = ANY(ARRAY['admin', 'f_and_i'])
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT profiles.organization_id
      FROM profiles
      WHERE profiles.id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = ANY(ARRAY['admin', 'f_and_i'])
    )
  );

-- Create separate policy for Master users to update ANY organization's warranty plans
CREATE POLICY "Master users can update any organization warranty plans"
  ON warranty_plans
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'master'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'master'
    )
  );
