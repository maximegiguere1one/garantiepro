/*
  # Fix Profile Creation and RLS Policies

  ## Overview
  This migration fixes the issue where users can't access the menu after account creation.
  The problem is that profiles aren't being created automatically when users sign up.

  ## Changes Made

  1. **Database Function**
     - `handle_new_user()` - Automatically creates a profile when a new user signs up
     - Runs with SECURITY DEFINER to bypass RLS during profile creation
     - Sets default role to 'admin' for new users

  2. **Database Trigger**
     - Trigger on `auth.users` table that fires after INSERT
     - Calls `handle_new_user()` to create the profile automatically

  3. **RLS Policy Updates**
     - Add policy to allow users to insert their own profile during signup
     - Ensure users can read their own profile immediately after creation

  ## Security Notes
  - The function uses SECURITY DEFINER to bypass RLS only for the specific insert operation
  - Users can only create a profile for their own user ID
  - All other RLS policies remain in effect
*/

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin')
  );
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create profile for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add RLS policy to allow users to insert their own profile during signup
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
CREATE POLICY "Users can create own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
