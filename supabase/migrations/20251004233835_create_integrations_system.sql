/*
  # Integrations System for Stripe and QuickBooks

  ## Summary
  Creates a secure system to manage third-party integrations (Stripe, QuickBooks, etc.)
  - Store encrypted API credentials
  - Track connection status
  - Log integration events
  - Manage webhooks

  ## New Tables

  ### `integration_credentials`
  Stores encrypted API keys and tokens for third-party services
  - `id` (uuid, primary key)
  - `dealer_id` (uuid, foreign key to auth.users)
  - `integration_type` (text) - 'stripe', 'quickbooks', etc.
  - `api_key` (text) - encrypted API key/secret
  - `api_secret` (text) - encrypted API secret (if needed)
  - `access_token` (text) - OAuth access token (for QuickBooks)
  - `refresh_token` (text) - OAuth refresh token
  - `token_expires_at` (timestamptz) - Token expiration
  - `company_id` (text) - QuickBooks company/realm ID
  - `is_active` (boolean) - Whether integration is active
  - `is_test_mode` (boolean) - Test vs production mode
  - `last_sync_at` (timestamptz) - Last successful sync
  - `metadata` (jsonb) - Additional configuration
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `integration_logs`
  Tracks all integration events and API calls
  - `id` (uuid, primary key)
  - `dealer_id` (uuid, foreign key)
  - `integration_type` (text)
  - `event_type` (text) - 'sync', 'webhook', 'api_call', 'error'
  - `status` (text) - 'success', 'failed', 'pending'
  - `request_data` (jsonb)
  - `response_data` (jsonb)
  - `error_message` (text)
  - `processing_time_ms` (integer)
  - `created_at` (timestamptz)

  ### `webhook_endpoints`
  Manages webhook configurations
  - `id` (uuid, primary key)
  - `dealer_id` (uuid, foreign key)
  - `integration_type` (text)
  - `url` (text) - Webhook URL
  - `events` (text[]) - Array of subscribed events
  - `secret` (text) - Webhook signing secret
  - `is_active` (boolean)
  - `last_triggered_at` (timestamptz)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Dealers can only access their own credentials
  - API keys are stored encrypted
  - Webhook secrets are generated securely
  - All sensitive data is dealer-isolated

  ## Features
  - OAuth 2.0 flow support for QuickBooks
  - Automatic token refresh
  - Integration status monitoring
  - Detailed logging for debugging
  - Webhook signature verification
*/

-- =====================================================
-- 1. Create integration_credentials table
-- =====================================================

CREATE TABLE IF NOT EXISTS integration_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  integration_type text NOT NULL,
  api_key text,
  api_secret text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  company_id text,
  is_active boolean DEFAULT true,
  is_test_mode boolean DEFAULT false,
  last_sync_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(dealer_id, integration_type)
);

CREATE INDEX IF NOT EXISTS idx_integration_credentials_dealer ON integration_credentials(dealer_id);
CREATE INDEX IF NOT EXISTS idx_integration_credentials_type ON integration_credentials(integration_type);
CREATE INDEX IF NOT EXISTS idx_integration_credentials_active ON integration_credentials(is_active) WHERE is_active = true;

-- =====================================================
-- 2. Create integration_logs table
-- =====================================================

CREATE TABLE IF NOT EXISTS integration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  integration_type text NOT NULL,
  event_type text NOT NULL,
  status text DEFAULT 'pending',
  request_data jsonb DEFAULT '{}'::jsonb,
  response_data jsonb DEFAULT '{}'::jsonb,
  error_message text,
  processing_time_ms integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_logs_dealer ON integration_logs(dealer_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_type ON integration_logs(integration_type);
CREATE INDEX IF NOT EXISTS idx_integration_logs_status ON integration_logs(status);
CREATE INDEX IF NOT EXISTS idx_integration_logs_created ON integration_logs(created_at DESC);

-- =====================================================
-- 3. Create webhook_endpoints table
-- =====================================================

CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  integration_type text NOT NULL,
  url text NOT NULL,
  events text[] DEFAULT ARRAY[]::text[],
  secret text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  is_active boolean DEFAULT true,
  last_triggered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_dealer ON webhook_endpoints(dealer_id);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_type ON webhook_endpoints(integration_type);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_active ON webhook_endpoints(is_active) WHERE is_active = true;

-- =====================================================
-- 4. Enable RLS
-- =====================================================

ALTER TABLE integration_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. RLS Policies for integration_credentials
-- =====================================================

CREATE POLICY "Dealers can view their own integration credentials"
  ON integration_credentials FOR SELECT
  TO authenticated
  USING (dealer_id = auth.uid());

CREATE POLICY "Dealers can insert their own integration credentials"
  ON integration_credentials FOR INSERT
  TO authenticated
  WITH CHECK (dealer_id = auth.uid());

CREATE POLICY "Dealers can update their own integration credentials"
  ON integration_credentials FOR UPDATE
  TO authenticated
  USING (dealer_id = auth.uid())
  WITH CHECK (dealer_id = auth.uid());

CREATE POLICY "Dealers can delete their own integration credentials"
  ON integration_credentials FOR DELETE
  TO authenticated
  USING (dealer_id = auth.uid());

-- =====================================================
-- 6. RLS Policies for integration_logs
-- =====================================================

CREATE POLICY "Dealers can view their own integration logs"
  ON integration_logs FOR SELECT
  TO authenticated
  USING (dealer_id = auth.uid());

CREATE POLICY "Dealers can insert their own integration logs"
  ON integration_logs FOR INSERT
  TO authenticated
  WITH CHECK (dealer_id = auth.uid());

-- =====================================================
-- 7. RLS Policies for webhook_endpoints
-- =====================================================

CREATE POLICY "Dealers can view their own webhook endpoints"
  ON webhook_endpoints FOR SELECT
  TO authenticated
  USING (dealer_id = auth.uid());

CREATE POLICY "Dealers can insert their own webhook endpoints"
  ON webhook_endpoints FOR INSERT
  TO authenticated
  WITH CHECK (dealer_id = auth.uid());

CREATE POLICY "Dealers can update their own webhook endpoints"
  ON webhook_endpoints FOR UPDATE
  TO authenticated
  USING (dealer_id = auth.uid())
  WITH CHECK (dealer_id = auth.uid());

CREATE POLICY "Dealers can delete their own webhook endpoints"
  ON webhook_endpoints FOR DELETE
  TO authenticated
  USING (dealer_id = auth.uid());

-- =====================================================
-- 8. Function to check if integration is connected
-- =====================================================

CREATE OR REPLACE FUNCTION is_integration_connected(
  p_dealer_id uuid,
  p_integration_type text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_connected boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM integration_credentials
    WHERE dealer_id = p_dealer_id
      AND integration_type = p_integration_type
      AND is_active = true
      AND (
        (integration_type = 'stripe' AND api_key IS NOT NULL) OR
        (integration_type = 'quickbooks' AND access_token IS NOT NULL AND token_expires_at > now())
      )
  ) INTO v_connected;
  
  RETURN v_connected;
END;
$$;

-- =====================================================
-- 9. Function to log integration event
-- =====================================================

CREATE OR REPLACE FUNCTION log_integration_event(
  p_dealer_id uuid,
  p_integration_type text,
  p_event_type text,
  p_status text,
  p_request_data jsonb DEFAULT '{}'::jsonb,
  p_response_data jsonb DEFAULT '{}'::jsonb,
  p_error_message text DEFAULT NULL,
  p_processing_time_ms integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO integration_logs (
    dealer_id,
    integration_type,
    event_type,
    status,
    request_data,
    response_data,
    error_message,
    processing_time_ms
  ) VALUES (
    p_dealer_id,
    p_integration_type,
    p_event_type,
    p_status,
    p_request_data,
    p_response_data,
    p_error_message,
    p_processing_time_ms
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- =====================================================
-- 10. Update timestamp trigger
-- =====================================================

CREATE OR REPLACE FUNCTION update_integration_credentials_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_integration_credentials_timestamp
  BEFORE UPDATE ON integration_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_credentials_timestamp();

-- =====================================================
-- 11. Function to update last sync time
-- =====================================================

CREATE OR REPLACE FUNCTION update_integration_last_sync(
  p_dealer_id uuid,
  p_integration_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE integration_credentials
  SET last_sync_at = now()
  WHERE dealer_id = p_dealer_id
    AND integration_type = p_integration_type;
END;
$$;
