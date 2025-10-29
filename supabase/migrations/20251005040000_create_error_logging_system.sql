/*
  # Error Logging System

  This migration creates a comprehensive error logging system for tracking and monitoring application errors.

  1. New Tables
    - `error_logs`
      - `id` (uuid, primary key)
      - `error_code` (text) - Error code from ErrorCode enum
      - `error_message` (text) - Technical error message
      - `user_message` (text) - User-friendly error message
      - `severity` (text) - Error severity level (low, medium, high, critical)
      - `user_id` (uuid, nullable) - User who encountered the error
      - `organization_id` (uuid, nullable) - Organization context
      - `url` (text, nullable) - URL where error occurred
      - `user_agent` (text, nullable) - Browser/device information
      - `stack_trace` (text, nullable) - Error stack trace
      - `context` (jsonb, nullable) - Additional context data
      - `resolved` (boolean) - Whether error has been resolved
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `error_logs` table
    - Add policies for authenticated users to insert their own errors
    - Add policies for admins to view and manage all errors

  3. Indexes
    - Index on error_code for filtering
    - Index on severity for filtering critical errors
    - Index on user_id for user-specific error tracking
    - Index on organization_id for multi-tenant isolation
    - Index on created_at for time-based queries
    - Index on resolved for filtering unresolved errors
*/

CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_code text NOT NULL,
  error_message text NOT NULL,
  user_message text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
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
  WITH CHECK (
    auth.uid() = user_id OR user_id IS NULL
  );

CREATE POLICY "Users can view their own error logs"
  ON error_logs FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.organization_id = error_logs.organization_id
    )
  );

CREATE POLICY "Admins can update error logs in their organization"
  ON error_logs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.organization_id = error_logs.organization_id
    )
  );

CREATE INDEX IF NOT EXISTS idx_error_logs_code ON error_logs(error_code);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_organization_id ON error_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_code_severity ON error_logs(error_code, severity);

CREATE OR REPLACE FUNCTION get_error_stats(
  p_organization_id uuid,
  p_hours integer DEFAULT 24
)
RETURNS TABLE (
  error_code text,
  severity text,
  count bigint,
  last_occurred timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    el.error_code,
    el.severity,
    COUNT(*) as count,
    MAX(el.created_at) as last_occurred
  FROM error_logs el
  WHERE
    el.organization_id = p_organization_id
    AND el.created_at >= now() - (p_hours || ' hours')::interval
  GROUP BY el.error_code, el.severity
  ORDER BY count DESC, last_occurred DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_critical_errors(
  p_organization_id uuid,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  error_code text,
  error_message text,
  user_message text,
  user_id uuid,
  url text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    el.id,
    el.error_code,
    el.error_message,
    el.user_message,
    el.user_id,
    el.url,
    el.created_at
  FROM error_logs el
  WHERE
    el.organization_id = p_organization_id
    AND el.severity = 'critical'
    AND el.resolved = false
  ORDER BY el.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE error_logs IS 'Stores application errors for monitoring and debugging';
COMMENT ON COLUMN error_logs.error_code IS 'Standardized error code from ErrorCode enum';
COMMENT ON COLUMN error_logs.severity IS 'Error severity: low, medium, high, or critical';
COMMENT ON COLUMN error_logs.context IS 'Additional context data including component stack, user actions, etc.';
COMMENT ON COLUMN error_logs.resolved IS 'Whether the error has been acknowledged and resolved';
