/*
  # Enhance Audit Logs for Impersonation Support

  ## Description
  This migration enhances the audit_logs table to properly support impersonation tracking.
  It adds columns and updates policies to handle impersonation scenarios.

  ## Changes
  1. Add entity_type and entity_id columns for flexible resource tracking
  2. Add metadata jsonb column for impersonation details
  3. Update RLS policies to allow master users to read logs
  4. Add index on metadata for impersonation queries

  ## Security
  - Master users can read all audit logs
  - All authenticated users can insert logs (for automatic logging)
  - Impersonation actions are clearly marked in metadata
*/

-- Add new columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'entity_type'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN entity_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'entity_id'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN entity_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create index on metadata for impersonation queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata_impersonation
  ON audit_logs USING gin ((metadata->'impersonation'))
  WHERE (metadata->>'impersonation')::boolean = true;

-- Drop old master admin policy if exists
DROP POLICY IF EXISTS "Master admins can read audit logs" ON audit_logs;

-- Create new policy for master users to read all logs
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

-- Create policy for admins to read org-specific logs
CREATE POLICY "Admins can read org audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.organization_id = audit_logs.organization_id
    )
  );

-- Add comments
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity affected (e.g., organization, user, warranty)';
COMMENT ON COLUMN audit_logs.entity_id IS 'ID of the affected entity';
COMMENT ON COLUMN audit_logs.metadata IS 'JSON object with action metadata including impersonation details';

-- Log success
DO $$
BEGIN
  RAISE NOTICE 'Audit logs enhanced for impersonation tracking';
END $$;
