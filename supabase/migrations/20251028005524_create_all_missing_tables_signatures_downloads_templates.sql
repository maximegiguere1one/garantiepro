/*
  # Création de Toutes les Tables Manquantes - PARTIE 3: SIGNATURES, TÉLÉCHARGEMENTS, TEMPLATES
  Date: 28 Octobre 2025
  
  Tables créées:
  1. warranty_download_tokens - Tokens de téléchargement
  2. warranty_download_logs - Logs de téléchargement
  3. warranty_templates - Templates de garanties
  4. warranty_template_sections - Sections de templates
  5. employee_signatures - Signatures d'employés
  6. signature_audit_trail - Piste d'audit des signatures
  7. signature_methods - Méthodes de signature
  8. physical_signature_tracking - Suivi de signatures physiques
  9. scanned_documents - Documents scannés
  10. signature_witnesses - Témoins de signature
  11. identity_verifications - Vérifications d'identité
*/

-- =====================================================
-- TABLE 1: warranty_download_tokens
-- =====================================================
CREATE TABLE IF NOT EXISTS warranty_download_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id uuid REFERENCES warranties(id) ON DELETE CASCADE NOT NULL,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  downloads integer DEFAULT 0,
  max_downloads integer DEFAULT 5,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_warranty_download_tokens_token ON warranty_download_tokens(token);
CREATE INDEX IF NOT EXISTS idx_warranty_download_tokens_warranty ON warranty_download_tokens(warranty_id);

ALTER TABLE warranty_download_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can use valid download tokens"
  ON warranty_download_tokens FOR SELECT
  TO anon, authenticated
  USING (downloads < max_downloads AND expires_at > now());

CREATE POLICY "System can update download tokens"
  ON warranty_download_tokens FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can create download tokens"
  ON warranty_download_tokens FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin', 'franchisee_admin', 'employee')
    )
  );

-- =====================================================
-- TABLE 2: warranty_download_logs
-- =====================================================
CREATE TABLE IF NOT EXISTS warranty_download_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id uuid REFERENCES warranties(id) ON DELETE CASCADE NOT NULL,
  token_id uuid REFERENCES warranty_download_tokens(id) ON DELETE SET NULL,
  downloaded_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text,
  success boolean DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_warranty_download_logs_warranty ON warranty_download_logs(warranty_id);
CREATE INDEX IF NOT EXISTS idx_warranty_download_logs_downloaded ON warranty_download_logs(downloaded_at);

ALTER TABLE warranty_download_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view download logs"
  ON warranty_download_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM warranties w
      JOIN profiles p ON p.organization_id = w.organization_id
      WHERE w.id = warranty_download_logs.warranty_id
      AND p.id = auth.uid()
      AND p.role IN ('master', 'admin', 'franchisee_admin')
    )
  );

CREATE POLICY "System can insert download logs"
  ON warranty_download_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- =====================================================
-- TABLE 3: warranty_templates
-- =====================================================
CREATE TABLE IF NOT EXISTS warranty_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  template_type text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_warranty_templates_org ON warranty_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_warranty_templates_active ON warranty_templates(is_active) WHERE is_active;

ALTER TABLE warranty_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org templates"
  ON warranty_templates FOR SELECT
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage own org templates"
  ON warranty_templates FOR ALL
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin', 'franchisee_admin')
    )
  );

-- =====================================================
-- TABLE 4: warranty_template_sections
-- =====================================================
CREATE TABLE IF NOT EXISTS warranty_template_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES warranty_templates(id) ON DELETE CASCADE NOT NULL,
  section_name text NOT NULL,
  section_order integer NOT NULL,
  content text NOT NULL,
  is_required boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_warranty_template_sections_template ON warranty_template_sections(template_id);

ALTER TABLE warranty_template_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view template sections"
  ON warranty_template_sections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM warranty_templates wt
      JOIN profiles p ON p.organization_id = wt.organization_id
      WHERE wt.id = warranty_template_sections.template_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage template sections"
  ON warranty_template_sections FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM warranty_templates wt
      JOIN profiles p ON p.organization_id = wt.organization_id
      WHERE wt.id = warranty_template_sections.template_id
      AND p.id = auth.uid()
      AND p.role IN ('master', 'admin', 'franchisee_admin')
    )
  );

-- =====================================================
-- TABLE 5: employee_signatures
-- =====================================================
CREATE TABLE IF NOT EXISTS employee_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  signature_data text NOT NULL,
  signature_type text NOT NULL DEFAULT 'drawn' CHECK (signature_type IN ('drawn', 'typed', 'uploaded')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_signatures_user ON employee_signatures(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_signatures_org ON employee_signatures(organization_id);

ALTER TABLE employee_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own signatures"
  ON employee_signatures FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view org signatures"
  ON employee_signatures FOR SELECT
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin', 'franchisee_admin')
    )
  );

-- =====================================================
-- TABLE 6: signature_audit_trail
-- =====================================================
CREATE TABLE IF NOT EXISTS signature_audit_trail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id uuid REFERENCES warranties(id) ON DELETE CASCADE NOT NULL,
  signer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  signer_name text NOT NULL,
  signer_email text,
  signature_type text NOT NULL CHECK (signature_type IN ('electronic', 'physical', 'hybrid')),
  ip_address text,
  user_agent text,
  signed_at timestamptz DEFAULT now(),
  verification_method text,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_signature_audit_warranty ON signature_audit_trail(warranty_id);
CREATE INDEX IF NOT EXISTS idx_signature_audit_signer ON signature_audit_trail(signer_id);
CREATE INDEX IF NOT EXISTS idx_signature_audit_signed_at ON signature_audit_trail(signed_at);

ALTER TABLE signature_audit_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org signature audit"
  ON signature_audit_trail FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM warranties w
      JOIN profiles p ON p.organization_id = w.organization_id
      WHERE w.id = signature_audit_trail.warranty_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "System can insert signature audit"
  ON signature_audit_trail FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- TABLE 7: signature_methods
-- =====================================================
CREATE TABLE IF NOT EXISTS signature_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id uuid REFERENCES warranties(id) ON DELETE CASCADE NOT NULL,
  method_type text NOT NULL CHECK (method_type IN ('electronic', 'physical', 'hybrid')),
  electronic_signature_data text,
  physical_document_reference text,
  witness_present boolean DEFAULT false,
  witness_details jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(warranty_id)
);

CREATE INDEX IF NOT EXISTS idx_signature_methods_warranty ON signature_methods(warranty_id);

ALTER TABLE signature_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org signature methods"
  ON signature_methods FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM warranties w
      JOIN profiles p ON p.organization_id = w.organization_id
      WHERE w.id = signature_methods.warranty_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Users can manage signature methods"
  ON signature_methods FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM warranties w
      JOIN profiles p ON p.organization_id = w.organization_id
      WHERE w.id = signature_methods.warranty_id
      AND p.id = auth.uid()
      AND p.role IN ('master', 'admin', 'franchisee_admin', 'employee')
    )
  );

-- =====================================================
-- TABLE 8: physical_signature_tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS physical_signature_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id uuid REFERENCES warranties(id) ON DELETE CASCADE NOT NULL,
  document_number text NOT NULL,
  signed_at timestamptz NOT NULL,
  signed_location text,
  witness_name text,
  witness_signature text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_physical_signature_warranty ON physical_signature_tracking(warranty_id);

ALTER TABLE physical_signature_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage physical signatures"
  ON physical_signature_tracking FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM warranties w
      JOIN profiles p ON p.organization_id = w.organization_id
      WHERE w.id = physical_signature_tracking.warranty_id
      AND p.id = auth.uid()
    )
  );

-- =====================================================
-- TABLE 9: scanned_documents
-- =====================================================
CREATE TABLE IF NOT EXISTS scanned_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id uuid REFERENCES warranties(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  uploaded_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_scanned_documents_warranty ON scanned_documents(warranty_id);

ALTER TABLE scanned_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage scanned documents"
  ON scanned_documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM warranties w
      JOIN profiles p ON p.organization_id = w.organization_id
      WHERE w.id = scanned_documents.warranty_id
      AND p.id = auth.uid()
    )
  );

-- =====================================================
-- TABLE 10: signature_witnesses
-- =====================================================
CREATE TABLE IF NOT EXISTS signature_witnesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id uuid REFERENCES warranties(id) ON DELETE CASCADE NOT NULL,
  witness_name text NOT NULL,
  witness_email text,
  witness_phone text,
  witness_signature_data text,
  witnessed_at timestamptz DEFAULT now(),
  verification_code text,
  verified boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_signature_witnesses_warranty ON signature_witnesses(warranty_id);

ALTER TABLE signature_witnesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage witnesses"
  ON signature_witnesses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM warranties w
      JOIN profiles p ON p.organization_id = w.organization_id
      WHERE w.id = signature_witnesses.warranty_id
      AND p.id = auth.uid()
    )
  );

-- =====================================================
-- TABLE 11: identity_verifications
-- =====================================================
CREATE TABLE IF NOT EXISTS identity_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id uuid REFERENCES warranties(id) ON DELETE CASCADE NOT NULL,
  verification_type text NOT NULL CHECK (verification_type IN ('photo_id', 'drivers_license', 'passport', 'other')),
  verified_name text NOT NULL,
  document_number text,
  verified_at timestamptz DEFAULT now(),
  verified_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  verification_notes text,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_identity_verifications_warranty ON identity_verifications(warranty_id);

ALTER TABLE identity_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage identity verifications"
  ON identity_verifications FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM warranties w
      JOIN profiles p ON p.organization_id = w.organization_id
      WHERE w.id = identity_verifications.warranty_id
      AND p.id = auth.uid()
      AND p.role IN ('master', 'admin', 'franchisee_admin', 'employee')
    )
  );

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✓ PARTIE 3 TERMINÉE: 11 tables de signatures et documents créées';
  RAISE NOTICE '  - warranty_download_tokens';
  RAISE NOTICE '  - warranty_download_logs';
  RAISE NOTICE '  - warranty_templates';
  RAISE NOTICE '  - warranty_template_sections';
  RAISE NOTICE '  - employee_signatures';
  RAISE NOTICE '  - signature_audit_trail';
  RAISE NOTICE '  - signature_methods';
  RAISE NOTICE '  - physical_signature_tracking';
  RAISE NOTICE '  - scanned_documents';
  RAISE NOTICE '  - signature_witnesses';
  RAISE NOTICE '  - identity_verifications';
END $$;