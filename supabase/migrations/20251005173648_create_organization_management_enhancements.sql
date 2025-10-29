/*
  # Am\u00e9liorations Syst\u00e8me de Gestion des Organisations
  
  ## Nouvelles Tables
  
  1. **organization_notes** - Notes priv\u00e9es sur les franchis\u00e9s
     - `id` (uuid, primary key)
     - `organization_id` (uuid, foreign key)
     - `content` (text)
     - `created_by` (uuid, foreign key)
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)
  
  2. **organization_tags** - Tags pour cat\u00e9goriser les franchis\u00e9s
     - `id` (uuid, primary key)
     - `name` (text, unique)
     - `color` (text)
     - `created_at` (timestamptz)
  
  3. **organization_tag_assignments** - Association tags-organisations
     - `organization_id` (uuid, foreign key)
     - `tag_id` (uuid, foreign key)
     - `assigned_at` (timestamptz)
  
  4. **organization_communications** - Historique des communications
     - `id` (uuid, primary key)
     - `organization_id` (uuid, foreign key)
     - `type` (text) - email, sms, call, meeting
     - `subject` (text)
     - `content` (text)
     - `sent_by` (uuid, foreign key)
     - `sent_at` (timestamptz)
     - `status` (text)
  
  5. **organization_activities** - Timeline d'activit\u00e9s
     - `id` (uuid, primary key)
     - `organization_id` (uuid, foreign key)
     - `activity_type` (text)
     - `description` (text)
     - `metadata` (jsonb)
     - `created_by` (uuid, foreign key)
     - `created_at` (timestamptz)
  
  6. **organization_alerts** - Alertes et notifications
     - `id` (uuid, primary key)
     - `organization_id` (uuid, foreign key)
     - `alert_type` (text)
     - `title` (text)
     - `message` (text)
     - `severity` (text)
     - `is_read` (boolean)
     - `created_at` (timestamptz)
  
  7. **commission_history** - Historique des changements de commission
     - `id` (uuid, primary key)
     - `organization_id` (uuid, foreign key)
     - `old_rate` (decimal)
     - `new_rate` (decimal)
     - `reason` (text)
     - `changed_by` (uuid, foreign key)
     - `changed_at` (timestamptz)
  
  ## S\u00e9curit\u00e9
  
  - RLS activ\u00e9 sur toutes les tables
  - Acc\u00e8s restreint aux propri\u00e9taires d'organisations
  - Indexes pour les performances
*/

-- Table: organization_notes
CREATE TABLE IF NOT EXISTS organization_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organization_notes_org_id ON organization_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_notes_created_at ON organization_notes(created_at DESC);

ALTER TABLE organization_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner org can manage notes"
  ON organization_notes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organizations o1
      JOIN organizations o2 ON o2.owner_organization_id = o1.id OR o2.id = o1.id
      WHERE o2.id = organization_notes.organization_id
        AND o1.id = auth.uid()::uuid
    )
  );

-- Table: organization_tags
CREATE TABLE IF NOT EXISTS organization_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#3b82f6',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE organization_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tags"
  ON organization_tags
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owner org can manage tags"
  ON organization_tags
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE type = 'owner'
        AND id IN (
          SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    )
  );

-- Table: organization_tag_assignments
CREATE TABLE IF NOT EXISTS organization_tag_assignments (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES organization_tags(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  PRIMARY KEY (organization_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_tag_assignments_org ON organization_tag_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_tag_assignments_tag ON organization_tag_assignments(tag_id);

ALTER TABLE organization_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner org can manage tag assignments"
  ON organization_tag_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organizations o1
      JOIN organizations o2 ON o2.owner_organization_id = o1.id OR o2.id = o1.id
      WHERE o2.id = organization_tag_assignments.organization_id
        AND o1.id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Table: organization_communications
CREATE TABLE IF NOT EXISTS organization_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('email', 'sms', 'call', 'meeting', 'note')),
  subject text,
  content text,
  sent_by uuid REFERENCES profiles(id),
  sent_at timestamptz DEFAULT now(),
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending', 'scheduled'))
);

CREATE INDEX IF NOT EXISTS idx_org_communications_org_id ON organization_communications(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_communications_sent_at ON organization_communications(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_communications_type ON organization_communications(type);

ALTER TABLE organization_communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner org can manage communications"
  ON organization_communications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organizations o1
      JOIN organizations o2 ON o2.owner_organization_id = o1.id OR o2.id = o1.id
      WHERE o2.id = organization_communications.organization_id
        AND o1.id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Table: organization_activities
CREATE TABLE IF NOT EXISTS organization_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_activities_org_id ON organization_activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_activities_created_at ON organization_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_activities_type ON organization_activities(activity_type);

ALTER TABLE organization_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner org can view activities"
  ON organization_activities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organizations o1
      JOIN organizations o2 ON o2.owner_organization_id = o1.id OR o2.id = o1.id
      WHERE o2.id = organization_activities.organization_id
        AND o1.id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "System can insert activities"
  ON organization_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Table: organization_alerts
CREATE TABLE IF NOT EXISTS organization_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('payment_overdue', 'quota_reached', 'technical_issue', 'general', 'performance')),
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_alerts_org_id ON organization_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_alerts_is_read ON organization_alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_org_alerts_created_at ON organization_alerts(created_at DESC);

ALTER TABLE organization_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner org can manage alerts"
  ON organization_alerts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organizations o1
      JOIN organizations o2 ON o2.owner_organization_id = o1.id OR o2.id = o1.id
      WHERE o2.id = organization_alerts.organization_id
        AND o1.id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Table: commission_history
CREATE TABLE IF NOT EXISTS commission_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  old_rate decimal(5,2),
  new_rate decimal(5,2) NOT NULL,
  reason text,
  changed_by uuid REFERENCES profiles(id),
  changed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commission_history_org_id ON commission_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_commission_history_changed_at ON commission_history(changed_at DESC);

ALTER TABLE commission_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner org can view commission history"
  ON commission_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organizations o1
      JOIN organizations o2 ON o2.owner_organization_id = o1.id OR o2.id = o1.id
      WHERE o2.id = commission_history.organization_id
        AND o1.id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Owner org can insert commission history"
  ON commission_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations o1
      JOIN organizations o2 ON o2.owner_organization_id = o1.id OR o2.id = o1.id
      WHERE o2.id = commission_history.organization_id
        AND o1.id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Function: Auto-log activity on organization changes
CREATE OR REPLACE FUNCTION log_organization_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      INSERT INTO organization_activities (organization_id, activity_type, description, metadata)
      VALUES (
        NEW.id,
        'status_change',
        'Status changed from ' || OLD.status || ' to ' || NEW.status,
        jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS organization_activity_trigger ON organizations;
CREATE TRIGGER organization_activity_trigger
  AFTER UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION log_organization_activity();

-- Function: Get organization with full stats
CREATE OR REPLACE FUNCTION get_organization_full_stats(org_id uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'warranty_count', (SELECT COUNT(*) FROM warranties WHERE organization_id = org_id),
    'user_count', (SELECT COUNT(*) FROM profiles WHERE organization_id = org_id),
    'total_revenue', (SELECT COALESCE(SUM(total_amount), 0) FROM warranty_transactions WHERE organization_id = org_id AND status = 'completed'),
    'pending_revenue', (SELECT COALESCE(SUM(total_amount), 0) FROM warranty_transactions WHERE organization_id = org_id AND status = 'pending'),
    'active_claims', (SELECT COUNT(*) FROM claims c JOIN warranties w ON c.warranty_id = w.id WHERE w.organization_id = org_id AND c.status NOT IN ('approved', 'rejected')),
    'unread_alerts', (SELECT COUNT(*) FROM organization_alerts WHERE organization_id = org_id AND is_read = false),
    'tags', (SELECT jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'color', t.color)) FROM organization_tags t JOIN organization_tag_assignments ta ON t.id = ta.tag_id WHERE ta.organization_id = org_id)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default tags
INSERT INTO organization_tags (name, color) VALUES
  ('VIP', '#f59e0b'),
  ('Attention Required', '#ef4444'),
  ('New', '#10b981'),
  ('High Performer', '#8b5cf6'),
  ('Training Needed', '#3b82f6')
ON CONFLICT (name) DO NOTHING;