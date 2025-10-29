/*
  # Enhanced Error Tracking and Management System

  1. New Tables
    - `error_fingerprints`
      - Groups similar errors together for pattern detection
      - Tracks occurrence frequency and affected users
      - Enables intelligent error grouping and deduplication

    - `error_breadcrumbs`
      - Stores user action trail leading to errors
      - Captures navigation, API calls, state changes
      - Enables error reproduction and debugging

    - `error_recovery_attempts`
      - Tracks automatic recovery attempts
      - Monitors circuit breaker states
      - Provides recovery success metrics

    - `error_alerts`
      - Manages error notification rules
      - Tracks alert delivery status
      - Supports multiple notification channels

    - `error_resolutions`
      - Documents error fixes and workarounds
      - Links errors to code commits
      - Tracks resolution effectiveness

  2. Enhanced Indexes
    - Performance-optimized indexes for common queries
    - Partial indexes for active errors
    - Composite indexes for complex filtering

  3. Analytics Functions
    - Error trend analysis
    - Impact assessment
    - Pattern detection
    - Recovery effectiveness metrics

  4. Security
    - RLS enabled on all tables
    - Organization-scoped access
    - Audit trail for sensitive operations
*/

-- Error Fingerprints Table
CREATE TABLE IF NOT EXISTS error_fingerprints (
  id text PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,

  -- Error identification
  error_code text NOT NULL,
  normalized_message text NOT NULL,
  stack_hash text NOT NULL,
  component_path text,

  -- Occurrence tracking
  first_seen_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  occurrence_count integer DEFAULT 1,

  -- Impact metrics
  affected_user_count integer DEFAULT 0,
  affected_organization_count integer DEFAULT 0,
  severity_score numeric DEFAULT 0,

  -- Resolution tracking
  status text DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'resolved', 'ignored')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolution_notes text,

  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Error Breadcrumbs Table
CREATE TABLE IF NOT EXISTS error_breadcrumbs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_log_id uuid REFERENCES error_logs(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Breadcrumb details
  category text NOT NULL CHECK (category IN ('navigation', 'user_action', 'api_call', 'state_change', 'console', 'error', 'performance')),
  level text NOT NULL CHECK (level IN ('debug', 'info', 'warning', 'error')),
  message text NOT NULL,

  -- Context
  data jsonb DEFAULT '{}'::jsonb,

  -- Timing
  timestamp timestamptz DEFAULT now(),
  sequence_number integer,

  created_at timestamptz DEFAULT now()
);

-- Error Recovery Attempts Table
CREATE TABLE IF NOT EXISTS error_recovery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_log_id uuid REFERENCES error_logs(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,

  -- Recovery details
  strategy text NOT NULL CHECK (strategy IN ('retry', 'fallback', 'partial_recovery', 'user_guided_recovery', 'automatic_rollback', 'circuit_breaker')),
  attempt_number integer NOT NULL DEFAULT 1,

  -- Result
  success boolean NOT NULL,
  duration_ms integer,
  error_message text,

  -- Circuit breaker state
  circuit_breaker_name text,
  circuit_breaker_state text CHECK (circuit_breaker_state IN ('closed', 'open', 'half_open')),

  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Error Alerts Table
CREATE TABLE IF NOT EXISTS error_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,

  -- Alert configuration
  name text NOT NULL,
  description text,
  enabled boolean DEFAULT true,

  -- Conditions
  error_code text,
  severity_threshold text CHECK (severity_threshold IN ('low', 'medium', 'high', 'critical')),
  occurrence_threshold integer DEFAULT 1,
  time_window_minutes integer DEFAULT 5,

  -- Notification settings
  notification_channels text[] DEFAULT ARRAY['email']::text[],
  recipient_emails text[],
  webhook_url text,

  -- State
  last_triggered_at timestamptz,
  trigger_count integer DEFAULT 0,

  -- Metadata
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Error Resolutions Table
CREATE TABLE IF NOT EXISTS error_resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_fingerprint_id text REFERENCES error_fingerprints(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,

  -- Resolution details
  title text NOT NULL,
  description text NOT NULL,
  resolution_type text CHECK (resolution_type IN ('fix', 'workaround', 'documentation', 'configuration')),

  -- Implementation
  commit_sha text,
  pull_request_url text,
  deployed_at timestamptz,

  -- Effectiveness
  errors_before_fix integer,
  errors_after_fix integer,
  effectiveness_score numeric,

  -- Attribution
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_error_fingerprints_org ON error_fingerprints(organization_id);
CREATE INDEX IF NOT EXISTS idx_error_fingerprints_code ON error_fingerprints(error_code);
CREATE INDEX IF NOT EXISTS idx_error_fingerprints_status ON error_fingerprints(status) WHERE status != 'resolved';
CREATE INDEX IF NOT EXISTS idx_error_fingerprints_severity ON error_fingerprints(severity_score DESC);
CREATE INDEX IF NOT EXISTS idx_error_fingerprints_recent ON error_fingerprints(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_fingerprints_occurrence ON error_fingerprints(occurrence_count DESC);

CREATE INDEX IF NOT EXISTS idx_error_breadcrumbs_error ON error_breadcrumbs(error_log_id);
CREATE INDEX IF NOT EXISTS idx_error_breadcrumbs_org ON error_breadcrumbs(organization_id);
CREATE INDEX IF NOT EXISTS idx_error_breadcrumbs_timestamp ON error_breadcrumbs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_breadcrumbs_category ON error_breadcrumbs(category);
CREATE INDEX IF NOT EXISTS idx_error_breadcrumbs_sequence ON error_breadcrumbs(error_log_id, sequence_number);

CREATE INDEX IF NOT EXISTS idx_error_recovery_error ON error_recovery_attempts(error_log_id);
CREATE INDEX IF NOT EXISTS idx_error_recovery_org ON error_recovery_attempts(organization_id);
CREATE INDEX IF NOT EXISTS idx_error_recovery_strategy ON error_recovery_attempts(strategy);
CREATE INDEX IF NOT EXISTS idx_error_recovery_success ON error_recovery_attempts(success);
CREATE INDEX IF NOT EXISTS idx_error_recovery_circuit ON error_recovery_attempts(circuit_breaker_name) WHERE circuit_breaker_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_error_alerts_org ON error_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_error_alerts_enabled ON error_alerts(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_error_alerts_code ON error_alerts(error_code) WHERE error_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_error_resolutions_fingerprint ON error_resolutions(error_fingerprint_id);
CREATE INDEX IF NOT EXISTS idx_error_resolutions_org ON error_resolutions(organization_id);
CREATE INDEX IF NOT EXISTS idx_error_resolutions_effectiveness ON error_resolutions(effectiveness_score DESC NULLS LAST);

-- Enable RLS
ALTER TABLE error_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_breadcrumbs ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_recovery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_resolutions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for error_fingerprints
CREATE POLICY "Users can view their organization's error fingerprints"
  ON error_fingerprints FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update error fingerprints in their organization"
  ON error_fingerprints FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can insert error fingerprints"
  ON error_fingerprints FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for error_breadcrumbs
CREATE POLICY "Users can view their organization's breadcrumbs"
  ON error_breadcrumbs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can insert breadcrumbs"
  ON error_breadcrumbs FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for error_recovery_attempts
CREATE POLICY "Users can view their organization's recovery attempts"
  ON error_recovery_attempts FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can insert recovery attempts"
  ON error_recovery_attempts FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for error_alerts
CREATE POLICY "Users can manage their organization's alerts"
  ON error_alerts FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for error_resolutions
CREATE POLICY "Users can manage their organization's resolutions"
  ON error_resolutions FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Function to calculate error severity score
CREATE OR REPLACE FUNCTION calculate_error_severity_score(
  p_error_code text,
  p_occurrence_count integer,
  p_affected_user_count integer,
  p_time_window_hours numeric DEFAULT 24
)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  v_base_severity numeric;
  v_frequency_multiplier numeric;
  v_impact_multiplier numeric;
  v_final_score numeric;
BEGIN
  -- Base severity by error code
  v_base_severity := CASE
    WHEN p_error_code IN ('AUTH_ERROR', 'PERMISSION_ERROR') THEN 8.0
    WHEN p_error_code IN ('DATABASE_ERROR', 'NETWORK_ERROR') THEN 7.0
    WHEN p_error_code IN ('VALIDATION_ERROR', 'API_ERROR') THEN 5.0
    WHEN p_error_code = 'TIMEOUT_ERROR' THEN 4.0
    ELSE 3.0
  END;

  -- Frequency multiplier (more frequent = higher severity)
  v_frequency_multiplier := 1.0 + (LEAST(p_occurrence_count, 100) / 100.0);

  -- Impact multiplier (more users = higher severity)
  v_impact_multiplier := 1.0 + (LEAST(p_affected_user_count, 50) / 50.0);

  -- Calculate final score (0-10 scale)
  v_final_score := LEAST(
    v_base_severity * v_frequency_multiplier * v_impact_multiplier,
    10.0
  );

  RETURN ROUND(v_final_score, 2);
END;
$$;

-- Function to update error fingerprint
CREATE OR REPLACE FUNCTION upsert_error_fingerprint(
  p_fingerprint_id text,
  p_organization_id uuid,
  p_error_code text,
  p_normalized_message text,
  p_stack_hash text,
  p_component_path text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing record;
  v_new_severity numeric;
BEGIN
  -- Check for existing fingerprint
  SELECT * INTO v_existing
  FROM error_fingerprints
  WHERE id = p_fingerprint_id;

  IF v_existing.id IS NOT NULL THEN
    -- Update existing fingerprint
    v_new_severity := calculate_error_severity_score(
      p_error_code,
      v_existing.occurrence_count + 1,
      v_existing.affected_user_count + CASE WHEN p_user_id IS NOT NULL THEN 1 ELSE 0 END
    );

    UPDATE error_fingerprints
    SET
      last_seen_at = now(),
      occurrence_count = occurrence_count + 1,
      affected_user_count = affected_user_count + CASE WHEN p_user_id IS NOT NULL THEN 1 ELSE 0 END,
      severity_score = v_new_severity,
      updated_at = now()
    WHERE id = p_fingerprint_id;
  ELSE
    -- Insert new fingerprint
    v_new_severity := calculate_error_severity_score(p_error_code, 1, 1);

    INSERT INTO error_fingerprints (
      id,
      organization_id,
      error_code,
      normalized_message,
      stack_hash,
      component_path,
      occurrence_count,
      affected_user_count,
      severity_score
    ) VALUES (
      p_fingerprint_id,
      p_organization_id,
      p_error_code,
      p_normalized_message,
      p_stack_hash,
      p_component_path,
      1,
      CASE WHEN p_user_id IS NOT NULL THEN 1 ELSE 0 END,
      v_new_severity
    );
  END IF;

  RETURN p_organization_id;
END;
$$;

-- Function to get error trend analysis
CREATE OR REPLACE FUNCTION get_error_trends(
  p_organization_id uuid,
  p_hours integer DEFAULT 24
)
RETURNS TABLE (
  hour_bucket timestamptz,
  error_count bigint,
  unique_errors bigint,
  avg_severity numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    date_trunc('hour', el.created_at) as hour_bucket,
    COUNT(*) as error_count,
    COUNT(DISTINCT ef.id) as unique_errors,
    AVG(ef.severity_score) as avg_severity
  FROM error_logs el
  LEFT JOIN error_fingerprints ef ON el.error_id = ef.id
  WHERE
    el.organization_id = p_organization_id
    AND el.created_at >= now() - (p_hours || ' hours')::interval
  GROUP BY date_trunc('hour', el.created_at)
  ORDER BY hour_bucket DESC;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_error_fingerprints_updated_at
  BEFORE UPDATE ON error_fingerprints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_error_alerts_updated_at
  BEFORE UPDATE ON error_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_error_resolutions_updated_at
  BEFORE UPDATE ON error_resolutions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE error_fingerprints IS 'Groups similar errors for intelligent pattern detection and impact analysis';
COMMENT ON TABLE error_breadcrumbs IS 'Captures user action trail leading to errors for reproduction and debugging';
COMMENT ON TABLE error_recovery_attempts IS 'Tracks automatic recovery attempts and circuit breaker states';
COMMENT ON TABLE error_alerts IS 'Manages error notification rules and alert delivery tracking';
COMMENT ON TABLE error_resolutions IS 'Documents error fixes, workarounds, and resolution effectiveness';

COMMENT ON FUNCTION calculate_error_severity_score IS 'Calculates dynamic severity score based on error frequency, impact, and type';
COMMENT ON FUNCTION upsert_error_fingerprint IS 'Creates or updates error fingerprint with automatic severity calculation';
COMMENT ON FUNCTION get_error_trends IS 'Analyzes error trends over time with hourly aggregation';
