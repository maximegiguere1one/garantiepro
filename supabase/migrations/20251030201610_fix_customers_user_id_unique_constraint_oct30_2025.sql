/*
  # Fix customers.user_id UNIQUE constraint

  ## Problem
  The UNIQUE constraint on customers.user_id prevents a user (salesperson) 
  from creating multiple customers, causing the error:
  "duplicate key value violates unique constraint customers_user_id_key"

  ## Solution
  Drop the UNIQUE constraint on customers.user_id because:
  1. A salesperson can create multiple customers (different people)
  2. user_id represents WHO CREATED the customer, not the customer themselves
  3. The actual customer identity is determined by email + organization_id

  ## Changes
  1. Drop UNIQUE constraint on customers.user_id
  2. Keep FOREIGN KEY constraint (still references profiles.id)
  3. Add note explaining the relationship

  ## Safety
  - Non-destructive operation (only removes constraint)
  - Existing data remains unchanged
  - Foreign key constraint preserved for referential integrity
*/

-- Drop the UNIQUE constraint on customers.user_id
ALTER TABLE customers 
DROP CONSTRAINT IF EXISTS customers_user_id_key;

-- Add comment to explain the relationship
COMMENT ON COLUMN customers.user_id IS 
'References the user (salesperson/dealer) who created this customer record. 
Not unique because one user can create multiple different customers.';

-- Verify the constraint is removed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'customers_user_id_key'
  ) THEN
    RAISE NOTICE '✅ UNIQUE constraint on customers.user_id successfully removed';
  ELSE
    RAISE WARNING '⚠️  UNIQUE constraint still exists';
  END IF;
END $$;