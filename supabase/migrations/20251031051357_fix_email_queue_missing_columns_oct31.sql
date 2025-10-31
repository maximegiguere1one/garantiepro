/*
  # Fix Email Queue Missing Columns

  1. Problem
     - The `notify_new_warranty()` trigger tries to insert `template_name` and `scheduled_for`
     - These columns don't exist in the `email_queue` table
     - Causes warranty creation to fail after successful insert
  
  2. Solution
     - Add `template_name` column (text, nullable) for tracking email types
     - Add `scheduled_for` column (timestamptz) for scheduling emails
     - Both columns are optional to maintain backward compatibility
  
  3. Impact
     - Warranties can now be created without email errors
     - Email notifications will work correctly
     - Existing email queue entries are unaffected
*/

-- Add missing columns to email_queue
ALTER TABLE email_queue
ADD COLUMN IF NOT EXISTS template_name text,
ADD COLUMN IF NOT EXISTS scheduled_for timestamptz DEFAULT now();

-- Add index for better performance on scheduled emails
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled_for 
ON email_queue(scheduled_for) 
WHERE status = 'queued';

-- Add index for template-based queries
CREATE INDEX IF NOT EXISTS idx_email_queue_template_name 
ON email_queue(template_name) 
WHERE template_name IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN email_queue.template_name IS 'Name of the email template used (e.g., warranty_created, claim_submitted)';
COMMENT ON COLUMN email_queue.scheduled_for IS 'When the email should be sent (defaults to now for immediate delivery)';
