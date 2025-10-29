/*
  # Fix Infinite Recursion in RLS Policies

  ## Problem
  The "Admins can view all profiles" policy causes infinite recursion because it queries
  the profiles table while evaluating access to the profiles table.

  ## Solution
  Drop the problematic policies and replace them with simpler, non-recursive policies:
  - Users can view their own profile using auth.uid()
  - Remove the admin check that causes recursion

  ## Security Notes
  - Users can only see their own profile
  - The trigger handles profile creation, so manual INSERT policies are not needed for normal flow
*/

-- Drop all existing SELECT policies on profiles to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Create simple, non-recursive policy for users to view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Drop and recreate the UPDATE policy to be safe
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
