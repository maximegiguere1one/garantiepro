/*
  # Création de Toutes les Tables Manquantes - PARTIE 1: CRITIQUES
  Date: 28 Octobre 2025
  
  Tables créées:
  1. email_queue - File d'attente d'emails
  2. error_logs - Logs d'erreurs
  3. warranty_claim_tokens - Tokens de réclamation
  4. public_claim_access_logs - Logs d'accès public
*/

-- =====================================================
-- TABLE 1: email_queue
-- =====================================================
CREATE TABLE IF NOT EXISTS email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  from_email text,
  subject text NOT NULL,
  body text NOT NULL,
  template_id text,
  variables jsonb,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'retry', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  error_message text,
  next_retry_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_next_retry ON email_queue(next_retry_at) WHERE status IN ('queued', 'retry');
CREATE INDEX IF NOT EXISTS idx_email_queue_organization ON email_queue(organization_id);

ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization email queue"
  ON email_queue FOR SELECT
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('master', 'admin'))
  );

CREATE POLICY "System can insert emails into queue"
  ON email_queue FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update email queue status"
  ON email_queue FOR UPDATE
  TO authenticated
  USING (true);

-- =====================================================
-- TABLE 2: error_logs
-- =====================================================
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_code text NOT NULL,
  error_message text NOT NULL,
  user_message text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  url text,
  user_agent text,
  stack_trace text,
  context jsonb DEFAULT '{}'::jsonb,
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own error logs"
  ON error_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own error logs"
  ON error_logs FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin', 'franchisee_admin')
      AND organization_id = error_logs.organization_id
    )
  );

CREATE POLICY "Admins can update error logs"
  ON error_logs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin', 'franchisee_admin')
      AND organization_id = error_logs.organization_id
    )
  );

CREATE INDEX IF NOT EXISTS idx_error_logs_code ON error_logs(error_code);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_organization_id ON error_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);

-- =====================================================
-- TABLE 3: warranty_claim_tokens
-- =====================================================
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

CREATE INDEX IF NOT EXISTS idx_warranty_claim_tokens_token ON warranty_claim_tokens(token);
CREATE INDEX IF NOT EXISTS idx_warranty_claim_tokens_warranty_id ON warranty_claim_tokens(warranty_id);

ALTER TABLE warranty_claim_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all claim tokens"
  ON warranty_claim_tokens FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin', 'franchisee_admin')
    )
  );

CREATE POLICY "Admins can create claim tokens"
  ON warranty_claim_tokens FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin', 'franchisee_admin', 'employee')
    )
  );

CREATE POLICY "Public can view valid tokens"
  ON warranty_claim_tokens FOR SELECT
  TO anon
  USING (is_used = false AND expires_at > now());

CREATE POLICY "Public can update token usage"
  ON warranty_claim_tokens FOR UPDATE
  TO anon
  USING (is_used = false AND expires_at > now())
  WITH CHECK (is_used = true);

-- =====================================================
-- TABLE 4: public_claim_access_logs
-- =====================================================
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

ALTER TABLE public_claim_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view access logs"
  ON public_claim_access_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin')
    )
  );

CREATE POLICY "Anyone can insert access logs"
  ON public_claim_access_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Add columns to warranties if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warranties' AND column_name = 'claim_submission_url'
  ) THEN
    ALTER TABLE warranties ADD COLUMN claim_submission_url text;
  END IF;
END $$;

-- Add columns to claims if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claims' AND column_name = 'submission_method'
  ) THEN
    ALTER TABLE claims ADD COLUMN submission_method text DEFAULT 'internal';
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

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✓ PARTIE 1 TERMINÉE: 4 tables critiques créées';
  RAISE NOTICE '  - email_queue';
  RAISE NOTICE '  - error_logs';
  RAISE NOTICE '  - warranty_claim_tokens';
  RAISE NOTICE '  - public_claim_access_logs';
END $$;