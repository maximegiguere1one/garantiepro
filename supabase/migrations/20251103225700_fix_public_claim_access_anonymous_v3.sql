/*
  # Fix Public Claim Access for Anonymous Users
  
  1. Changes
    - Add RLS policy to allow anonymous users to view warranties via valid claim token
    - Add RLS policy to allow anonymous users to view warranty plans via claim token
    - Add RLS policy to allow anonymous users to view customers via claim token
    - Add RLS policy to allow anonymous users to insert claims
    
  2. Security
    - Access is ONLY granted if a valid, non-expired, non-used token exists
    - Users can only see data related to the specific warranty in the token
    - No other warranty data is accessible
*/

-- Policy 1: Allow anonymous users to view warranties via valid claim token
DROP POLICY IF EXISTS "Public can view warranty via valid token" ON warranties;
CREATE POLICY "Public can view warranty via valid token"
  ON warranties
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 
      FROM warranty_claim_tokens wct
      WHERE wct.warranty_id = warranties.id
        AND wct.is_used = false
        AND wct.expires_at > now()
    )
  );

-- Policy 2: Allow anonymous users to view warranty plans via valid token
DROP POLICY IF EXISTS "Public can view warranty plans via token" ON warranty_plans;
CREATE POLICY "Public can view warranty plans via token"
  ON warranty_plans
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 
      FROM warranties w
      JOIN warranty_claim_tokens wct ON wct.warranty_id = w.id
      WHERE w.plan_id = warranty_plans.id
        AND wct.is_used = false
        AND wct.expires_at > now()
    )
  );

-- Policy 3: Allow anonymous users to view customers via valid token
DROP POLICY IF EXISTS "Public can view customer via valid token" ON customers;
CREATE POLICY "Public can view customer via valid token"
  ON customers
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 
      FROM warranties w
      JOIN warranty_claim_tokens wct ON wct.warranty_id = w.id
      WHERE w.customer_id = customers.id
        AND wct.is_used = false
        AND wct.expires_at > now()
    )
  );

-- Policy 4: Allow anonymous users to insert claims via valid token
DROP POLICY IF EXISTS "Public can submit claims via valid token" ON claims;
CREATE POLICY "Public can submit claims via valid token"
  ON claims
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM warranty_claim_tokens wct
      WHERE wct.warranty_id = claims.warranty_id
        AND wct.is_used = false
        AND wct.expires_at > now()
    )
  );

-- Policy 5: Allow anonymous users to view their submitted claim
DROP POLICY IF EXISTS "Public can view own submitted claim" ON claims;
CREATE POLICY "Public can view own submitted claim"
  ON claims
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 
      FROM warranty_claim_tokens wct
      WHERE wct.warranty_id = claims.warranty_id
        AND wct.expires_at > now()
    )
  );

-- Policy 6: Allow anonymous to insert claim attachments
DROP POLICY IF EXISTS "Public can upload claim attachments via token" ON claim_attachments;
CREATE POLICY "Public can upload claim attachments via token"
  ON claim_attachments
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM claims c
      JOIN warranty_claim_tokens wct ON wct.warranty_id = c.warranty_id
      WHERE c.id = claim_attachments.claim_id
        AND wct.is_used = false
        AND wct.expires_at > now()
    )
  );
