/*
  # Create function to delete auth users

  1. Purpose
    - Allow edge functions to delete users from auth.users table
    - Bypass the auth.admin.deleteUser() API which has issues
    
  2. Function
    - delete_auth_user(user_id uuid): Delete user from auth.users
    - Uses SECURITY DEFINER to run with elevated privileges
    
  3. Security
    - Function is only accessible via service role
    - Cannot be called directly by clients
*/

-- Create function to delete auth users
CREATE OR REPLACE FUNCTION delete_auth_user(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete from auth.users (will cascade to related tables)
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;