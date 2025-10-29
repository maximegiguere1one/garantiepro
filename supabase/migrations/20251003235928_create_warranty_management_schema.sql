/*
  # Warranty Management System - Core Database Schema

  ## Overview
  This migration creates the complete database structure for a trailer warranty management system
  that handles sales, contracts, payments, claims, and compliance tracking.

  ## New Tables

  ### 1. `profiles`
  User profiles with role-based access control
  - `id` (uuid, references auth.users)
  - `email` (text)
  - `full_name` (text)
  - `role` (text: admin, f_and_i, operations, client)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `warranty_plans`
  Available warranty plan templates
  - `id` (uuid, primary key)
  - `name` (text: Essential, Plus, Premium, Commercial)
  - `name_fr` (text)
  - `name_en` (text)
  - `base_price` (numeric)
  - `coverage_matrix` (jsonb: included, excluded, limits)
  - `contract_template_fr` (text)
  - `contract_template_en` (text)
  - `is_active` (boolean)
  - `version` (integer)
  - `status` (text: draft, published)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `warranty_options`
  Additional coverage options
  - `id` (uuid, primary key)
  - `name` (text)
  - `name_fr` (text)
  - `name_en` (text)
  - `price` (numeric)
  - `description` (text)
  - `is_active` (boolean)
  - `created_at` (timestamptz)

  ### 4. `customers`
  Customer information
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `first_name` (text)
  - `last_name` (text)
  - `email` (text)
  - `phone` (text)
  - `address` (text)
  - `city` (text)
  - `province` (text)
  - `postal_code` (text)
  - `language_preference` (text: fr, en)
  - `consent_marketing` (boolean)
  - `consent_date` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 5. `trailers`
  Trailer information
  - `id` (uuid, primary key)
  - `customer_id` (uuid, references customers)
  - `vin` (text, unique)
  - `make` (text)
  - `model` (text)
  - `year` (integer)
  - `trailer_type` (text)
  - `purchase_date` (date)
  - `purchase_price` (numeric)
  - `created_at` (timestamptz)

  ### 6. `warranties`
  Warranty contracts
  - `id` (uuid, primary key)
  - `contract_number` (text, unique)
  - `customer_id` (uuid, references customers)
  - `trailer_id` (uuid, references trailers)
  - `plan_id` (uuid, references warranty_plans)
  - `language` (text: fr, en)
  - `province` (text)
  - `start_date` (date)
  - `end_date` (date)
  - `duration_months` (integer)
  - `base_price` (numeric)
  - `options_price` (numeric)
  - `taxes` (numeric)
  - `total_price` (numeric)
  - `margin` (numeric)
  - `deductible` (numeric)
  - `selected_options` (jsonb)
  - `status` (text: draft, active, expired, cancelled)
  - `contract_pdf_url` (text)
  - `signature_proof_url` (text)
  - `signed_at` (timestamptz)
  - `signature_ip` (text)
  - `legal_validation_passed` (boolean)
  - `legal_validation_errors` (jsonb)
  - `legal_validation_warnings` (jsonb)
  - `sale_duration_seconds` (integer)
  - `created_by` (uuid, references profiles)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 7. `payments`
  Payment transactions
  - `id` (uuid, primary key)
  - `warranty_id` (uuid, references warranties)
  - `stripe_payment_intent_id` (text)
  - `amount` (numeric)
  - `currency` (text)
  - `status` (text: pending, completed, failed, refunded)
  - `payment_method` (text)
  - `receipt_url` (text)
  - `invoice_pdf_url` (text)
  - `refund_amount` (numeric)
  - `refund_reason` (text)
  - `refunded_at` (timestamptz)
  - `created_at` (timestamptz)

  ### 8. `claims`
  Warranty claims
  - `id` (uuid, primary key)
  - `claim_number` (text, unique)
  - `warranty_id` (uuid, references warranties)
  - `customer_id` (uuid, references customers)
  - `incident_date` (date)
  - `incident_description` (text)
  - `reported_date` (date)
  - `current_step` (integer: 1-5)
  - `status` (text: submitted, under_review, approved, partially_approved, denied, completed)
  - `approved_amount` (numeric)
  - `denied_reason` (text)
  - `repair_shop_name` (text)
  - `repair_shop_contact` (text)
  - `po_number` (text)
  - `po_amount` (numeric)
  - `issue_letter_sent_at` (timestamptz)
  - `issue_letter_type` (text: approved, partially_approved, denied)
  - `sla_deadline` (timestamptz)
  - `assigned_to` (uuid, references profiles)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - `completed_at` (timestamptz)

  ### 9. `claim_timeline`
  Claim activity history
  - `id` (uuid, primary key)
  - `claim_id` (uuid, references claims)
  - `event_type` (text)
  - `description` (text)
  - `created_by` (uuid, references profiles)
  - `metadata` (jsonb)
  - `created_at` (timestamptz)

  ### 10. `claim_attachments`
  Claim supporting documents
  - `id` (uuid, primary key)
  - `claim_id` (uuid, references claims)
  - `file_url` (text)
  - `file_name` (text)
  - `file_type` (text)
  - `file_size` (integer)
  - `uploaded_by` (uuid, references profiles)
  - `created_at` (timestamptz)

  ### 11. `loyalty_credits`
  Loyalty program tracking
  - `id` (uuid, primary key)
  - `customer_id` (uuid, references customers)
  - `warranty_id` (uuid, references warranties)
  - `credit_amount` (numeric, default 2000.00)
  - `is_eligible` (boolean)
  - `eligibility_checked_at` (timestamptz)
  - `applied_at` (timestamptz)
  - `created_at` (timestamptz)

  ### 12. `nps_surveys`
  Net Promoter Score tracking
  - `id` (uuid, primary key)
  - `customer_id` (uuid, references customers)
  - `warranty_id` (uuid, references warranties)
  - `claim_id` (uuid, references claims, nullable)
  - `survey_type` (text: post_sale, post_claim)
  - `score` (integer, 0-10)
  - `feedback` (text)
  - `google_review_invited` (boolean)
  - `google_review_invited_at` (timestamptz)
  - `created_at` (timestamptz)

  ### 13. `audit_log`
  Comprehensive audit trail
  - `id` (uuid, primary key)
  - `table_name` (text)
  - `record_id` (uuid)
  - `action` (text: create, update, delete)
  - `old_values` (jsonb)
  - `new_values` (jsonb)
  - `user_id` (uuid, references profiles)
  - `ip_address` (text)
  - `user_agent` (text)
  - `created_at` (timestamptz)

  ### 14. `notifications`
  Multi-channel notification tracking
  - `id` (uuid, primary key)
  - `recipient_id` (uuid, references profiles)
  - `recipient_email` (text)
  - `recipient_phone` (text)
  - `type` (text: email, sms)
  - `template_name` (text)
  - `subject` (text)
  - `body` (text)
  - `status` (text: pending, sent, failed)
  - `sent_at` (timestamptz)
  - `error_message` (text)
  - `metadata` (jsonb)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Policies enforce role-based access
  - Admin: full access
  - F&I: sales and warranty management
  - Operations: claims management
  - Client: view own data only

  ## Indexes
  - Performance indexes on foreign keys and frequently queried columns
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'f_and_i', 'operations', 'client')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create warranty_plans table
CREATE TABLE IF NOT EXISTS warranty_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_fr text NOT NULL,
  name_en text NOT NULL,
  base_price numeric(10,2) NOT NULL,
  coverage_matrix jsonb NOT NULL DEFAULT '{"included":[],"excluded":[],"limits":{}}',
  contract_template_fr text,
  contract_template_en text,
  is_active boolean DEFAULT true,
  version integer DEFAULT 1,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create warranty_options table
CREATE TABLE IF NOT EXISTS warranty_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_fr text NOT NULL,
  name_en text NOT NULL,
  price numeric(10,2) NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  province text NOT NULL,
  postal_code text NOT NULL,
  language_preference text DEFAULT 'fr' CHECK (language_preference IN ('fr', 'en')),
  consent_marketing boolean DEFAULT false,
  consent_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create trailers table
CREATE TABLE IF NOT EXISTS trailers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  vin text UNIQUE NOT NULL,
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  trailer_type text NOT NULL,
  purchase_date date NOT NULL,
  purchase_price numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create warranties table
CREATE TABLE IF NOT EXISTS warranties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text UNIQUE NOT NULL,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  trailer_id uuid NOT NULL REFERENCES trailers(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES warranty_plans(id),
  language text NOT NULL CHECK (language IN ('fr', 'en')),
  province text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  duration_months integer NOT NULL,
  base_price numeric(10,2) NOT NULL,
  options_price numeric(10,2) DEFAULT 0,
  taxes numeric(10,2) NOT NULL,
  total_price numeric(10,2) NOT NULL,
  margin numeric(10,2) NOT NULL,
  deductible numeric(10,2) NOT NULL,
  selected_options jsonb DEFAULT '[]',
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'expired', 'cancelled')),
  contract_pdf_url text,
  signature_proof_url text,
  signed_at timestamptz,
  signature_ip text,
  legal_validation_passed boolean DEFAULT false,
  legal_validation_errors jsonb DEFAULT '[]',
  legal_validation_warnings jsonb DEFAULT '[]',
  sale_duration_seconds integer,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id uuid NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,
  stripe_payment_intent_id text,
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'CAD',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method text,
  receipt_url text,
  invoice_pdf_url text,
  refund_amount numeric(10,2),
  refund_reason text,
  refunded_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create claims table
CREATE TABLE IF NOT EXISTS claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number text UNIQUE NOT NULL,
  warranty_id uuid NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  incident_date date NOT NULL,
  incident_description text NOT NULL,
  reported_date date DEFAULT CURRENT_DATE,
  current_step integer DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 5),
  status text DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'partially_approved', 'denied', 'completed')),
  approved_amount numeric(10,2),
  denied_reason text,
  repair_shop_name text,
  repair_shop_contact text,
  po_number text,
  po_amount numeric(10,2),
  issue_letter_sent_at timestamptz,
  issue_letter_type text CHECK (issue_letter_type IN ('approved', 'partially_approved', 'denied')),
  sla_deadline timestamptz,
  assigned_to uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create claim_timeline table
CREATE TABLE IF NOT EXISTS claim_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text NOT NULL,
  created_by uuid REFERENCES profiles(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create claim_attachments table
CREATE TABLE IF NOT EXISTS claim_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Create loyalty_credits table
CREATE TABLE IF NOT EXISTS loyalty_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  warranty_id uuid NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,
  credit_amount numeric(10,2) DEFAULT 2000.00,
  is_eligible boolean DEFAULT true,
  eligibility_checked_at timestamptz,
  applied_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create nps_surveys table
CREATE TABLE IF NOT EXISTS nps_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  warranty_id uuid REFERENCES warranties(id) ON DELETE CASCADE,
  claim_id uuid REFERENCES claims(id) ON DELETE SET NULL,
  survey_type text NOT NULL CHECK (survey_type IN ('post_sale', 'post_claim')),
  score integer CHECK (score >= 0 AND score <= 10),
  feedback text,
  google_review_invited boolean DEFAULT false,
  google_review_invited_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  old_values jsonb,
  new_values jsonb,
  user_id uuid REFERENCES profiles(id),
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid REFERENCES profiles(id),
  recipient_email text,
  recipient_phone text,
  type text NOT NULL CHECK (type IN ('email', 'sms')),
  template_name text NOT NULL,
  subject text,
  body text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_trailers_customer_id ON trailers(customer_id);
CREATE INDEX IF NOT EXISTS idx_trailers_vin ON trailers(vin);
CREATE INDEX IF NOT EXISTS idx_warranties_customer_id ON warranties(customer_id);
CREATE INDEX IF NOT EXISTS idx_warranties_contract_number ON warranties(contract_number);
CREATE INDEX IF NOT EXISTS idx_warranties_status ON warranties(status);
CREATE INDEX IF NOT EXISTS idx_payments_warranty_id ON payments(warranty_id);
CREATE INDEX IF NOT EXISTS idx_claims_warranty_id ON claims(warranty_id);
CREATE INDEX IF NOT EXISTS idx_claims_claim_number ON claims(claim_number);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claim_timeline_claim_id ON claim_timeline(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_attachments_claim_id ON claim_attachments(claim_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trailers ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE nps_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for warranty_plans
CREATE POLICY "Anyone can view published warranty plans"
  ON warranty_plans FOR SELECT
  TO authenticated
  USING (status = 'published' OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'f_and_i')
  ));

CREATE POLICY "Admin and F&I can manage warranty plans"
  ON warranty_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i')
    )
  );

-- RLS Policies for warranty_options
CREATE POLICY "Anyone can view active warranty options"
  ON warranty_options FOR SELECT
  TO authenticated
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'f_and_i')
  ));

CREATE POLICY "Admin and F&I can manage warranty options"
  ON warranty_options FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i')
    )
  );

-- RLS Policies for customers
CREATE POLICY "Staff can view all customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i', 'operations')
    )
  );

CREATE POLICY "Clients can view own customer record"
  ON customers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Staff can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i')
    )
  );

-- RLS Policies for trailers
CREATE POLICY "Staff can view all trailers"
  ON trailers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i', 'operations')
    )
  );

CREATE POLICY "Clients can view own trailers"
  ON trailers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = trailers.customer_id
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage trailers"
  ON trailers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i')
    )
  );

-- RLS Policies for warranties
CREATE POLICY "Staff can view all warranties"
  ON warranties FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i', 'operations')
    )
  );

CREATE POLICY "Clients can view own warranties"
  ON warranties FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = warranties.customer_id
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage warranties"
  ON warranties FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i')
    )
  );

-- RLS Policies for payments
CREATE POLICY "Staff can view all payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i', 'operations')
    )
  );

CREATE POLICY "Clients can view own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM warranties
      JOIN customers ON warranties.customer_id = customers.id
      WHERE warranties.id = payments.warranty_id
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage payments"
  ON payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i')
    )
  );

-- RLS Policies for claims
CREATE POLICY "Staff can view all claims"
  ON claims FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i', 'operations')
    )
  );

CREATE POLICY "Clients can view own claims"
  ON claims FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = claims.customer_id
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Operations staff can manage claims"
  ON claims FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'operations')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'operations')
    )
  );

CREATE POLICY "Clients can create claims"
  ON claims FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = claims.customer_id
      AND customers.user_id = auth.uid()
    )
  );

-- RLS Policies for claim_timeline
CREATE POLICY "Users can view claim timeline for accessible claims"
  ON claim_timeline FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM claims
      JOIN customers ON claims.customer_id = customers.id
      WHERE claims.id = claim_timeline.claim_id
      AND (
        customers.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'operations')
        )
      )
    )
  );

CREATE POLICY "Staff can add claim timeline entries"
  ON claim_timeline FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'operations')
    )
  );

-- RLS Policies for claim_attachments
CREATE POLICY "Users can view attachments for accessible claims"
  ON claim_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM claims
      JOIN customers ON claims.customer_id = customers.id
      WHERE claims.id = claim_attachments.claim_id
      AND (
        customers.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'operations')
        )
      )
    )
  );

CREATE POLICY "Users can add attachments to accessible claims"
  ON claim_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM claims
      JOIN customers ON claims.customer_id = customers.id
      WHERE claims.id = claim_attachments.claim_id
      AND (
        customers.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'operations')
        )
      )
    )
  );

-- RLS Policies for loyalty_credits
CREATE POLICY "Staff can view all loyalty credits"
  ON loyalty_credits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i', 'operations')
    )
  );

CREATE POLICY "Clients can view own loyalty credits"
  ON loyalty_credits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = loyalty_credits.customer_id
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage loyalty credits"
  ON loyalty_credits FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i')
    )
  );

-- RLS Policies for nps_surveys
CREATE POLICY "Staff can view all NPS surveys"
  ON nps_surveys FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i', 'operations')
    )
  );

CREATE POLICY "Clients can view own NPS surveys"
  ON nps_surveys FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = nps_surveys.customer_id
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can submit NPS surveys"
  ON nps_surveys FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can manage NPS surveys"
  ON nps_surveys FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'f_and_i')
    )
  );

-- RLS Policies for audit_log
CREATE POLICY "Admins can view all audit logs"
  ON audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System can insert audit logs"
  ON audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "Staff can view all notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'operations')
    )
  );

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can update notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'operations')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'operations')
    )
  );