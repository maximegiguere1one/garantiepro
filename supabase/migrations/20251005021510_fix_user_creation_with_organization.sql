/*
  # Fix User Creation with Organization Support

  ## Overview
  Updates the handle_new_user function to properly assign organization_id
  from user metadata during account creation.

  ## Changes
  1. **Updated Function**
     - Modified `handle_new_user()` to extract organization_id from raw_user_meta_data
     - Ensures new users are assigned to correct organization during signup
     - Maintains backward compatibility for users without organization_id

  ## Security
  - Function continues to use SECURITY DEFINER for profile creation
  - Organization assignment only happens during user creation
  - RLS policies still enforce organization isolation after creation
*/

-- Drop and recreate the function with organization_id support
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_organization_id uuid;
BEGIN
  -- Extract organization_id from user metadata, or use null
  v_organization_id := (NEW.raw_user_meta_data->>'organization_id')::uuid;

  -- If no organization_id in metadata, try to get the default owner organization
  IF v_organization_id IS NULL THEN
    SELECT id INTO v_organization_id
    FROM public.organizations
    WHERE type = 'owner'
    LIMIT 1;
  END IF;

  -- Insert profile with all metadata
  INSERT INTO public.profiles (id, email, full_name, role, organization_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin'),
    v_organization_id
  );
  
  RETURN NEW;
END;
$$;

-- Ensure the trigger is still active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
