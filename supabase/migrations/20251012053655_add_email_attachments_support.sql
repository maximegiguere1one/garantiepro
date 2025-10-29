/*
  # Add Email Attachments Support

  ## Overview
  This migration adds support for email attachments to the email_queue table.
  This is critical for sending warranty contracts and other documents to customers.

  ## Changes

  1. **New Column: `attachments`**
     - Type: JSONB array of attachment objects
     - Each attachment object contains:
       - `filename`: Name of the file (e.g., "Contrat-PPR-123.pdf")
       - `content`: Base64-encoded file content
       - `content_type`: MIME type (e.g., "application/pdf")
       - `size`: File size in bytes (optional, for logging)

  2. **Benefits**
     - Customers receive their signed contract immediately via email
     - Contracts are sent as proper PDF attachments
     - Supports multiple attachments per email
     - Backwards compatible (attachments column is nullable)

  ## Usage Example
  ```sql
  INSERT INTO email_queue (
    to_email,
    subject,
    html_body,
    attachments,
    ...
  ) VALUES (
    'customer@example.com',
    'Your Contract',
    '<html>...</html>',
    '[{
      "filename": "Contract-123.pdf",
      "content": "JVBERi0xLjQKJeLjz9...",
      "content_type": "application/pdf"
    }]'::jsonb,
    ...
  );
  ```
*/

-- =====================================================
-- Add attachments column to email_queue
-- =====================================================

-- Add the attachments column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_queue' AND column_name = 'attachments'
  ) THEN
    ALTER TABLE email_queue
    ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;

    RAISE NOTICE 'Added attachments column to email_queue table';
  ELSE
    RAISE NOTICE 'Attachments column already exists in email_queue table';
  END IF;
END $$;

-- Add a check constraint to ensure attachments is always an array
ALTER TABLE email_queue
DROP CONSTRAINT IF EXISTS email_queue_attachments_is_array;

ALTER TABLE email_queue
ADD CONSTRAINT email_queue_attachments_is_array
CHECK (jsonb_typeof(attachments) = 'array');

-- Add helpful comment
COMMENT ON COLUMN email_queue.attachments IS
'JSONB array of email attachments. Each attachment object should contain: filename (text), content (base64 string), content_type (text), and optionally size (integer). Example: [{"filename": "contract.pdf", "content": "JVBERi0...", "content_type": "application/pdf"}]';

-- Create an index for performance (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_email_queue_has_attachments
ON email_queue ((attachments <> '[]'::jsonb))
WHERE status IN ('queued', 'sending');

COMMENT ON INDEX idx_email_queue_has_attachments IS
'Performance index to quickly find emails with attachments that need processing';

-- =====================================================
-- Verification and logging
-- =====================================================

DO $$
DECLARE
  queue_count integer;
  with_attachments integer;
BEGIN
  -- Count total emails in queue
  SELECT COUNT(*) INTO queue_count FROM email_queue;

  -- Count emails with attachments (should be 0 initially)
  SELECT COUNT(*) INTO with_attachments
  FROM email_queue
  WHERE attachments <> '[]'::jsonb;

  RAISE NOTICE '=== Email Attachments Support Added ===';
  RAISE NOTICE 'Total emails in queue: %', queue_count;
  RAISE NOTICE 'Emails with attachments: %', with_attachments;
  RAISE NOTICE 'New emails can now include PDF contracts and other attachments';
  RAISE NOTICE 'Attachments are stored as JSONB with base64-encoded content';
  RAISE NOTICE '==========================================';
END $$;
