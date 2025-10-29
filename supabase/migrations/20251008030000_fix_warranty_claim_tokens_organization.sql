/*
  # Fix warranty_claim_tokens - Add organization_id

  ## Problem
  The `warranty_claim_tokens` table is missing the `organization_id` column, which causes:
  - RLS policies to fail
  - Tokens cannot be properly isolated by organization
  - Token creation fails during warranty creation

  ## Solution
  1. Add `organization_id` column to `warranty_claim_tokens`
  2. Update the trigger to automatically copy organization_id from warranty
  3. Create proper RLS policies for organization-based access
  4. Backfill existing tokens with organization_id from their warranties

  ## Changes
  - Add organization_id column (nullable initially for backfill)
  - Backfill existing data
  - Make column NOT NULL after backfill
  - Update trigger function
  - Add RLS policy for organization access
*/

-- Step 1: Add organization_id column (nullable for backfill)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warranty_claim_tokens' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE warranty_claim_tokens
    ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

    -- Create index for performance
    CREATE INDEX IF NOT EXISTS idx_warranty_claim_tokens_organization_id
      ON warranty_claim_tokens(organization_id);
  END IF;
END $$;

-- Step 2: Backfill organization_id from warranties
UPDATE warranty_claim_tokens wct
SET organization_id = w.organization_id
FROM warranties w
WHERE wct.warranty_id = w.id
  AND wct.organization_id IS NULL;

-- Step 3: Make organization_id NOT NULL after backfill
ALTER TABLE warranty_claim_tokens
  ALTER COLUMN organization_id SET NOT NULL;

-- Step 4: Update the trigger function to include organization_id
CREATE OR REPLACE FUNCTION create_claim_token_for_warranty()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_token text;
BEGIN
  -- Only create token for active warranties
  IF NEW.status = 'active' THEN
    -- Generate unique token
    new_token := generate_claim_token();

    -- Insert token record with organization_id
    INSERT INTO warranty_claim_tokens (
      warranty_id,
      organization_id,
      token,
      expires_at
    ) VALUES (
      NEW.id,
      NEW.organization_id,
      new_token,
      NEW.end_date::timestamptz
    );

    -- Update warranty with claim submission URL
    UPDATE warranties
    SET claim_submission_url = '/claim/submit/' || new_token
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Step 5: Drop existing policies and create new ones with organization context
DROP POLICY IF EXISTS "Users can view tokens for their organization warranties" ON warranty_claim_tokens;
DROP POLICY IF EXISTS "Authenticated users can view claim tokens for their organization" ON warranty_claim_tokens;

-- Policy: Authenticated users can SELECT tokens from their organization
CREATE POLICY "Users can view organization claim tokens"
  ON warranty_claim_tokens FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

-- Policy: Authenticated users can INSERT tokens for their organization
CREATE POLICY "Users can create organization claim tokens"
  ON warranty_claim_tokens FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

-- Policy: Authenticated users can UPDATE tokens for their organization
CREATE POLICY "Users can update organization claim tokens"
  ON warranty_claim_tokens FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

-- Policy: Anonymous users can view and update tokens by token value (for public claim submission)
CREATE POLICY "Public can access claim tokens by token value"
  ON warranty_claim_tokens FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can update claim tokens by token value"
  ON warranty_claim_tokens FOR UPDATE
  TO anon
  USING (true);
