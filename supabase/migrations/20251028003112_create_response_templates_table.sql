/*
  # Create response_templates table
*/

CREATE TABLE IF NOT EXISTS response_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('approval', 'rejection', 'info_request', 'general', 'followup')),
  subject text NOT NULL,
  body text NOT NULL,
  variables text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, name)
);

ALTER TABLE response_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view response templates in their organization"
  ON response_templates FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage response templates"
  ON response_templates FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('master', 'super_admin', 'admin', 'franchisee_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('master', 'super_admin', 'admin', 'franchisee_admin')
    )
  );

CREATE INDEX idx_response_templates_organization_id ON response_templates(organization_id);
CREATE INDEX idx_response_templates_category ON response_templates(category);

CREATE TRIGGER update_response_templates_updated_at
  BEFORE UPDATE ON response_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();