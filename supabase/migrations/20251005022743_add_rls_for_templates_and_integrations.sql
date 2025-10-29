/*
  # Add RLS Policies for Templates and Integration Tables

  ## Overview
  Adds missing RLS policies for warranty_templates, email_templates,
  integration_credentials, and integration_logs tables.

  ## Security Model
  1. **Warranty Templates**
     - Users can view templates from their organization
     - Owner can view all templates
     - Admins can manage their org's templates

  2. **Email Templates**
     - Users can view templates from their organization or system templates
     - Owner can view all templates
     - Admins can manage their org's templates

  3. **Integration Credentials**
     - Only admins can view/manage their org's credentials
     - Owner can view all credentials

  4. **Integration Logs**
     - Users can view logs from their organization
     - Owner can view all logs
*/

-- =====================================================
-- 1. Enable RLS on all tables
-- =====================================================
ALTER TABLE warranty_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. Add organization_id to tables if missing
-- =====================================================

-- Warranty templates (already has dealer_id, might need organization_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warranty_templates' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE warranty_templates ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_warranty_templates_organization_id ON warranty_templates(organization_id);
  END IF;
END $$;

-- Email templates (already has dealer_id, might need organization_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_templates' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE email_templates ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_email_templates_organization_id ON email_templates(organization_id);
  END IF;
END $$;

-- Integration credentials (already has dealer_id, might need organization_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_credentials' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE integration_credentials ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_integration_credentials_organization_id ON integration_credentials(organization_id);
  END IF;
END $$;

-- Integration logs (already has dealer_id, might need organization_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_logs' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE integration_logs ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_integration_logs_organization_id ON integration_logs(organization_id);
  END IF;
END $$;

-- =====================================================
-- 3. Create triggers to auto-set organization_id
-- =====================================================

DROP TRIGGER IF EXISTS set_warranty_template_organization_id ON warranty_templates;
CREATE TRIGGER set_warranty_template_organization_id
  BEFORE INSERT ON warranty_templates
  FOR EACH ROW
  EXECUTE FUNCTION set_organization_id();

DROP TRIGGER IF EXISTS set_email_template_organization_id ON email_templates;
CREATE TRIGGER set_email_template_organization_id
  BEFORE INSERT ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION set_organization_id();

DROP TRIGGER IF EXISTS set_integration_credential_organization_id ON integration_credentials;
CREATE TRIGGER set_integration_credential_organization_id
  BEFORE INSERT ON integration_credentials
  FOR EACH ROW
  EXECUTE FUNCTION set_organization_id();

DROP TRIGGER IF EXISTS set_integration_log_organization_id ON integration_logs;
CREATE TRIGGER set_integration_log_organization_id
  BEFORE INSERT ON integration_logs
  FOR EACH ROW
  EXECUTE FUNCTION set_organization_id();

-- =====================================================
-- 4. RLS Policies for warranty_templates
-- =====================================================

CREATE POLICY "Users can view own org warranty templates"
  ON warranty_templates FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    OR organization_id IS NULL
    OR is_owner()
  );

CREATE POLICY "Admins can manage own org warranty templates"
  ON warranty_templates FOR ALL
  TO authenticated
  USING (
    (organization_id = get_user_organization_id() AND get_user_role() IN ('admin', 'f_and_i'))
    OR is_owner()
  )
  WITH CHECK (
    (organization_id = get_user_organization_id() AND get_user_role() IN ('admin', 'f_and_i'))
    OR is_owner()
  );

-- =====================================================
-- 5. RLS Policies for email_templates
-- =====================================================

CREATE POLICY "Users can view own org email templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    OR organization_id IS NULL  -- System templates
    OR is_owner()
  );

CREATE POLICY "Admins can manage own org email templates"
  ON email_templates FOR ALL
  TO authenticated
  USING (
    (organization_id = get_user_organization_id() AND get_user_role() = 'admin')
    OR is_owner()
  )
  WITH CHECK (
    (organization_id = get_user_organization_id() AND get_user_role() = 'admin')
    OR is_owner()
  );

-- =====================================================
-- 6. RLS Policies for integration_credentials
-- =====================================================

CREATE POLICY "Admins can view own org integration credentials"
  ON integration_credentials FOR SELECT
  TO authenticated
  USING (
    (organization_id = get_user_organization_id() AND get_user_role() = 'admin')
    OR is_owner()
  );

CREATE POLICY "Admins can manage own org integration credentials"
  ON integration_credentials FOR ALL
  TO authenticated
  USING (
    (organization_id = get_user_organization_id() AND get_user_role() = 'admin')
    OR is_owner()
  )
  WITH CHECK (
    (organization_id = get_user_organization_id() AND get_user_role() = 'admin')
    OR is_owner()
  );

-- =====================================================
-- 7. RLS Policies for integration_logs
-- =====================================================

CREATE POLICY "Users can view own org integration logs"
  ON integration_logs FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    OR is_owner()
  );

CREATE POLICY "System can insert integration logs"
  ON integration_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- Anyone can insert logs, trigger will set org_id
