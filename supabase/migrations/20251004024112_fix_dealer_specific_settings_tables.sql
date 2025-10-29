/*
  # Fix Dealer-Specific Settings Tables

  ## Summary
  This migration creates the missing dealer-specific settings tables that are referenced in the frontend code
  but don't exist in the database schema. It also updates existing tables to support multi-tenant dealer isolation.

  ## New Tables Created

  ### 1. `tax_settings`
  Dealer-specific tax configuration for different provinces and tax types
  - `id` (uuid, primary key)
  - `dealer_id` (uuid, references profiles) - Links to specific dealer
  - `gst_rate` (numeric) - GST tax rate percentage
  - `qst_rate` (numeric) - QST tax rate percentage  
  - `pst_rate` (numeric) - PST tax rate percentage
  - `hst_rate` (numeric) - HST tax rate percentage
  - `apply_gst` (boolean) - Whether to apply GST
  - `apply_qst` (boolean) - Whether to apply QST
  - `apply_pst` (boolean) - Whether to apply PST
  - `apply_hst` (boolean) - Whether to apply HST
  - `tax_number_gst` (text) - GST registration number
  - `tax_number_qst` (text) - QST registration number
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `pricing_settings`
  Dealer-specific pricing rules and margin configuration
  - `id` (uuid, primary key)
  - `dealer_id` (uuid, references profiles) - Links to specific dealer
  - `default_margin_percentage` (numeric) - Default profit margin %
  - `minimum_warranty_price` (numeric) - Minimum allowed price
  - `maximum_warranty_price` (numeric) - Maximum allowed price
  - `price_rounding_method` (text) - How to round prices (none, nearest, up, down)
  - `price_rounding_to` (numeric) - Round to specific decimal (e.g., 0.99)
  - `apply_volume_discounts` (boolean) - Enable volume discounts
  - `volume_discount_threshold` (integer) - Number of warranties for discount
  - `volume_discount_percentage` (numeric) - Discount percentage for volume
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `notification_settings`
  Dealer-specific notification preferences and channels
  - `id` (uuid, primary key)
  - `dealer_id` (uuid, references profiles) - Links to specific dealer
  - `email_notifications` (boolean) - Enable email notifications
  - `sms_notifications` (boolean) - Enable SMS notifications
  - `notify_new_warranty` (boolean) - Notify on new warranty creation
  - `notify_warranty_expiring` (boolean) - Notify when warranty expiring
  - `notify_claim_submitted` (boolean) - Notify on claim submission
  - `notify_claim_approved` (boolean) - Notify on claim approval
  - `notify_claim_rejected` (boolean) - Notify on claim rejection
  - `expiring_warranty_days` (integer) - Days before expiry to notify
  - `notification_email` (text) - Email address for notifications
  - `notification_phone` (text) - Phone number for SMS notifications
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Table Modifications

  ### 4. `warranty_options` - Add dealer support
  - Add `dealer_id` column for dealer-specific options
  - Add `price_modifier` column to replace fixed price
  - Add `modifier_type` column (fixed or percentage)
  - Keep existing columns for backward compatibility

  ### 5. `company_settings` - Add dealer isolation
  - Add `dealer_id` column for multi-tenant support

  ### 6. `claim_settings` - Add dealer isolation
  - Add `dealer_id` column for dealer-specific claim rules

  ## Security (RLS Policies)
  - Enable RLS on all new tables
  - Dealers can only view/edit their own settings
  - Use dealer_id = auth.uid() for access control
  - Allow INSERT for initial settings creation
  - Allow UPDATE for settings modifications

  ## Important Notes
  - All settings tables use dealer_id as foreign key to profiles table
  - Default values provided for all new columns
  - Existing data preserved with safe column additions
  - Indexes added for dealer_id lookups
  - UPSERT operations supported via unique constraints
*/

-- =====================================================
-- 1. Create tax_settings table
-- =====================================================
CREATE TABLE IF NOT EXISTS tax_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  gst_rate numeric(5,3) NOT NULL DEFAULT 5.0,
  qst_rate numeric(5,3) NOT NULL DEFAULT 9.975,
  pst_rate numeric(5,3) NOT NULL DEFAULT 0,
  hst_rate numeric(5,3) NOT NULL DEFAULT 0,
  apply_gst boolean NOT NULL DEFAULT true,
  apply_qst boolean NOT NULL DEFAULT true,
  apply_pst boolean NOT NULL DEFAULT false,
  apply_hst boolean NOT NULL DEFAULT false,
  tax_number_gst text DEFAULT '',
  tax_number_qst text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(dealer_id)
);

ALTER TABLE tax_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealers can view own tax settings"
  ON tax_settings FOR SELECT
  TO authenticated
  USING (dealer_id = auth.uid());

CREATE POLICY "Dealers can insert own tax settings"
  ON tax_settings FOR INSERT
  TO authenticated
  WITH CHECK (dealer_id = auth.uid());

CREATE POLICY "Dealers can update own tax settings"
  ON tax_settings FOR UPDATE
  TO authenticated
  USING (dealer_id = auth.uid())
  WITH CHECK (dealer_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_tax_settings_dealer_id ON tax_settings(dealer_id);

-- =====================================================
-- 2. Create pricing_settings table
-- =====================================================
CREATE TABLE IF NOT EXISTS pricing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  default_margin_percentage numeric(5,2) NOT NULL DEFAULT 20.0,
  minimum_warranty_price numeric(10,2) NOT NULL DEFAULT 50.0,
  maximum_warranty_price numeric(10,2) NOT NULL DEFAULT 10000.0,
  price_rounding_method text NOT NULL DEFAULT 'nearest' CHECK (price_rounding_method IN ('none', 'nearest', 'up', 'down')),
  price_rounding_to numeric(3,2) NOT NULL DEFAULT 0.99,
  apply_volume_discounts boolean NOT NULL DEFAULT false,
  volume_discount_threshold integer NOT NULL DEFAULT 10,
  volume_discount_percentage numeric(5,2) NOT NULL DEFAULT 5.0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(dealer_id)
);

ALTER TABLE pricing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealers can view own pricing settings"
  ON pricing_settings FOR SELECT
  TO authenticated
  USING (dealer_id = auth.uid());

CREATE POLICY "Dealers can insert own pricing settings"
  ON pricing_settings FOR INSERT
  TO authenticated
  WITH CHECK (dealer_id = auth.uid());

CREATE POLICY "Dealers can update own pricing settings"
  ON pricing_settings FOR UPDATE
  TO authenticated
  USING (dealer_id = auth.uid())
  WITH CHECK (dealer_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_pricing_settings_dealer_id ON pricing_settings(dealer_id);

-- =====================================================
-- 3. Create notification_settings table
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email_notifications boolean NOT NULL DEFAULT true,
  sms_notifications boolean NOT NULL DEFAULT false,
  notify_new_warranty boolean NOT NULL DEFAULT true,
  notify_warranty_expiring boolean NOT NULL DEFAULT true,
  notify_claim_submitted boolean NOT NULL DEFAULT true,
  notify_claim_approved boolean NOT NULL DEFAULT true,
  notify_claim_rejected boolean NOT NULL DEFAULT true,
  expiring_warranty_days integer NOT NULL DEFAULT 30,
  notification_email text DEFAULT '',
  notification_phone text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(dealer_id)
);

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealers can view own notification settings"
  ON notification_settings FOR SELECT
  TO authenticated
  USING (dealer_id = auth.uid());

CREATE POLICY "Dealers can insert own notification settings"
  ON notification_settings FOR INSERT
  TO authenticated
  WITH CHECK (dealer_id = auth.uid());

CREATE POLICY "Dealers can update own notification settings"
  ON notification_settings FOR UPDATE
  TO authenticated
  USING (dealer_id = auth.uid())
  WITH CHECK (dealer_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_notification_settings_dealer_id ON notification_settings(dealer_id);

-- =====================================================
-- 4. Update warranty_options table to add dealer support
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warranty_options' AND column_name = 'dealer_id'
  ) THEN
    ALTER TABLE warranty_options ADD COLUMN dealer_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warranty_options' AND column_name = 'price_modifier'
  ) THEN
    ALTER TABLE warranty_options ADD COLUMN price_modifier numeric(10,2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warranty_options' AND column_name = 'modifier_type'
  ) THEN
    ALTER TABLE warranty_options ADD COLUMN modifier_type text NOT NULL DEFAULT 'fixed' CHECK (modifier_type IN ('fixed', 'percentage'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_warranty_options_dealer_id ON warranty_options(dealer_id);

-- Update RLS policies for warranty_options
DROP POLICY IF EXISTS "Anyone can view warranty options" ON warranty_options;
DROP POLICY IF EXISTS "Only admins can modify warranty options" ON warranty_options;

CREATE POLICY "Dealers can view own warranty options"
  ON warranty_options FOR SELECT
  TO authenticated
  USING (dealer_id = auth.uid() OR dealer_id IS NULL);

CREATE POLICY "Dealers can insert own warranty options"
  ON warranty_options FOR INSERT
  TO authenticated
  WITH CHECK (dealer_id = auth.uid());

CREATE POLICY "Dealers can update own warranty options"
  ON warranty_options FOR UPDATE
  TO authenticated
  USING (dealer_id = auth.uid())
  WITH CHECK (dealer_id = auth.uid());

CREATE POLICY "Dealers can delete own warranty options"
  ON warranty_options FOR DELETE
  TO authenticated
  USING (dealer_id = auth.uid());

-- =====================================================
-- 5. Update company_settings to add dealer_id
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'dealer_id'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN dealer_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
    ALTER TABLE company_settings ADD UNIQUE (dealer_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'address'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN address text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'city'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN city text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'province'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN province text DEFAULT 'QC';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'postal_code'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN postal_code text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'phone'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN phone text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'email'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN email text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'website'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN website text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'tax_number'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN tax_number text DEFAULT '';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_company_settings_dealer_id ON company_settings(dealer_id);

-- Update RLS policies for company_settings
DROP POLICY IF EXISTS "Anyone can view company settings" ON company_settings;
DROP POLICY IF EXISTS "Only admins can update company settings" ON company_settings;
DROP POLICY IF EXISTS "Only admins can insert company settings" ON company_settings;

CREATE POLICY "Dealers can view own company settings"
  ON company_settings FOR SELECT
  TO authenticated
  USING (dealer_id = auth.uid() OR dealer_id IS NULL);

CREATE POLICY "Dealers can insert own company settings"
  ON company_settings FOR INSERT
  TO authenticated
  WITH CHECK (dealer_id = auth.uid());

CREATE POLICY "Dealers can update own company settings"
  ON company_settings FOR UPDATE
  TO authenticated
  USING (dealer_id = auth.uid())
  WITH CHECK (dealer_id = auth.uid());

-- =====================================================
-- 6. Update claim_settings to add dealer_id
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claim_settings' AND column_name = 'dealer_id'
  ) THEN
    ALTER TABLE claim_settings ADD COLUMN dealer_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
    ALTER TABLE claim_settings ADD UNIQUE (dealer_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claim_settings' AND column_name = 'auto_approve_under_amount'
  ) THEN
    ALTER TABLE claim_settings ADD COLUMN auto_approve_under_amount numeric(10,2) DEFAULT 100;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claim_settings' AND column_name = 'require_manager_approval'
  ) THEN
    ALTER TABLE claim_settings ADD COLUMN require_manager_approval boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claim_settings' AND column_name = 'manager_approval_threshold'
  ) THEN
    ALTER TABLE claim_settings ADD COLUMN manager_approval_threshold numeric(10,2) DEFAULT 500;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claim_settings' AND column_name = 'allow_partial_approvals'
  ) THEN
    ALTER TABLE claim_settings ADD COLUMN allow_partial_approvals boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claim_settings' AND column_name = 'max_claim_processing_days'
  ) THEN
    ALTER TABLE claim_settings ADD COLUMN max_claim_processing_days integer DEFAULT 14;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claim_settings' AND column_name = 'require_photo_evidence'
  ) THEN
    ALTER TABLE claim_settings ADD COLUMN require_photo_evidence boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claim_settings' AND column_name = 'require_receipt'
  ) THEN
    ALTER TABLE claim_settings ADD COLUMN require_receipt boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claim_settings' AND column_name = 'email_customer_on_status_change'
  ) THEN
    ALTER TABLE claim_settings ADD COLUMN email_customer_on_status_change boolean DEFAULT true;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_claim_settings_dealer_id ON claim_settings(dealer_id);

-- Update RLS policies for claim_settings
DROP POLICY IF EXISTS "Operations and admins can view claim settings" ON claim_settings;
DROP POLICY IF EXISTS "Only admins can modify claim settings" ON claim_settings;

CREATE POLICY "Dealers can view own claim settings"
  ON claim_settings FOR SELECT
  TO authenticated
  USING (dealer_id = auth.uid() OR dealer_id IS NULL);

CREATE POLICY "Dealers can insert own claim settings"
  ON claim_settings FOR INSERT
  TO authenticated
  WITH CHECK (dealer_id = auth.uid());

CREATE POLICY "Dealers can update own claim settings"
  ON claim_settings FOR UPDATE
  TO authenticated
  USING (dealer_id = auth.uid())
  WITH CHECK (dealer_id = auth.uid());
