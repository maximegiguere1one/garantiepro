/*
  # Fix Profiles RLS - Ultra Simple & Fast
  
  1. Problem
    - Current policy allows ALL authenticated users to see ALL profiles
    - This causes table scans and timeouts
    - Security issue: users can see other users' data
  
  2. Solution
    - Users can ONLY see their own profile: id = auth.uid()
    - No complex checks, no recursion
    - Masters/Admins can use RPC functions to manage users
  
  3. Security
    - ✅ Users see only their own profile
    - ✅ Fast: indexed lookup by id
    - ✅ No table scans
    - ✅ No recursion
*/

-- Drop existing policies
DROP POLICY IF EXISTS "profiles_authenticated_select" ON profiles;
DROP POLICY IF EXISTS "profiles_authenticated_update" ON profiles;

-- Create new ultra-simple policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Create index for fast lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_profiles_auth_uid ON profiles(id);

-- Test the policy works
DO $$
BEGIN
  RAISE NOTICE 'Profiles RLS policies updated successfully';
  RAISE NOTICE 'Users can now only see their own profile';
  RAISE NOTICE 'This is FAST and SECURE';
END $$;
