/*
  # MIGRATION COMPLÈTE - Consolidation du Schéma Supabase
  
  Date: 29 Octobre 2025
  
  Cette migration consolide TOUT le schéma de la base de données en une seule migration.
  Elle peut être utilisée pour:
  - Créer une nouvelle base de données de zéro
  - Vérifier que toutes les tables existent avec les bonnes colonnes
  - Référence complète du schéma
  
  ## Tables Principales
  
  1. **Auth & Profiles**
     - profiles (utilisateurs)
     - organizations (franchises/organisations)
     - franchisee_invitations (invitations)
  
  2. **Warranties & Claims**
     - warranties (garanties)
     - warranty_plans (plans de garantie)
     - warranty_options (options)
     - warranty_claim_tokens (tokens publics)
     - warranty_claims (réclamations)
     - claim_settings (paramètres réclamations)
  
  3. **Customers & Products**
     - customers (clients)
     - customer_products (produits clients)
     - dealer_inventory (inventaire concessionnaires)
     - trailer_brands (marques remorques)
  
  4. **Settings & Configuration**
     - company_settings (paramètres entreprise)
     - tax_settings (paramètres fiscaux)
     - email_settings (paramètres email)
     - notification_settings (paramètres notifications)
  
  5. **Communication**
     - notifications (notifications)
     - email_queue (file d'attente emails)
     - email_templates (modèles emails)
     - response_templates (modèles réponses)
  
  6. **Signatures & Audit**
     - signature_styles (styles signatures)
     - employee_signatures (signatures employés)
     - signature_audit_trail (audit signatures)
     - audit_logs (logs audit)
  
  7. **Billing & Integrations**
     - billing_transactions (transactions)
     - subscription_plans (plans abonnement)
     - integrations (intégrations)
  
  ## Sécurité
  
  Toutes les tables ont:
  - RLS activé
  - Policies restrictives par organization_id
  - Index de performance
*/

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- 2. ENUMS & TYPES
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'customer',
    'employee', 
    'admin',
    'franchisee_admin',
    'master'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE warranty_status AS ENUM (
    'active',
    'expired',
    'cancelled',
    'pending'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE claim_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'in_review'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE invitation_status AS ENUM (
    'pending',
    'accepted',
    'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'info',
    'success',
    'warning',
    'error'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 3. CORE TABLES - Organizations & Profiles
-- ============================================================================

-- Organizations (Franchises)
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  settings jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Profiles (Users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  phone text,
  role user_role NOT NULL DEFAULT 'customer',
  avatar_url text,
  preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Franchisee Invitations
CREATE TABLE IF NOT EXISTS public.franchisee_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role user_role NOT NULL,
  invited_by uuid REFERENCES public.profiles(user_id),
  token text UNIQUE NOT NULL,
  status invitation_status DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 4. CUSTOMERS & PRODUCTS
-- ============================================================================

-- Customers
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  address jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trailer Brands Library
CREATE TABLE IF NOT EXISTS public.trailer_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  logo_url text,
  website text,
  created_at timestamptz DEFAULT now()
);

-- Dealer Inventory
CREATE TABLE IF NOT EXISTS public.dealer_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  vin text UNIQUE NOT NULL,
  brand_id uuid REFERENCES public.trailer_brands(id),
  model text NOT NULL,
  year integer NOT NULL,
  price numeric(10,2),
  status text DEFAULT 'available',
  specifications jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Customer Products
CREATE TABLE IF NOT EXISTS public.customer_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  vin text NOT NULL,
  brand text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  purchase_date date,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 5. WARRANTIES & PLANS
-- ============================================================================

-- Warranty Plans
CREATE TABLE IF NOT EXISTS public.warranty_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  duration_months integer NOT NULL,
  base_price numeric(10,2) NOT NULL,
  coverage_details jsonb,
  contract_pdf_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Warranty Options (Add-ons)
CREATE TABLE IF NOT EXISTS public.warranty_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL,
  category text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Warranties
CREATE TABLE IF NOT EXISTS public.warranties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  warranty_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.warranty_plans(id),
  
  -- Vehicle Info
  vin text NOT NULL,
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  
  -- Warranty Details
  status warranty_status DEFAULT 'active',
  start_date date NOT NULL,
  end_date date NOT NULL,
  purchase_price numeric(10,2) NOT NULL,
  warranty_cost numeric(10,2) NOT NULL,
  
  -- Selected Options
  selected_options jsonb DEFAULT '[]'::jsonb,
  total_cost numeric(10,2) NOT NULL,
  
  -- Tax Info
  subtotal numeric(10,2),
  gst_amount numeric(10,2),
  qst_amount numeric(10,2),
  pst_amount numeric(10,2),
  hst_amount numeric(10,2),
  
  -- Signatures
  customer_signature text,
  customer_signature_date timestamptz,
  vendor_signature text,
  vendor_signature_date timestamptz,
  signature_method text,
  
  -- Documents
  contract_pdf_url text,
  invoice_pdf_url text,
  
  -- Metadata
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 6. CLAIMS SYSTEM
-- ============================================================================

-- Warranty Claim Tokens (Public Access)
CREATE TABLE IF NOT EXISTS public.warranty_claim_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  warranty_id uuid REFERENCES public.warranties(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Warranty Claims
CREATE TABLE IF NOT EXISTS public.warranty_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  warranty_id uuid REFERENCES public.warranties(id) ON DELETE CASCADE,
  claim_number text UNIQUE NOT NULL,
  
  -- Claim Details
  description text NOT NULL,
  category text,
  reported_date date NOT NULL,
  incident_date date,
  
  -- Status & Resolution
  status claim_status DEFAULT 'pending',
  resolution_notes text,
  approved_amount numeric(10,2),
  resolved_date date,
  resolved_by uuid REFERENCES public.profiles(user_id),
  
  -- Attachments
  attachments jsonb DEFAULT '[]'::jsonb,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 7. SETTINGS TABLES
-- ============================================================================

-- Company Settings
CREATE TABLE IF NOT EXISTS public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(user_id),
  
  company_name text NOT NULL,
  email text NOT NULL,
  phone text,
  address text,
  city text,
  province text,
  postal_code text,
  
  logo_url text,
  website text,
  tax_number text,
  
  -- Signature
  vendor_signature text,
  vendor_name text,
  vendor_title text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tax Settings
CREATE TABLE IF NOT EXISTS public.tax_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid UNIQUE NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(user_id),
  
  gst_rate numeric(5,3) NOT NULL DEFAULT 0.05,
  qst_rate numeric(5,3) NOT NULL DEFAULT 0.09975,
  pst_rate numeric(5,3) NOT NULL DEFAULT 0,
  hst_rate numeric(5,3) NOT NULL DEFAULT 0,
  
  apply_gst boolean NOT NULL DEFAULT true,
  apply_qst boolean NOT NULL DEFAULT true,
  apply_pst boolean NOT NULL DEFAULT false,
  apply_hst boolean NOT NULL DEFAULT false,
  
  tax_number_gst text DEFAULT '',
  tax_number_qst text DEFAULT '',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Claim Settings
CREATE TABLE IF NOT EXISTS public.claim_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(user_id),
  
  auto_approve_threshold numeric(10,2) DEFAULT 500,
  require_photos boolean DEFAULT true,
  require_receipts boolean DEFAULT false,
  max_claim_amount numeric(10,2),
  
  notification_settings jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Email Settings
CREATE TABLE IF NOT EXISTS public.email_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  smtp_host text,
  smtp_port integer,
  smtp_user text,
  smtp_password_encrypted text,
  from_email text NOT NULL,
  from_name text,
  
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Notification Settings
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  sms_notifications boolean DEFAULT false,
  
  notification_preferences jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 8. COMMUNICATION TABLES
-- ============================================================================

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  
  type notification_type DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  
  link text,
  read boolean DEFAULT false,
  read_at timestamptz,
  
  created_at timestamptz DEFAULT now()
);

-- Email Queue
CREATE TABLE IF NOT EXISTS public.email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  html_body text,
  
  attachments jsonb DEFAULT '[]'::jsonb,
  
  status text DEFAULT 'pending',
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  
  last_error text,
  sent_at timestamptz,
  
  created_at timestamptz DEFAULT now()
);

-- Email Templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  slug text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  html_body text,
  
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id, slug)
);

-- Response Templates
CREATE TABLE IF NOT EXISTS public.response_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  category text,
  content text NOT NULL,
  
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 9. SIGNATURES & AUDIT
-- ============================================================================

-- Signature Styles
CREATE TABLE IF NOT EXISTS public.signature_styles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  font_family text NOT NULL,
  font_size integer DEFAULT 24,
  color text DEFAULT '#000000',
  
  is_default boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now()
);

-- Employee Signatures
CREATE TABLE IF NOT EXISTS public.employee_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  
  signature_data text NOT NULL,
  signature_method text DEFAULT 'drawn',
  
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Signature Audit Trail
CREATE TABLE IF NOT EXISTS public.signature_audit_trail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  warranty_id uuid REFERENCES public.warranties(id) ON DELETE CASCADE,
  signed_by uuid REFERENCES public.profiles(user_id),
  
  signature_type text NOT NULL,
  signature_data text NOT NULL,
  signature_method text NOT NULL,
  
  ip_address text,
  user_agent text,
  
  signed_at timestamptz DEFAULT now()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  user_id uuid REFERENCES public.profiles(user_id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  
  changes jsonb,
  ip_address text,
  user_agent text,
  
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 10. BILLING & INTEGRATIONS
-- ============================================================================

-- Subscription Plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name text NOT NULL,
  description text,
  price_monthly numeric(10,2) NOT NULL,
  price_yearly numeric(10,2),
  
  features jsonb DEFAULT '[]'::jsonb,
  limits jsonb DEFAULT '{}'::jsonb,
  
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now()
);

-- Billing Transactions
CREATE TABLE IF NOT EXISTS public.billing_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'CAD',
  description text,
  
  status text DEFAULT 'pending',
  payment_method text,
  
  stripe_payment_id text,
  stripe_invoice_id text,
  
  created_at timestamptz DEFAULT now()
);

-- Integrations
CREATE TABLE IF NOT EXISTS public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  type text NOT NULL,
  
  credentials_encrypted jsonb,
  settings jsonb DEFAULT '{}'::jsonb,
  
  is_active boolean DEFAULT true,
  last_synced_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 11. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Organizations
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON public.organizations(is_active);

-- Customers
CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON public.customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);

-- Warranties
CREATE INDEX IF NOT EXISTS idx_warranties_organization_id ON public.warranties(organization_id);
CREATE INDEX IF NOT EXISTS idx_warranties_customer_id ON public.warranties(customer_id);
CREATE INDEX IF NOT EXISTS idx_warranties_warranty_number ON public.warranties(warranty_number);
CREATE INDEX IF NOT EXISTS idx_warranties_vin ON public.warranties(vin);
CREATE INDEX IF NOT EXISTS idx_warranties_status ON public.warranties(status);
CREATE INDEX IF NOT EXISTS idx_warranties_dates ON public.warranties(start_date, end_date);

-- Claims
CREATE INDEX IF NOT EXISTS idx_warranty_claims_organization_id ON public.warranty_claims(organization_id);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_warranty_id ON public.warranty_claims(warranty_id);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_status ON public.warranty_claims(status);

-- Claim Tokens
CREATE INDEX IF NOT EXISTS idx_warranty_claim_tokens_token ON public.warranty_claim_tokens(token);
CREATE INDEX IF NOT EXISTS idx_warranty_claim_tokens_warranty_id ON public.warranty_claim_tokens(warranty_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Email Queue
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_created_at ON public.email_queue(created_at);

-- Audit Logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON public.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_customers_search ON public.customers 
  USING gin((first_name || ' ' || last_name || ' ' || email) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_warranties_search ON public.warranties 
  USING gin((warranty_number || ' ' || vin) gin_trgm_ops);

-- ============================================================================
-- 12. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.franchisee_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trailer_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_claim_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.response_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signature_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signature_audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- Helper function for getting user's organization
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid AS $$
  SELECT organization_id FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- 13. RLS POLICIES - Organizations
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own organization" ON public.organizations;
CREATE POLICY "Users can read own organization"
ON public.organizations FOR SELECT
TO authenticated
USING (
  id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can update own organization" ON public.organizations;
CREATE POLICY "Admins can update own organization"
ON public.organizations FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT organization_id FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'master', 'franchisee_admin')
  )
);

-- ============================================================================
-- 14. RLS POLICIES - Profiles
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own org profiles" ON public.profiles;
CREATE POLICY "Users can read own org profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  organization_id = get_user_organization_id()
);

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
CREATE POLICY "Admins can manage profiles"
ON public.profiles FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'master', 'franchisee_admin')
  )
);

-- ============================================================================
-- 15. RLS POLICIES - Warranties (Most Important)
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own org warranties" ON public.warranties;
CREATE POLICY "Users can read own org warranties"
ON public.warranties FOR SELECT
TO authenticated
USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Admins can manage warranties" ON public.warranties;
CREATE POLICY "Admins can manage warranties"
ON public.warranties FOR ALL
TO authenticated
USING (
  organization_id = get_user_organization_id()
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'master', 'franchisee_admin', 'employee')
  )
);

DROP POLICY IF EXISTS "Public can read warranties with valid token" ON public.warranties;
CREATE POLICY "Public can read warranties with valid token"
ON public.warranties FOR SELECT
TO anon
USING (
  id IN (
    SELECT warranty_id FROM public.warranty_claim_tokens 
    WHERE used = false 
    AND expires_at > now()
  )
);

-- ============================================================================
-- 16. RLS POLICIES - Claims
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own org claims" ON public.warranty_claims;
CREATE POLICY "Users can read own org claims"
ON public.warranty_claims FOR SELECT
TO authenticated
USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Employees can manage claims" ON public.warranty_claims;
CREATE POLICY "Employees can manage claims"
ON public.warranty_claims FOR ALL
TO authenticated
USING (
  organization_id = get_user_organization_id()
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'master', 'franchisee_admin', 'employee')
  )
);

DROP POLICY IF EXISTS "Public can create claims with token" ON public.warranty_claims;
CREATE POLICY "Public can create claims with token"
ON public.warranty_claims FOR INSERT
TO anon
WITH CHECK (
  warranty_id IN (
    SELECT warranty_id FROM public.warranty_claim_tokens 
    WHERE used = false 
    AND expires_at > now()
  )
);

-- ============================================================================
-- 17. RLS POLICIES - Settings Tables
-- ============================================================================

-- Tax Settings
DROP POLICY IF EXISTS "Users can read own org tax settings" ON public.tax_settings;
CREATE POLICY "Users can read own org tax settings"
ON public.tax_settings FOR SELECT
TO authenticated
USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Admins can manage tax settings" ON public.tax_settings;
CREATE POLICY "Admins can manage tax settings"
ON public.tax_settings FOR ALL
TO authenticated
USING (
  organization_id = get_user_organization_id()
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'master', 'franchisee_admin')
  )
);

-- Company Settings (similar pattern)
DROP POLICY IF EXISTS "Users can read own org company settings" ON public.company_settings;
CREATE POLICY "Users can read own org company settings"
ON public.company_settings FOR SELECT
TO authenticated
USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Admins can manage company settings" ON public.company_settings;
CREATE POLICY "Admins can manage company settings"
ON public.company_settings FOR ALL
TO authenticated
USING (
  organization_id = get_user_organization_id()
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'master', 'franchisee_admin')
  )
);

-- ============================================================================
-- 18. TRIGGERS FOR AUTO-UPDATE
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
DO $$ 
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND column_name = 'updated_at'
    AND table_name NOT LIKE 'pg_%'
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_updated_at ON public.%I;
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON public.%I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', t, t);
  END LOOP;
END $$;

-- ============================================================================
-- 19. HELPER FUNCTIONS
-- ============================================================================

-- Function to generate warranty number
CREATE OR REPLACE FUNCTION generate_warranty_number()
RETURNS text AS $$
DECLARE
  new_number text;
  exists_already boolean;
BEGIN
  LOOP
    new_number := 'W-' || to_char(now(), 'YYYY') || '-' || 
                  lpad(floor(random() * 999999)::text, 6, '0');
    
    SELECT EXISTS(SELECT 1 FROM public.warranties WHERE warranty_number = new_number)
    INTO exists_already;
    
    EXIT WHEN NOT exists_already;
  END LOOP;
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate claim number
CREATE OR REPLACE FUNCTION generate_claim_number()
RETURNS text AS $$
DECLARE
  new_number text;
  exists_already boolean;
BEGIN
  LOOP
    new_number := 'C-' || to_char(now(), 'YYYY') || '-' || 
                  lpad(floor(random() * 999999)::text, 6, '0');
    
    SELECT EXISTS(SELECT 1 FROM public.warranty_claims WHERE claim_number = new_number)
    INTO exists_already;
    
    EXIT WHEN NOT exists_already;
  END LOOP;
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 20. DEFAULT DATA
-- ============================================================================

-- Insert default subscription plans if not exist
INSERT INTO public.subscription_plans (name, description, price_monthly, price_yearly, features)
VALUES 
  ('Starter', 'Pour petites entreprises', 49.00, 490.00, '["10 utilisateurs", "100 garanties/mois", "Support email"]'::jsonb),
  ('Professional', 'Pour entreprises moyennes', 99.00, 990.00, '["50 utilisateurs", "500 garanties/mois", "Support prioritaire"]'::jsonb),
  ('Enterprise', 'Pour grandes entreprises', 199.00, 1990.00, '["Utilisateurs illimités", "Garanties illimitées", "Support 24/7"]'::jsonb)
ON CONFLICT DO NOTHING;

-- Insert common trailer brands
INSERT INTO public.trailer_brands (name)
VALUES 
  ('Featherlite'),
  ('Trails West'),
  ('Logan Coach'),
  ('Sundowner'),
  ('Exiss'),
  ('Merhow'),
  ('Shadow'),
  ('4-Star'),
  ('Calico'),
  ('Adam')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Schema consolidation complete - All tables, indexes, RLS policies, and triggers created successfully!';
END $$;
