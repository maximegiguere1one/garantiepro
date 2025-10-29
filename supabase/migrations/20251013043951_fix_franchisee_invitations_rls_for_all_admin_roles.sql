/*
  # Fix franchisee_invitations RLS policies for all admin roles
  
  1. Problem
    - RLS policies only check for 'admin' role
    - Missing support for 'master', 'super_admin', and 'franchisee_admin' roles
    
  2. Solution
    - Update all RLS policies to include all admin-level roles
    - Allow master, super_admin, admin, and franchisee_admin to manage invitations
    
  3. Security
    - Maintains proper access control
    - Expands access to appropriate admin roles
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Only admins can manage invitations" ON franchisee_invitations;
DROP POLICY IF EXISTS "Owner admins can create invitations" ON franchisee_invitations;
DROP POLICY IF EXISTS "Owner admins can update invitations" ON franchisee_invitations;
DROP POLICY IF EXISTS "Owner admins can view all invitations" ON franchisee_invitations;
DROP POLICY IF EXISTS "Franchisees can view own org invitations" ON franchisee_invitations;

-- Policy 1: Admin roles can view all invitations in their organization
CREATE POLICY "Admin roles can view invitations"
  ON franchisee_invitations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('master', 'super_admin', 'admin', 'franchisee_admin')
        AND profiles.organization_id = franchisee_invitations.organization_id
    )
  );

-- Policy 2: Admin roles can create invitations for their organization
CREATE POLICY "Admin roles can create invitations"
  ON franchisee_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('master', 'super_admin', 'admin', 'franchisee_admin')
        AND profiles.organization_id = franchisee_invitations.organization_id
    )
  );

-- Policy 3: Admin roles can update invitations in their organization
CREATE POLICY "Admin roles can update invitations"
  ON franchisee_invitations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('master', 'super_admin', 'admin', 'franchisee_admin')
        AND profiles.organization_id = franchisee_invitations.organization_id
    )
  );

-- Policy 4: Admin roles can delete invitations in their organization
CREATE POLICY "Admin roles can delete invitations"
  ON franchisee_invitations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('master', 'super_admin', 'admin', 'franchisee_admin')
        AND profiles.organization_id = franchisee_invitations.organization_id
    )
  );

-- Policy 5: Master and super_admin can view ALL invitations across organizations
CREATE POLICY "Master can view all invitations"
  ON franchisee_invitations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('master', 'super_admin')
    )
  );

-- Policy 6: Master and super_admin can manage ALL invitations across organizations
CREATE POLICY "Master can manage all invitations"
  ON franchisee_invitations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('master', 'super_admin')
    )
  );