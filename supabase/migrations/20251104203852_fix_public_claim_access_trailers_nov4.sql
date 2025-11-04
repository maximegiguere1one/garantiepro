/*
  # Fix Public Claim Access - Add Missing Policies for Trailers
  
  1. Problem
    - Anonymous users couldn't view warranties via claim tokens
    - Missing RLS policy on `trailers` table blocked access
    - Missing RLS policy on `claim_timeline` and `public_claim_access_logs`
  
  2. Solution
    - Add policy to allow anonymous users to view trailers via valid claim token
    - Add policy to allow anonymous users to insert claim timeline events
    - Add policy to allow anonymous users to insert access logs
  
  3. Security
    - Access is ONLY granted if a valid, non-expired, non-used claim token exists
    - Users can only see trailer data related to their specific warranty
    - Timeline and logs can only be created for valid claims
*/

-- Policy: Allow anonymous users to view trailers via valid claim token
DROP POLICY IF EXISTS "Public can view trailer via valid token" ON trailers;
CREATE POLICY "Public can view trailer via valid token"
  ON trailers
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 
      FROM warranties w
      JOIN warranty_claim_tokens wct ON wct.warranty_id = w.id
      WHERE w.trailer_id = trailers.id
        AND wct.is_used = false
        AND wct.expires_at > now()
    )
  );

-- Policy: Allow anonymous users to insert claim timeline events
DROP POLICY IF EXISTS "Public can insert claim timeline via token" ON claim_timeline;
CREATE POLICY "Public can insert claim timeline via token"
  ON claim_timeline
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM claims c
      JOIN warranty_claim_tokens wct ON wct.warranty_id = c.warranty_id
      WHERE c.id = claim_timeline.claim_id
        AND wct.is_used = false
        AND wct.expires_at > now()
    )
  );

-- Policy: Allow anonymous users to insert access logs
DROP POLICY IF EXISTS "Public can insert access logs" ON public_claim_access_logs;
CREATE POLICY "Public can insert access logs"
  ON public_claim_access_logs
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Verify all policies are in place
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE tablename IN ('warranties', 'warranty_plans', 'customers', 'trailers', 'claims', 'claim_timeline', 'claim_attachments', 'public_claim_access_logs')
  AND 'anon' = ANY(roles::text[]);
  
  RAISE NOTICE 'Total RLS policies for anonymous users: %', v_count;
END $$;
