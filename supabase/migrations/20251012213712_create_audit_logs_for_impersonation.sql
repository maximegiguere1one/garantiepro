/*
  # Create Audit Logs Table for Impersonation Tracking

  1. New Tables
    - `audit_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles) - The real user performing the action
      - `action` (text) - Action name (e.g., 'impersonation_start', 'impersonation_stop', 'impersonation_action')
      - `entity_type` (text) - Type of entity (e.g., 'organization', 'warranty', 'user')
      - `entity_id` (uuid) - ID of the entity affected
      - `metadata` (jsonb) - Additional context (impersonation details, request info, etc.)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `audit_logs` table
    - Only master users can read audit logs
    - System can insert logs (via service role)

  3. Indexes
    - Index on user_id for fast user activity lookup
    - Index on action for filtering by action type
    - Index on entity_type and entity_id for entity history
    - Index on created_at for time-based queries
    - GIN index on metadata for JSON queries
*/

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata ON audit_logs USING GIN(metadata);

-- RLS Policies

-- Master users can read all audit logs
CREATE POLICY "Master users can read all audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'master'
    )
  );

-- Allow service role to insert audit logs (for edge functions)
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create a helper function to log impersonation actions
CREATE OR REPLACE FUNCTION log_impersonation_action(
  p_user_id uuid,
  p_action text,
  p_entity_type text DEFAULT 'organization',
  p_entity_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (p_user_id, p_action, p_entity_type, p_entity_id, p_metadata)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION log_impersonation_action TO authenticated;

COMMENT ON TABLE audit_logs IS 'Audit trail for all important actions, especially impersonation';
COMMENT ON FUNCTION log_impersonation_action IS 'Helper function to log impersonation actions with proper context';