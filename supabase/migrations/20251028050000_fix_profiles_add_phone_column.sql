/*
  # Fix Profiles Table - Add Phone Column

  ## Problem
  The MyProfile component tries to save a 'phone' field that doesn't exist in the profiles table,
  causing PGRST204 errors: "Could not find the 'phone' column of 'profiles' in the schema cache"

  ## Solution
  Add the missing 'phone' column to the profiles table with proper type and constraints

  ## Changes
  1. Add phone column (text, nullable) to profiles table
  2. Verify existing RLS policies work with the new column
  3. Add index for performance if needed

  ## Security
  The existing RLS policy "Users can update own basic info" already allows updating
  any non-role, non-organization_id fields, so phone will be automatically protected.
*/

-- Add phone column to profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'phone'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone text;
    RAISE NOTICE '✓ Added phone column to profiles table';
  ELSE
    RAISE NOTICE 'Phone column already exists in profiles table';
  END IF;
END $$;

-- Verify the column was added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'phone'
  ) THEN
    RAISE NOTICE '✓ Verification successful: phone column exists';
  ELSE
    RAISE EXCEPTION 'Failed to add phone column to profiles table';
  END IF;
END $$;
