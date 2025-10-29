/*
  # Enable Public Claim Submission - Complete RLS

  1. Claims Table
    - Allow anonymous users to INSERT claims with valid token
    - Allow anonymous users to SELECT their submitted claim
  
  2. Claim Attachments Table
    - Allow anonymous users to INSERT attachments for their claim
  
  3. Claim Timeline Table
    - Allow anonymous users to INSERT timeline events for their claim
    
  4. Public Claim Access Logs Table
    - Allow anonymous users to INSERT access logs
*/

-- =====================================================
-- CLAIMS TABLE RLS
-- =====================================================

-- Allow anonymous users to create claims with valid token
DROP POLICY IF EXISTS "Public can create claims with valid token" ON claims;
CREATE POLICY "Public can create claims with valid token"
  ON claims
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM warranty_claim_tokens
      WHERE token = submission_token
        AND is_used = false
        AND expires_at > now()
    )
  );

-- Allow anonymous users to view their just-submitted claim (within 5 minutes)
DROP POLICY IF EXISTS "Public can view recently submitted claims" ON claims;
CREATE POLICY "Public can view recently submitted claims"
  ON claims
  FOR SELECT
  TO anon
  USING (
    created_at > (now() - interval '5 minutes')
    AND submission_method = 'public_link'
    AND submission_token IS NOT NULL
  );

-- =====================================================
-- CLAIM_ATTACHMENTS TABLE RLS
-- =====================================================

-- Allow anonymous users to insert attachments for claims they just created
DROP POLICY IF EXISTS "Public can create claim attachments" ON claim_attachments;
CREATE POLICY "Public can create claim attachments"
  ON claim_attachments
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM claims
      WHERE claims.id = claim_attachments.claim_id
        AND claims.created_at > (now() - interval '10 minutes')
        AND claims.submission_method = 'public_link'
    )
  );

-- =====================================================
-- CLAIM_TIMELINE TABLE RLS
-- =====================================================

-- Allow anonymous users to insert timeline events for claims they just created
DROP POLICY IF EXISTS "Public can create claim timeline events" ON claim_timeline;
CREATE POLICY "Public can create claim timeline events"
  ON claim_timeline
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM claims
      WHERE claims.id = claim_timeline.claim_id
        AND claims.created_at > (now() - interval '10 minutes')
        AND claims.submission_method = 'public_link'
    )
  );

-- =====================================================
-- PUBLIC_CLAIM_ACCESS_LOGS TABLE RLS
-- =====================================================

-- Allow anonymous users to insert access logs
DROP POLICY IF EXISTS "Public can create access logs" ON public_claim_access_logs;
CREATE POLICY "Public can create access logs"
  ON public_claim_access_logs
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow all to view access logs (for debugging)
DROP POLICY IF EXISTS "Admins can view access logs" ON public_claim_access_logs;
CREATE POLICY "Admins can view access logs"
  ON public_claim_access_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('master', 'admin', 'franchisee_admin')
    )
  );
