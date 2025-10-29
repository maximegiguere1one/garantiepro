/*
  # Système de Signature Hybride - En Ligne OU En Personne

  1. Nouvelles Colonnes dans warranties
    - `signature_method` - Type de signature choisi (online, in_person, hybrid)
    - `signature_method_selected_at` - Timestamp du choix
    - `signature_location_type` - Type de lieu (remote, dealership, home)
    - `witness_name` - Nom du témoin pour signatures physiques
    - `witness_signature_data_url` - Signature numérique du témoin
    - `identity_document_photo_url` - URL photo pièce d'identité
    - `client_photo_url` - URL photo du client au moment de la signature
    - `physical_document_number` - Numéro unique du document physique
    - `physical_document_printed_at` - Date d'impression
    - `physical_document_signed_at` - Date de signature physique
    - `scanned_document_url` - URL du document scanné
    - `signature_quality_score` - Score de qualité de la signature (0-100)
    - `verification_status` - Statut de vérification (pending, verified, rejected)
    - `verified_by` - ID de l'utilisateur qui a vérifié
    - `verified_at` - Date de vérification
    - `verification_notes` - Notes de vérification

  2. Nouvelle Table: signature_methods
    - Historique des choix de méthode de signature
    - Tracking du parcours utilisateur

  3. Nouvelle Table: physical_signature_tracking
    - Suivi détaillé des signatures physiques
    - États: generated, printed, signed, scanned, verified, archived

  4. Nouvelle Table: scanned_documents
    - Métadonnées des documents scannés
    - Informations OCR et qualité

  5. Nouvelle Table: signature_witnesses
    - Gestion des témoins
    - Historique de participation

  6. Nouvelle Table: identity_verifications
    - Logs de vérification d'identité
    - Photos et documents associés

  7. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users and organization isolation
*/

-- =====================================================
-- 1. AJOUT DE COLONNES DANS warranties
-- =====================================================

DO $$
BEGIN
  -- Signature method and selection
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'signature_method') THEN
    ALTER TABLE warranties ADD COLUMN signature_method text CHECK (signature_method IN ('online', 'in_person', 'hybrid')) DEFAULT 'online';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'signature_method_selected_at') THEN
    ALTER TABLE warranties ADD COLUMN signature_method_selected_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'signature_location_type') THEN
    ALTER TABLE warranties ADD COLUMN signature_location_type text CHECK (signature_location_type IN ('remote', 'dealership', 'home', 'other'));
  END IF;

  -- Witness information
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'witness_name') THEN
    ALTER TABLE warranties ADD COLUMN witness_name text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'witness_signature_data_url') THEN
    ALTER TABLE warranties ADD COLUMN witness_signature_data_url text;
  END IF;

  -- Identity verification
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'identity_document_photo_url') THEN
    ALTER TABLE warranties ADD COLUMN identity_document_photo_url text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'client_photo_url') THEN
    ALTER TABLE warranties ADD COLUMN client_photo_url text;
  END IF;

  -- Physical document tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'physical_document_number') THEN
    ALTER TABLE warranties ADD COLUMN physical_document_number text UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'physical_document_printed_at') THEN
    ALTER TABLE warranties ADD COLUMN physical_document_printed_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'physical_document_signed_at') THEN
    ALTER TABLE warranties ADD COLUMN physical_document_signed_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'scanned_document_url') THEN
    ALTER TABLE warranties ADD COLUMN scanned_document_url text;
  END IF;

  -- Quality and verification
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'signature_quality_score') THEN
    ALTER TABLE warranties ADD COLUMN signature_quality_score integer CHECK (signature_quality_score >= 0 AND signature_quality_score <= 100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'verification_status') THEN
    ALTER TABLE warranties ADD COLUMN verification_status text CHECK (verification_status IN ('pending', 'verified', 'rejected', 'needs_review')) DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'verified_by') THEN
    ALTER TABLE warranties ADD COLUMN verified_by uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'verified_at') THEN
    ALTER TABLE warranties ADD COLUMN verified_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warranties' AND column_name = 'verification_notes') THEN
    ALTER TABLE warranties ADD COLUMN verification_notes text;
  END IF;
END $$;

-- =====================================================
-- 2. TABLE: signature_methods
-- =====================================================

CREATE TABLE IF NOT EXISTS signature_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id uuid REFERENCES warranties(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id),

  -- Selection information
  method_selected text NOT NULL CHECK (method_selected IN ('online', 'in_person', 'hybrid')),
  selected_at timestamptz NOT NULL DEFAULT now(),
  selection_reason text,

  -- Context
  user_agent text,
  ip_address text,
  device_type text,
  browser_info jsonb,

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE signature_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's signature methods"
  ON signature_methods FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create signature methods"
  ON signature_methods FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_signature_methods_warranty_id ON signature_methods(warranty_id);
CREATE INDEX IF NOT EXISTS idx_signature_methods_organization_id ON signature_methods(organization_id);
CREATE INDEX IF NOT EXISTS idx_signature_methods_selected_at ON signature_methods(selected_at DESC);

-- =====================================================
-- 3. TABLE: physical_signature_tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS physical_signature_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id uuid NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Document information
  physical_document_number text NOT NULL UNIQUE,
  document_generated_at timestamptz NOT NULL DEFAULT now(),
  document_printed_at timestamptz,
  document_signed_at timestamptz,
  document_scanned_at timestamptz,
  document_verified_at timestamptz,
  document_archived_at timestamptz,

  -- Status tracking
  status text NOT NULL CHECK (status IN ('generated', 'printed', 'awaiting_signature', 'signed', 'scanned', 'verified', 'rejected', 'archived')) DEFAULT 'generated',
  status_updated_at timestamptz NOT NULL DEFAULT now(),

  -- Location information
  printed_location text,
  signed_location text,
  geolocation_at_signing jsonb,

  -- People involved
  printed_by uuid REFERENCES profiles(id),
  signed_by_client text,
  witnessed_by text,
  verified_by uuid REFERENCES profiles(id),

  -- Document quality
  scan_quality_score integer CHECK (scan_quality_score >= 0 AND scan_quality_score <= 100),
  ocr_confidence_score integer CHECK (ocr_confidence_score >= 0 AND ocr_confidence_score <= 100),
  issues_detected jsonb DEFAULT '[]'::jsonb,

  -- Notes and comments
  notes text,
  rejection_reason text,

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE physical_signature_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's physical signature tracking"
  ON physical_signature_tracking FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create physical signature tracking"
  ON physical_signature_tracking FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their organization's physical signature tracking"
  ON physical_signature_tracking FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_physical_tracking_warranty_id ON physical_signature_tracking(warranty_id);
CREATE INDEX IF NOT EXISTS idx_physical_tracking_organization_id ON physical_signature_tracking(organization_id);
CREATE INDEX IF NOT EXISTS idx_physical_tracking_status ON physical_signature_tracking(status);
CREATE INDEX IF NOT EXISTS idx_physical_tracking_document_number ON physical_signature_tracking(physical_document_number);

-- =====================================================
-- 4. TABLE: scanned_documents
-- =====================================================

CREATE TABLE IF NOT EXISTS scanned_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id uuid NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tracking_id uuid REFERENCES physical_signature_tracking(id) ON DELETE CASCADE,

  -- File information
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size_bytes bigint,
  file_type text,

  -- Scan information
  scanned_at timestamptz NOT NULL DEFAULT now(),
  scanned_by uuid REFERENCES profiles(id),
  scan_device text,
  scan_resolution text,

  -- Quality metrics
  image_quality_score integer CHECK (image_quality_score >= 0 AND image_quality_score <= 100),
  readability_score integer CHECK (readability_score >= 0 AND readability_score <= 100),
  completeness_score integer CHECK (completeness_score >= 0 AND completeness_score <= 100),

  -- OCR data
  ocr_text text,
  ocr_confidence integer CHECK (ocr_confidence >= 0 AND ocr_confidence <= 100),
  extracted_data jsonb,

  -- Verification
  is_verified boolean DEFAULT false,
  verified_by uuid REFERENCES profiles(id),
  verified_at timestamptz,
  verification_notes text,

  -- Comparison with original
  matches_original boolean,
  discrepancies jsonb DEFAULT '[]'::jsonb,

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE scanned_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's scanned documents"
  ON scanned_documents FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create scanned documents"
  ON scanned_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their organization's scanned documents"
  ON scanned_documents FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scanned_documents_warranty_id ON scanned_documents(warranty_id);
CREATE INDEX IF NOT EXISTS idx_scanned_documents_organization_id ON scanned_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_scanned_documents_tracking_id ON scanned_documents(tracking_id);

-- =====================================================
-- 5. TABLE: signature_witnesses
-- =====================================================

CREATE TABLE IF NOT EXISTS signature_witnesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id uuid NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Witness information
  witness_name text NOT NULL,
  witness_email text,
  witness_phone text,
  witness_role text,
  witness_employee_id text,

  -- Signature
  witness_signature_data_url text NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),

  -- Context
  location text,
  geolocation jsonb,
  user_agent text,
  ip_address text,

  -- Verification
  identity_verified boolean DEFAULT false,
  verification_method text,

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE signature_witnesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's signature witnesses"
  ON signature_witnesses FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create signature witnesses"
  ON signature_witnesses FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_signature_witnesses_warranty_id ON signature_witnesses(warranty_id);
CREATE INDEX IF NOT EXISTS idx_signature_witnesses_organization_id ON signature_witnesses(organization_id);

-- =====================================================
-- 6. TABLE: identity_verifications
-- =====================================================

CREATE TABLE IF NOT EXISTS identity_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id uuid REFERENCES warranties(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Client information
  client_name text NOT NULL,
  client_email text,
  client_phone text,

  -- Document information
  document_type text CHECK (document_type IN ('drivers_license', 'passport', 'national_id', 'health_card', 'other')),
  document_number text,
  document_issuer text,
  document_expiry_date date,

  -- Photos
  document_photo_front_url text,
  document_photo_back_url text,
  client_photo_url text,

  -- Verification
  verified_at timestamptz NOT NULL DEFAULT now(),
  verified_by uuid REFERENCES profiles(id),
  verification_method text CHECK (verification_method IN ('manual', 'automated', 'hybrid')),
  verification_status text CHECK (verification_status IN ('pending', 'approved', 'rejected', 'needs_review')) DEFAULT 'pending',

  -- Quality scores
  photo_quality_score integer CHECK (photo_quality_score >= 0 AND photo_quality_score <= 100),
  document_authenticity_score integer CHECK (document_authenticity_score >= 0 AND document_authenticity_score <= 100),
  face_match_score integer CHECK (face_match_score >= 0 AND face_match_score <= 100),

  -- OCR extracted data
  ocr_data jsonb,

  -- Notes
  notes text,
  rejection_reason text,

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE identity_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's identity verifications"
  ON identity_verifications FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create identity verifications"
  ON identity_verifications FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their organization's identity verifications"
  ON identity_verifications FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_identity_verifications_warranty_id ON identity_verifications(warranty_id);
CREATE INDEX IF NOT EXISTS idx_identity_verifications_organization_id ON identity_verifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_identity_verifications_status ON identity_verifications(verification_status);

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Function to generate unique physical document number
CREATE OR REPLACE FUNCTION generate_physical_document_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_number text;
  exists boolean;
BEGIN
  LOOP
    -- Generate format: PHY-YYYYMMDD-XXXX (e.g., PHY-20251014-A3F9)
    new_number := 'PHY-' ||
                  to_char(now(), 'YYYYMMDD') || '-' ||
                  upper(substring(md5(random()::text) from 1 for 4));

    -- Check if exists
    SELECT EXISTS(SELECT 1 FROM physical_signature_tracking WHERE physical_document_number = new_number)
    INTO exists;

    EXIT WHEN NOT exists;
  END LOOP;

  RETURN new_number;
END;
$$;

-- Function to update physical tracking status
CREATE OR REPLACE FUNCTION update_physical_tracking_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.status_updated_at := now();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_physical_tracking_status_trigger
  BEFORE UPDATE ON physical_signature_tracking
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_physical_tracking_status();

-- =====================================================
-- 8. VIEWS FOR ANALYTICS
-- =====================================================

-- View for signature method statistics
CREATE OR REPLACE VIEW signature_method_stats AS
SELECT
  organization_id,
  signature_method,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (verified_at - signature_method_selected_at))) as avg_completion_time_seconds,
  COUNT(CASE WHEN verification_status = 'verified' THEN 1 END) as verified_count,
  COUNT(CASE WHEN verification_status = 'rejected' THEN 1 END) as rejected_count,
  COUNT(CASE WHEN verification_status = 'pending' THEN 1 END) as pending_count
FROM warranties
WHERE signature_method IS NOT NULL
GROUP BY organization_id, signature_method;

-- View for physical signature pipeline
CREATE OR REPLACE VIEW physical_signature_pipeline AS
SELECT
  p.organization_id,
  p.status,
  COUNT(*) as count,
  AVG(p.scan_quality_score) as avg_scan_quality,
  AVG(EXTRACT(EPOCH FROM (p.document_verified_at - p.document_generated_at))) as avg_processing_time_seconds,
  ARRAY_AGG(DISTINCT p.physical_document_number) as document_numbers
FROM physical_signature_tracking p
GROUP BY p.organization_id, p.status;

COMMENT ON TABLE signature_methods IS 'Tracks which signature method was selected for each warranty';
COMMENT ON TABLE physical_signature_tracking IS 'Detailed tracking of physical signature workflow from generation to archival';
COMMENT ON TABLE scanned_documents IS 'Metadata and quality metrics for all scanned physical documents';
COMMENT ON TABLE signature_witnesses IS 'Records of witnesses present during physical signatures';
COMMENT ON TABLE identity_verifications IS 'Identity verification records with document photos and validation results';
