/*
  # Création de la table response_templates
  
  Bibliothèque de templates de réponses réutilisables avec variables dynamiques
*/

CREATE TABLE IF NOT EXISTS response_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('approval', 'rejection', 'info_request', 'general', 'followup')),
  subject text NOT NULL,
  body text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  usage_count integer DEFAULT 0,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_response_templates_org_id ON response_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_response_templates_category ON response_templates(category);
CREATE INDEX IF NOT EXISTS idx_response_templates_is_active ON response_templates(is_active) WHERE is_active = true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'response_templates_org_name_key'
  ) THEN
    ALTER TABLE response_templates ADD CONSTRAINT response_templates_org_name_key 
      UNIQUE(organization_id, name);
  END IF;
END $$;

ALTER TABLE response_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view org templates" ON response_templates;
CREATE POLICY "Users can view org templates"
  ON response_templates FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id() AND is_active = true);

DROP POLICY IF EXISTS "Admins can manage org templates" ON response_templates;
CREATE POLICY "Admins can manage org templates"
  ON response_templates FOR ALL
  TO authenticated
  USING (organization_id = get_user_organization_id() AND (get_user_role() IN ('admin', 'manager') OR is_owner()))
  WITH CHECK (organization_id = get_user_organization_id() AND (get_user_role() IN ('admin', 'manager') OR is_owner()));

CREATE OR REPLACE FUNCTION update_response_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_response_template_timestamp ON response_templates;
CREATE TRIGGER trigger_update_response_template_timestamp
  BEFORE UPDATE ON response_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_response_template_timestamp();
