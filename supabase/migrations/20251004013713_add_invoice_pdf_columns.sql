/*
  # Add invoice PDF columns to warranties table

  1. Changes
    - Add `customer_invoice_pdf_url` column to store customer invoice (text, base64)
    - Add `merchant_invoice_pdf_url` column to store merchant invoice with margins (text, base64)
  
  2. Notes
    - Both columns are nullable to maintain compatibility with existing records
    - Base64 format allows direct storage without file system dependencies
    - Customer invoice: Standard invoice for the client
    - Merchant invoice: Internal invoice showing margins and commissions
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warranties' AND column_name = 'customer_invoice_pdf_url'
  ) THEN
    ALTER TABLE warranties ADD COLUMN customer_invoice_pdf_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warranties' AND column_name = 'merchant_invoice_pdf_url'
  ) THEN
    ALTER TABLE warranties ADD COLUMN merchant_invoice_pdf_url text;
  END IF;
END $$;