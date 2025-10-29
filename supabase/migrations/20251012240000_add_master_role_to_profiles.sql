/*
  # Add 'master' role to profiles table

  ## Description
  This migration adds the 'master' role to the profiles table role constraint.
  The 'master' role is a super admin role that has full access to all organizations
  and can switch between organizations dynamically (like in GoHighLevel).

  ## Changes
  1. Drop existing role check constraint
  2. Add new constraint that includes 'master' role
  3. Update any documentation or related constraints

  ## Security
  - The 'master' role should only be assigned manually by database administrators
  - Master users bypass all organization-level RLS policies
  - Master users have all permissions regardless of organization context
*/

-- Drop the existing role constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add the new constraint with 'master' role included
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'master',
    'super_admin',
    'admin',
    'dealer',
    'f_and_i',
    'operations',
    'client',
    'franchisee_admin',
    'franchisee_employee'
  ));

-- Add a comment to the role column explaining the master role
COMMENT ON COLUMN profiles.role IS 'User role: master (super admin with org switching), super_admin, admin, dealer, f_and_i, operations, client, franchisee_admin, franchisee_employee';

-- Log the change
DO $$
BEGIN
  RAISE NOTICE 'Master role added to profiles table successfully';
END $$;
