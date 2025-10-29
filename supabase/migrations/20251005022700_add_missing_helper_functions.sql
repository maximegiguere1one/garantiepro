/*
  # Add Missing Helper Functions

  ## Overview
  Adds missing helper functions used in RLS policies.

  ## Functions Added
  1. get_user_role() - Returns the role of the current user
  2. Improves existing functions for better performance
*/

-- Create get_user_role() function if it doesn't exist
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;
