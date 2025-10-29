/*
  # Create Franchise Messages Table

  1. New Tables
    - `franchise_messages`
      - `id` (uuid, primary key)
      - `from_user_id` (uuid, references auth.users)
      - `from_user_email` (text)
      - `from_organization_id` (uuid, references organizations)
      - `to_organization_id` (uuid, references organizations)
      - `subject` (text)
      - `message` (text)
      - `is_read` (boolean)
      - `is_broadcast` (boolean)
      - `read_at` (timestamptz, nullable)
      - `created_at` (timestamptz)

  2. Indexes
    - Index on from_organization_id for sender queries
    - Index on to_organization_id for recipient queries
    - Index on is_read for unread message filtering
    - Index on created_at for chronological ordering

  3. Security
    - Enable RLS on `franchise_messages` table
    - Master admins can read all messages
    - Franchises can read messages sent to/from them
    - Authenticated users can send messages
*/

-- Create franchise_messages table
CREATE TABLE IF NOT EXISTS franchise_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_user_email text NOT NULL,
  from_organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  to_organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subject text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  is_broadcast boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_franchise_messages_from_org ON franchise_messages(from_organization_id);
CREATE INDEX IF NOT EXISTS idx_franchise_messages_to_org ON franchise_messages(to_organization_id);
CREATE INDEX IF NOT EXISTS idx_franchise_messages_is_read ON franchise_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_franchise_messages_created_at ON franchise_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_franchise_messages_conversation ON franchise_messages(from_organization_id, to_organization_id, created_at);

-- Enable RLS
ALTER TABLE franchise_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Master admins can read all messages
CREATE POLICY "Master admins can read all messages"
  ON franchise_messages
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

-- Policy: Franchises can read their own messages
CREATE POLICY "Franchises can read their messages"
  ON franchise_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.organization_id = from_organization_id
          OR profiles.organization_id = to_organization_id
        )
    )
  );

-- Policy: Authenticated users can send messages
CREATE POLICY "Users can send messages"
  ON franchise_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.organization_id = from_organization_id
    )
  );

-- Policy: Users can update their received messages (mark as read)
CREATE POLICY "Users can update received messages"
  ON franchise_messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.organization_id = to_organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.organization_id = to_organization_id
    )
  );

-- Add helpful comments
COMMENT ON TABLE franchise_messages IS 'Messaging system between master and franchises';
COMMENT ON COLUMN franchise_messages.is_broadcast IS 'True if message was sent to all franchises';
COMMENT ON COLUMN franchise_messages.is_read IS 'True if recipient has read the message';
