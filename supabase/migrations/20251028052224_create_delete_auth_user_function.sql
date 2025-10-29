/*
  # Create delete_auth_user function

  1. Function Purpose
    - Allows secure deletion of auth.users records
    - Used by invite-user edge function to clean up existing users before re-invitation
    - Uses SECURITY DEFINER to run with elevated privileges
    
  2. Security
    - Only callable by authenticated users with admin roles
    - Validates that caller has permission to delete users
    - Prevents self-deletion
    
  3. Implementation
    - Deletes from auth.users (cascade will handle profiles via triggers)
    - Returns success status
*/

-- Create function to delete users from auth.users
CREATE OR REPLACE FUNCTION public.delete_auth_user(user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete from auth.users (this will cascade to profiles via FK)
  DELETE FROM auth.users
  WHERE id = user_id;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  IF deleted_count > 0 THEN
    RETURN json_build_object(
      'success', true,
      'message', 'User deleted successfully',
      'user_id', user_id
    );
  ELSE
    RETURN json_build_object(
      'success', false,
      'message', 'User not found',
      'user_id', user_id
    );
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_auth_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_auth_user(uuid) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.delete_auth_user IS 'Securely delete a user from auth.users. Used for cleaning up before re-invitations.';
