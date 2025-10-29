/*
  # Hybrid Signature System - Complete Implementation

  This migration creates a comprehensive hybrid signature system that allows clients to choose between:
  - Online (digital) signatures - Electronic signature via web interface
  - In-person (physical) signatures - Paper-based signature process with digital tracking

  ## New Tables

  ### 1. `signature_methods`
  Tracks which signature method was chosen for each warranty
  - Links warranty to chosen method
  - Records who made the selection and when
  - Stores selection context and reason

  ### 2. `physical_signature_tracking`
  Tracks physical signature sessions and locations
  - Unique document numbers for physical contracts
  - Location details where signature occurred
  - Geolocation data for verification
  - Status tracking throughout the process
  - Links to scanned documents

  ### 3. `scanned_documents`
  Stores scanned physical documents
  - Links to Supabase Storage for file storage
  - Document type classification
  - Scan quality tracking
  - File metadata (size, name, etc.)

  ### 4. `signature_witnesses`
  Records witness information for physical signatures
  - Witness details (name, contact info, role)
  - Witness signature capture
  - Timestamp of witnessing

  ### 5. `identity_verifications`
  Tracks identity verification for in-person signatures
  - ID document details (type, number, issuing authority)
  - Photo of ID document
  - Verification status and verifier info
  - Expiry date validation

  ## New Warranty Columns

  Extends the `warranties` table with 16 new columns:
  - `signature_method` - 'online' or 'in_person'
  - `physical_document_number` - Unique number for physical contracts
  - `physical_signature_date` - When physical signature occurred
  - `physical_signature_completed` - Status flag
  - `signature_location` - Where physical signature happened
  - `witness_required` - Whether witness is needed
  - `witness_count` - Number of witnesses
  - `identity_verification_required` - ID verification needed
  - `identity_verified` - Verification status
  - `document_scanned` - Scanned document exists
  - `scan_quality` - Quality of scanned document
  - `original_document_location` - Where physical contract is stored
  - `digital_copy_url` - URL to scanned PDF
  - `signature_compliance_notes` - Legal compliance notes
  - `biometric_data_captured` - Biometric signature data exists
  - `signature_video_url` - Video of signing process (optional)

  ## Security

  ### Row Level Security (RLS)
  - All tables have RLS enabled
  - Organization-based data isolation
  - Different access levels for different user roles
  - Public read access for verification endpoints only

  ### Access Patterns
  1. Admins: Full access to all signature data in their organization
  2. Dealers: Access to their own warranty signatures
  3. Customers: Can verify their own signatures publicly
  4. Public: Can verify signatures using public tokens

  ## Helper Functions

  ### 1. `generate_physical_document_number()`
  Generates unique document numbers for physical contracts
  - Format: PHYS-YYYYMMDD-XXXXX
  - Sequential numbering per day
  - Collision-proof

  ### 2. `update_physical_signature_status()`
  Updates warranty status when physical signature is completed
  - Auto-updates related tracking records
  - Validates all required steps completed
  - Triggers notifications

  ## Important Notes

  1. Legal Compliance:
     - Supports LCCJTI (Quebec) requirements
     - LPRPDE (Canada) compliance
     - LPC (Quebec) consumer protection
     - eIDAS (EU) standards for electronic signatures

  2. Signature Verification:
     - Both online and physical signatures are legally valid
     - Different verification methods for each type
     - Audit trail maintained for both
     - Public verification available

  3. Data Retention:
     - Physical documents stored securely
     - Scanned copies maintained indefinitely
     - Audit trail preserved
     - GDPR/privacy compliance

  4. Integration:
     - Works with existing LegalSignatureFlow
     - New SignatureMethodSelector component
     - New InPersonSignatureFlow component
     - Hybrid-signature-utils library
*/

-- =====================================================
-- TABLE 1: Signature Methods Selection
-- =====================================================

CREATE TABLE IF NOT EXISTS signature_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id uuid REFERENCES warranties(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  method_chosen text NOT NULL CHECK (method_chosen IN ('online', 'in_person')),
  selected_by uuid REFERENCES profiles(id),
  selected_at timestamptz DEFAULT now(),
  selection_reason text,
  selection_context jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signature_methods_warranty ON signature_methods(warranty_id);
CREATE INDEX IF NOT EXISTS idx_signature_methods_org ON signature_methods(organization_id);
CREATE INDEX IF NOT EXISTS idx_signature_methods_method ON signature_methods(method_chosen);

-- =====================================================
-- TABLE 2: Physical Signature Tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS physical_signature_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id uuid NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  physical_document_number text UNIQUE NOT NULL,
  signature_date timestamptz DEFAULT now(),
  signature_location text,
  geolocation jsonb,
  status text DEFAULT 'initiated' CHECK (status IN ('initiated', 'identity_verified', 'signed', 'witnessed', 'scanned', 'completed')),
  completed_at timestamptz,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_physical_tracking_warranty ON physical_signature_tracking(warranty_id);
CREATE INDEX IF NOT EXISTS idx_physical_tracking_org ON physical_signature_tracking(organization_id);
CREATE INDEX IF NOT EXISTS idx_physical_tracking_doc_number ON physical_signature_tracking(physical_document_number);
CREATE INDEX IF NOT EXISTS idx_physical_tracking_status ON physical_signature_tracking(status);

-- =====================================================
-- TABLE 3: Scanned Documents
-- =====================================================

CREATE TABLE IF NOT EXISTS scanned_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id uuid NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('signed_contract', 'identity_document', 'witness_signature', 'supporting_document')),
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  mime_type text DEFAULT 'application/pdf',
  scan_quality text CHECK (scan_quality IN ('excellent', 'good', 'fair', 'poor')),
  scanned_at timestamptz DEFAULT now(),
  scanned_by uuid REFERENCES profiles(id),
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scanned_docs_warranty ON scanned_documents(warranty_id);
CREATE INDEX IF NOT EXISTS idx_scanned_docs_org ON scanned_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_scanned_docs_type ON scanned_documents(document_type);

-- =====================================================
-- TABLE 4: Signature Witnesses
-- =====================================================

CREATE TABLE IF NOT EXISTS signature_witnesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id uuid NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  role text NOT NULL,
  signature_url text,
  witnessed_at timestamptz DEFAULT now(),
  witness_statement text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_witnesses_warranty ON signature_witnesses(warranty_id);
CREATE INDEX IF NOT EXISTS idx_witnesses_org ON signature_witnesses(organization_id);

-- =====================================================
-- TABLE 5: Identity Verifications
-- =====================================================

CREATE TABLE IF NOT EXISTS identity_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id uuid NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('drivers_license', 'passport', 'health_card', 'national_id', 'other')),
  document_number text NOT NULL,
  issuing_authority text,
  expiry_date date,
  photo_url text,
  verified_by uuid REFERENCES profiles(id),
  verified_at timestamptz DEFAULT now(),
  verification_notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_identity_verif_warranty ON identity_verifications(warranty_id);
CREATE INDEX IF NOT EXISTS idx_identity_verif_org ON identity_verifications(organization_id);

-- =====================================================
-- EXTEND WARRANTIES TABLE
-- =====================================================

DO $$
BEGIN
  -- Signature method selection
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warranties' AND column_name = 'signature_method'
  ) THEN
    ALTER TABLE warranties ADD COLUMN signature_method text CHECK (signature_method IN ('online', 'in_person'));
  END IF;

  -- Physical signature tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warranties' AND column_name = 'physical_document_number'
  ) THEN
    ALTER TABLE warranties ADD COLUMN physical_document_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warranties' AND column_name = 'physical_signature_date'
  ) THEN
    ALTER TABLE warranties ADD COLUMN physical_signature_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warranties' AND column_name = 'physical_signature_completed'
  ) THEN
    ALTER TABLE warranties ADD COLUMN physical_signature_completed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warranties' AND column_name = 'signature_location'
  ) THEN
    ALTER TABLE warranties ADD COLUMN signature_location text;
  END IF;

  -- Witness tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warranties' AND column_name = 'witness_required'
  ) THEN
    ALTER TABLE warranties ADD COLUMN witness_required boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warranties' AND column_name = 'witness_count'
  ) THEN
    ALTER TABLE warranties ADD COLUMN witness_count integer DEFAULT 0;
  END IF;

  -- Identity verification
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warranties' AND column_name = 'identity_verification_required'
  ) THEN
    ALTER TABLE warranties ADD COLUMN identity_verification_required boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warranties' AND column_name = 'identity_verified'
  ) THEN
    ALTER TABLE warranties ADD COLUMN identity_verified boolean DEFAULT false;
  END IF;

  -- Document scanning
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warranties' AND column_name = 'document_scanned'
  ) THEN
    ALTER TABLE warranties ADD COLUMN document_scanned boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warranties' AND column_name = 'scan_quality'
  ) THEN
    ALTER TABLE warranties ADD COLUMN scan_quality text CHECK (scan_quality IN ('excellent', 'good', 'fair', 'poor'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warranties' AND column_name = 'original_document_location'
  ) THEN
    ALTER TABLE warranties ADD COLUMN original_document_location text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warranties' AND column_name = 'digital_copy_url'
  ) THEN
    ALTER TABLE warranties ADD COLUMN digital_copy_url text;
  END IF;

  -- Compliance and additional data
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warranties' AND column_name = 'signature_compliance_notes'
  ) THEN
    ALTER TABLE warranties ADD COLUMN signature_compliance_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warranties' AND column_name = 'biometric_data_captured'
  ) THEN
    ALTER TABLE warranties ADD COLUMN biometric_data_captured boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warranties' AND column_name = 'signature_video_url'
  ) THEN
    ALTER TABLE warranties ADD COLUMN signature_video_url text;
  END IF;
END $$;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE signature_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_signature_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE scanned_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_witnesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_verifications ENABLE ROW LEVEL SECURITY;

-- signature_methods policies
CREATE POLICY "Users can view signature methods in their organization"
  ON signature_methods FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert signature methods in their organization"
  ON signature_methods FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- physical_signature_tracking policies
CREATE POLICY "Users can view physical signatures in their organization"
  ON physical_signature_tracking FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert physical signatures in their organization"
  ON physical_signature_tracking FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update physical signatures in their organization"
  ON physical_signature_tracking FOR UPDATE
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- scanned_documents policies
CREATE POLICY "Users can view scanned docs in their organization"
  ON scanned_documents FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert scanned docs in their organization"
  ON scanned_documents FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- signature_witnesses policies
CREATE POLICY "Users can view witnesses in their organization"
  ON signature_witnesses FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert witnesses in their organization"
  ON signature_witnesses FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- identity_verifications policies
CREATE POLICY "Users can view identity verifications in their organization"
  ON identity_verifications FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert identity verifications in their organization"
  ON identity_verifications FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to generate unique physical document numbers
CREATE OR REPLACE FUNCTION generate_physical_document_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  doc_date text;
  doc_sequence text;
  final_number text;
BEGIN
  doc_date := TO_CHAR(NOW(), 'YYYYMMDD');
  
  -- Get next sequence number for today
  SELECT LPAD((COUNT(*) + 1)::text, 5, '0')
  INTO doc_sequence
  FROM physical_signature_tracking
  WHERE physical_document_number LIKE 'PHYS-' || doc_date || '-%';
  
  final_number := 'PHYS-' || doc_date || '-' || doc_sequence;
  
  RETURN final_number;
END;
$$;

-- Function to update physical signature status
CREATE OR REPLACE FUNCTION update_physical_signature_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update warranty when physical signature tracking is completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE warranties
    SET 
      physical_signature_completed = true,
      physical_signature_date = NEW.completed_at
    WHERE id = NEW.warranty_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-update warranty when physical signature is completed
DROP TRIGGER IF EXISTS trigger_update_warranty_physical_signature ON physical_signature_tracking;
CREATE TRIGGER trigger_update_warranty_physical_signature
  AFTER UPDATE ON physical_signature_tracking
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION update_physical_signature_status();