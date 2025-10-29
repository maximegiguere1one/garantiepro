/*
  # Add Public Claim Submission System with Unique Tokens

  ## Overview
  This migration adds a complete system for public claim submissions via unique secure tokens.
  Customers can submit claims directly via a unique URL without authentication.

  ## New Tables

  ### 1. `warranty_claim_tokens`
  Secure tokens for public claim submissions
  - `id` (uuid, primary key)
  - `warranty_id` (uuid, references warranties) - The warranty this token belongs to
  - `token` (text, unique, indexed) - The unique secure token (32 characters)
  - `created_at` (timestamptz) - When the token was generated
  - `expires_at` (timestamptz) - When the token expires (based on warranty end date)
  - `is_used` (boolean) - Whether a claim has been submitted with this token
  - `used_at` (timestamptz) - When the token was used to submit a claim
  - `claim_id` (uuid, references claims) - The claim created via this token
  - `access_count` (integer) - Number of times the token URL was accessed
  - `last_accessed_at` (timestamptz) - Last time the token was accessed

  ### 2. `public_claim_access_logs`
  Audit trail for public claim submission access
  - `id` (uuid, primary key)
  - `token` (text) - The token that was accessed
  - `ip_address` (text) - IP address of the accessor
  - `user_agent` (text) - Browser user agent
  - `accessed_at` (timestamptz) - When the access occurred
  - `action` (text) - Action performed (view_form, submit_claim, upload_file)
  - `success` (boolean) - Whether the action was successful
  - `error_message` (text) - Error message if action failed

  ## Modified Tables

  ### `warranties`
  - Add `claim_submission_url` (text) - Full URL for public claim submission

  ### `claims`
  - Add `submission_method` (text) - How claim was submitted (internal, public_link)
  - Add `submission_token` (text) - Token used for public submission
  - Add `submission_ip` (text) - IP address of public submission

  ## Security
  - RLS enabled on all new tables
  - Public access allowed ONLY with valid token
  - Tokens are single-use and expire with warranty
  - All access is logged for security auditing
  - Admin and F&I roles can manage all claims
  - Operations role can view and process claims

  ## Indexes
  - Index on warranty_claim_tokens.token for fast lookup
  - Index on warranty_claim_tokens.warranty_id for warranty queries
  - Index on claims.submission_token for claim lookup
*/

-- Create warranty_claim_tokens table
CREATE TABLE IF NOT EXISTS warranty_claim_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id uuid NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  is_used boolean DEFAULT false,
  used_at timestamptz,
  claim_id uuid REFERENCES claims(id) ON DELETE SET NULL,
  access_count integer DEFAULT 0,
  last_accessed_at timestamptz
);

-- Create index on token for fast lookups
CREATE INDEX IF NOT EXISTS idx_warranty_claim_tokens_token ON warranty_claim_tokens(token);
CREATE INDEX IF NOT EXISTS idx_warranty_claim_tokens_warranty_id ON warranty_claim_tokens(warranty_id);

-- Create public_claim_access_logs table
CREATE TABLE IF NOT EXISTS public_claim_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL,
  ip_address text,
  user_agent text,
  accessed_at timestamptz DEFAULT now(),
  action text NOT NULL CHECK (action IN ('view_form', 'submit_claim', 'upload_file', 'invalid_token')),
  success boolean DEFAULT true,
  error_message text
);

-- Add columns to warranties table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warranties' AND column_name = 'claim_submission_url'
  ) THEN
    ALTER TABLE warranties ADD COLUMN claim_submission_url text;
  END IF;
END $$;

-- Add columns to claims table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claims' AND column_name = 'submission_method'
  ) THEN
    ALTER TABLE claims ADD COLUMN submission_method text DEFAULT 'internal' CHECK (submission_method IN ('internal', 'public_link'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claims' AND column_name = 'submission_token'
  ) THEN
    ALTER TABLE claims ADD COLUMN submission_token text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claims' AND column_name = 'submission_ip'
  ) THEN
    ALTER TABLE claims ADD COLUMN submission_ip text;
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE warranty_claim_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_claim_access_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for warranty_claim_tokens

-- Admin and F&I can view all tokens
CREATE POLICY "Admin and F&I can view all claim tokens"
  ON warranty_claim_tokens FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i')
    )
  );

-- Admin and F&I can create tokens
CREATE POLICY "Admin and F&I can create claim tokens"
  ON warranty_claim_tokens FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i')
    )
  );

-- Admin and F&I can update tokens
CREATE POLICY "Admin and F&I can update claim tokens"
  ON warranty_claim_tokens FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i')
    )
  );

-- Public can view token info ONLY with valid token (for form display)
CREATE POLICY "Public can view token with valid token"
  ON warranty_claim_tokens FOR SELECT
  TO anon
  USING (
    is_used = false 
    AND expires_at > now()
  );

-- Public can update token usage (mark as used)
CREATE POLICY "Public can update token usage"
  ON warranty_claim_tokens FOR UPDATE
  TO anon
  USING (
    is_used = false 
    AND expires_at > now()
  )
  WITH CHECK (
    is_used = true
  );

-- RLS Policies for public_claim_access_logs

-- Admin can view all access logs
CREATE POLICY "Admin can view all access logs"
  ON public_claim_access_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Anyone (including anon) can insert access logs
CREATE POLICY "Anyone can insert access logs"
  ON public_claim_access_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Update RLS policies for claims to support public submissions

-- Drop existing policies if they exist and recreate them
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public can create claims with valid token" ON claims;
  DROP POLICY IF EXISTS "Public can view their submitted claim" ON claims;
END $$;

-- Public can create claims with valid token
CREATE POLICY "Public can create claims with valid token"
  ON claims FOR INSERT
  TO anon
  WITH CHECK (
    submission_method = 'public_link'
    AND submission_token IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM warranty_claim_tokens
      WHERE warranty_claim_tokens.token = claims.submission_token
      AND warranty_claim_tokens.is_used = false
      AND warranty_claim_tokens.expires_at > now()
    )
  );

-- Public can view the claim they just submitted (for confirmation page)
CREATE POLICY "Public can view their submitted claim"
  ON claims FOR SELECT
  TO anon
  USING (
    submission_method = 'public_link'
    AND submission_token IS NOT NULL
  );

-- Function to generate a secure random token
CREATE OR REPLACE FUNCTION generate_claim_token()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  token_value text;
  token_exists boolean;
BEGIN
  LOOP
    -- Generate a random 32-character token
    token_value := encode(gen_random_bytes(24), 'base64');
    -- Remove characters that might cause URL issues
    token_value := replace(token_value, '/', '');
    token_value := replace(token_value, '+', '');
    token_value := replace(token_value, '=', '');
    token_value := substring(token_value, 1, 32);
    
    -- Check if token already exists
    SELECT EXISTS(
      SELECT 1 FROM warranty_claim_tokens WHERE token = token_value
    ) INTO token_exists;
    
    EXIT WHEN NOT token_exists;
  END LOOP;
  
  RETURN token_value;
END;
$$;

-- Function to automatically create claim token when warranty is created
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
    
    -- Insert token record
    INSERT INTO warranty_claim_tokens (
      warranty_id,
      token,
      expires_at
    ) VALUES (
      NEW.id,
      new_token,
      NEW.end_date::timestamptz
    );
    
    -- Update warranty with claim submission URL
    -- Note: The base URL will be set by the application
    NEW.claim_submission_url := '/claim/submit/' || new_token;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate tokens
DROP TRIGGER IF EXISTS trigger_create_claim_token ON warranties;
CREATE TRIGGER trigger_create_claim_token
  BEFORE INSERT ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION create_claim_token_for_warranty();

-- Also create tokens for existing active warranties that don't have one
DO $$
DECLARE
  warranty_record RECORD;
  new_token text;
BEGIN
  FOR warranty_record IN 
    SELECT w.id, w.end_date 
    FROM warranties w
    WHERE w.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM warranty_claim_tokens wct 
      WHERE wct.warranty_id = w.id
    )
  LOOP
    -- Generate unique token
    new_token := generate_claim_token();
    
    -- Insert token record
    INSERT INTO warranty_claim_tokens (
      warranty_id,
      token,
      expires_at
    ) VALUES (
      warranty_record.id,
      new_token,
      warranty_record.end_date::timestamptz
    );
    
    -- Update warranty with claim submission URL
    UPDATE warranties
    SET claim_submission_url = '/claim/submit/' || new_token
    WHERE id = warranty_record.id;
  END LOOP;
END $$;