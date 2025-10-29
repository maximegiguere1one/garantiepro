/*
  # Create Audit Logs Table

  1. New Tables
    - `audit_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `user_email` (text)
      - `action` (text) - type of action performed
      - `resource_type` (text) - type of resource affected
      - `resource_id` (text, nullable) - ID of affected resource
      - `organization_id` (uuid, nullable) - related organization
      - `details` (jsonb) - additional action details
      - `ip_address` (text, nullable)
      - `user_agent` (text, nullable)
      - `created_at` (timestamptz)

  2. Indexes
    - Index on user_id for user-specific queries
    - Index on action for filtering by action type
    - Index on organization_id for org-specific logs
    - Index on created_at for time-based queries

  3. Security
    - Enable RLS on `audit_logs` table
    - Only master admins can read audit logs
    - System can write logs (for automatic logging)
*/

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only master admins can read audit logs
CREATE POLICY "Master admins can read audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN organizations ON profiles.organization_id = organizations.id
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND organizations.type = 'owner'
    )
  );

-- Policy: System can insert audit logs
CREATE POLICY "System can insert audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add helpful comments
COMMENT ON TABLE audit_logs IS 'Tracks all master-level actions for security and compliance';
COMMENT ON COLUMN audit_logs.action IS 'Type of action performed (e.g., franchise_created, context_switched)';
COMMENT ON COLUMN audit_logs.details IS 'JSON object with additional action-specific details';
