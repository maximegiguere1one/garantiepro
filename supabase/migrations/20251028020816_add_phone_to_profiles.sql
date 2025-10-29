/*
  # Add phone column to profiles table

  1. Changes
    - Add `phone` column to `profiles` table
      - Type: text (optional)
      - Used for user contact information in "Mon Profil" page
    
  2. Security
    - No RLS changes needed - existing policies already cover all columns
*/

-- Add phone column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone text;

-- Add comment for documentation
COMMENT ON COLUMN profiles.phone IS 'User phone number for contact purposes';
