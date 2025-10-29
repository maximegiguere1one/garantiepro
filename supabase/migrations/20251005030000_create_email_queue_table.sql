/*
  # Create Email Queue System

  1. New Tables
    - `email_queue`
      - `id` (uuid, primary key)
      - `to` (text) - recipient email
      - `subject` (text) - email subject
      - `body` (text) - email body
      - `template_id` (text, nullable) - template identifier
      - `variables` (jsonb, nullable) - template variables
      - `status` (text) - queued, retry, sent, failed
      - `attempts` (integer) - number of send attempts
      - `max_retries` (integer) - maximum retry attempts
      - `error_message` (text, nullable) - last error message
      - `next_retry_at` (timestamptz) - when to retry
      - `sent_at` (timestamptz, nullable) - when successfully sent
      - `failed_at` (timestamptz, nullable) - when permanently failed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `organization_id` (uuid, nullable) - for multi-tenant isolation

  2. Security
    - Enable RLS on `email_queue` table
    - Add policies for authenticated users to view their own organization's queue
    - Admin users can view all queued emails
*/

CREATE TABLE IF NOT EXISTS email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to text NOT NULL,
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
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "System can insert emails into queue"
  ON email_queue FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update email queue status"
  ON email_queue FOR UPDATE
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION update_email_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_queue_updated_at
  BEFORE UPDATE ON email_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_email_queue_updated_at();
