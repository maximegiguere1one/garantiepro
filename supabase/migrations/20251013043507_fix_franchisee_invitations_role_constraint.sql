/*
  # Fix franchisee_invitations role constraint
  
  1. Problem
    - Table franchisee_invitations has outdated role check constraint
    - Missing roles: master, franchisee_admin, franchisee_employee
    
  2. Solution
    - Drop old constraint
    - Add new constraint with all valid roles matching profiles table
    
  3. Security
    - Maintains data integrity
    - Aligns with profiles table role enum
*/

-- Drop the old constraint
ALTER TABLE franchisee_invitations 
DROP CONSTRAINT IF EXISTS franchisee_invitations_role_check;

-- Add new constraint with all valid roles
ALTER TABLE franchisee_invitations
ADD CONSTRAINT franchisee_invitations_role_check 
CHECK (role IN (
  'master',
  'super_admin',
  'admin',
  'franchisee_admin',
  'franchisee_employee',
  'dealer',
  'f_and_i',
  'operations',
  'client'
));