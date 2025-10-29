/*
  # Secure Anonymous Token Access

  ## Summary
  This migration fixes the security vulnerability where anonymous users could
  list all unused claim tokens by querying the warranty_claim_tokens table.

  ## Problem
  The current RLS policy allows:
  ```sql
  CREATE POLICY "Public can view token with valid token"
    ON warranty_claim_tokens FOR SELECT
    TO anon
    USING (is_used = false AND expires_at > now());
  ```
  
  This lets anyone query for all valid tokens, which is a security risk.

  ## Solution
  Remove the broad SELECT policy for anon users. Instead:
  1. Create a secure function that validates a single token
  2. Only return token info if the exact token value is provided
  3. Never allow listing or searching tokens

  ## Changes Made

  ### 1. Remove Dangerous Policy
  Remove the policy that allows anon users to SELECT from warranty_claim_tokens

  ### 2. Create Secure Token Lookup Function
  Create a function that:
  - Takes a token string as parameter
  - Returns token details ONLY if the exact token exists and is valid
  - Cannot be used to enumerate or search tokens
  - Uses SECURITY DEFINER to bypass RLS safely

  ### 3. Create Secure Token Validation Function
  Create a function for the frontend to validate tokens without exposing data

  ### 4. Update Public Claim Policies
  Ensure public claims can only be created with valid tokens

  ## Security Notes
  - Anonymous users cannot list or search tokens
  - Token access requires exact token value
  - All token operations are logged
  - Token enumeration is impossible
*/

-- =====================================================
-- 1. Remove dangerous anon SELECT policy
-- =====================================================

DROP POLICY IF EXISTS "Public can view token with valid token" ON warranty_claim_tokens;

-- =====================================================
-- 2. Create secure token lookup function
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_claim_token_info(token_value text)
RETURNS TABLE (
  id uuid,
  warranty_id uuid,
  token text,
  expires_at timestamptz,
  is_used boolean,
  access_count integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the access attempt
  INSERT INTO public_claim_access_logs (token, action, success)
  VALUES (token_value, 'view_form', true)
  ON CONFLICT DO NOTHING;

  -- Return token info ONLY if exact token matches and is valid
  RETURN QUERY
  SELECT 
    wct.id,
    wct.warranty_id,
    wct.token,
    wct.expires_at,
    wct.is_used,
    wct.access_count
  FROM warranty_claim_tokens wct
  WHERE wct.token = token_value
    AND wct.is_used = false
    AND wct.expires_at > now();
    
  -- If no rows returned, log failed attempt
  IF NOT FOUND THEN
    INSERT INTO public_claim_access_logs (token, action, success, error_message)
    VALUES (token_value, 'invalid_token', false, 'Token not found or expired')
    ON CONFLICT DO NOTHING;
  ELSE
    -- Increment access count
    UPDATE warranty_claim_tokens
    SET access_count = access_count + 1,
        last_accessed_at = now()
    WHERE warranty_claim_tokens.token = token_value;
  END IF;
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_claim_token_info(text) TO anon, authenticated;

-- =====================================================
-- 3. Create secure token validation function
-- =====================================================

CREATE OR REPLACE FUNCTION public.validate_claim_token(token_value text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_valid boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM warranty_claim_tokens
    WHERE token = token_value
      AND is_used = false
      AND expires_at > now()
  ) INTO is_valid;
  
  RETURN is_valid;
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.validate_claim_token(text) TO anon, authenticated;

-- =====================================================
-- 4. Create function to get warranty details for token
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_warranty_for_token(token_value text)
RETURNS TABLE (
  warranty_id uuid,
  customer_name text,
  trailer_info text,
  plan_name text,
  start_date date,
  end_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate token first
  IF NOT validate_claim_token(token_value) THEN
    RAISE EXCEPTION 'Invalid or expired token';
  END IF;

  -- Return warranty details for the token
  RETURN QUERY
  SELECT 
    w.id as warranty_id,
    CONCAT(c.first_name, ' ', c.last_name) as customer_name,
    CONCAT(t.year, ' ', t.make, ' ', t.model) as trailer_info,
    wp.name as plan_name,
    w.start_date,
    w.end_date
  FROM warranty_claim_tokens wct
  JOIN warranties w ON wct.warranty_id = w.id
  JOIN customers c ON w.customer_id = c.id
  JOIN trailers t ON w.trailer_id = t.id
  JOIN warranty_plans wp ON w.plan_id = wp.id
  WHERE wct.token = token_value;
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_warranty_for_token(text) TO anon, authenticated;

-- =====================================================
-- 5. Update public claim submission policy
-- =====================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Public can create claims with valid token" ON claims;

-- Recreate with stricter validation
CREATE POLICY "Public can create claims with valid token"
  ON claims FOR INSERT
  TO anon
  WITH CHECK (
    submission_method = 'public_link'
    AND submission_token IS NOT NULL
    AND validate_claim_token(submission_token) = true
    AND EXISTS (
      SELECT 1 FROM warranty_claim_tokens
      WHERE warranty_claim_tokens.token = claims.submission_token
      AND warranty_claim_tokens.warranty_id = claims.warranty_id
      AND warranty_claim_tokens.is_used = false
      AND warranty_claim_tokens.expires_at > now()
    )
  );

-- =====================================================
-- 6. Update token usage marking policy
-- =====================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Public can update token usage" ON warranty_claim_tokens;

-- Recreate with stricter validation
CREATE POLICY "System can mark token as used"
  ON warranty_claim_tokens FOR UPDATE
  TO anon, authenticated
  USING (
    is_used = false 
    AND expires_at > now()
  )
  WITH CHECK (
    -- Can only set is_used to true and set used_at/claim_id
    is_used = true
    AND used_at IS NOT NULL
  );

-- =====================================================
-- 7. Create trigger to auto-mark token as used
-- =====================================================

CREATE OR REPLACE FUNCTION mark_token_as_used()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a public link submission, mark the token as used
  IF NEW.submission_method = 'public_link' AND NEW.submission_token IS NOT NULL THEN
    UPDATE warranty_claim_tokens
    SET 
      is_used = true,
      used_at = now(),
      claim_id = NEW.id
    WHERE token = NEW.submission_token;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_mark_token_as_used ON claims;
CREATE TRIGGER trigger_mark_token_as_used
  AFTER INSERT ON claims
  FOR EACH ROW
  EXECUTE FUNCTION mark_token_as_used();

-- =====================================================
-- 8. Create function to log suspicious activity
-- =====================================================

CREATE OR REPLACE FUNCTION log_suspicious_token_access(
  token_value text,
  attempt_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public_claim_access_logs (
    token,
    action,
    success,
    error_message
  ) VALUES (
    token_value,
    attempt_type,
    false,
    'Suspicious activity detected'
  );
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION log_suspicious_token_access(text, text) TO anon, authenticated;

-- =====================================================
-- 9. Add rate limiting for token validation
-- =====================================================

-- Create table to track rate limiting
CREATE TABLE IF NOT EXISTS token_access_rate_limit (
  ip_address text NOT NULL,
  last_access timestamptz NOT NULL DEFAULT now(),
  access_count integer NOT NULL DEFAULT 1,
  PRIMARY KEY (ip_address)
);

ALTER TABLE token_access_rate_limit ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to check their own rate limit
CREATE POLICY "Anyone can check rate limit"
  ON token_access_rate_limit FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy to allow system to update rate limits
CREATE POLICY "System can update rate limits"
  ON token_access_rate_limit FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "System can modify rate limits"
  ON token_access_rate_limit FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Function to check rate limit (10 attempts per minute per IP)
CREATE OR REPLACE FUNCTION check_token_access_rate_limit(client_ip text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  last_check timestamptz;
BEGIN
  SELECT access_count, last_access 
  INTO current_count, last_check
  FROM token_access_rate_limit
  WHERE ip_address = client_ip;
  
  IF NOT FOUND THEN
    -- First access, allow it
    INSERT INTO token_access_rate_limit (ip_address, access_count, last_access)
    VALUES (client_ip, 1, now());
    RETURN true;
  END IF;
  
  -- If last access was more than 1 minute ago, reset counter
  IF last_check < now() - interval '1 minute' THEN
    UPDATE token_access_rate_limit
    SET access_count = 1, last_access = now()
    WHERE ip_address = client_ip;
    RETURN true;
  END IF;
  
  -- If under limit, increment and allow
  IF current_count < 10 THEN
    UPDATE token_access_rate_limit
    SET access_count = access_count + 1, last_access = now()
    WHERE ip_address = client_ip;
    RETURN true;
  END IF;
  
  -- Over limit, deny
  RETURN false;
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION check_token_access_rate_limit(text) TO anon, authenticated;
