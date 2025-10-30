/*
  # Fix company_settings RLS Policies

  This migration fixes RLS policies for company_settings to eliminate ambiguity
  and ensure proper access control.

  ## Changes Made
  1. Drop existing ambiguous policies
  2. Create clear, separate policies for SELECT, INSERT, UPDATE
  3. Ensure policies check organization_id correctly
  4. Add proper authenticated user checks

  ## Why This is Critical
  - Fixes 400 errors on company_settings queries
  - Eliminates PGRST116 ambiguity errors
  - Ensures users can only access their organization's settings
  - Maintains security through proper RLS
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view organization company settings" ON company_settings;
DROP POLICY IF EXISTS "Users can insert organization company settings" ON company_settings;
DROP POLICY IF EXISTS "Users can update organization company settings" ON company_settings;
DROP POLICY IF EXISTS "Enable read access for authenticated users based on organization" ON company_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users based on organization" ON company_settings;
DROP POLICY IF EXISTS "Enable update for authenticated users based on organization" ON company_settings;

-- Ensure RLS is enabled
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Create new, clear policies

-- SELECT policy: Users can view their organization's company settings
CREATE POLICY "company_settings_select_policy"
ON company_settings
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- INSERT policy: Users can insert company settings for their organization
CREATE POLICY "company_settings_insert_policy"
ON company_settings
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- UPDATE policy: Users can update their organization's company settings
CREATE POLICY "company_settings_update_policy"
ON company_settings
FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);