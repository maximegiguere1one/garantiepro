/*
  # Automation & Workflows System

  ## Description
  Système complet d'automatisation pour Garantie Pro Remorque incluant:
  - Workflow engine configurable
  - Notifications intelligentes multi-niveaux
  - Génération automatique de factures
  - Système de rappels personnalisables
  - Tracking et analytics d'automatisation

  ## Tables
  1. automation_workflows - Définition des workflows
  2. automation_triggers - Événements déclencheurs
  3. automation_actions - Actions à exécuter
  4. automation_executions - Historique d'exécution
  5. notification_preferences - Préférences utilisateur
  6. scheduled_tasks - Tâches planifiées

  ## Security
  - RLS enabled on all tables
  - Organization-level isolation
  - Admin-only workflow management
*/

-- ============================================================================
-- TABLE: automation_workflows
-- ============================================================================

CREATE TABLE IF NOT EXISTS automation_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL, -- 'warranty_created', 'warranty_expiring', 'claim_submitted', 'schedule', 'manual'
  trigger_config jsonb DEFAULT '{}'::jsonb,
  conditions jsonb DEFAULT '[]'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb, -- Array of actions to execute
  is_active boolean DEFAULT true,
  execution_count integer DEFAULT 0,
  last_executed_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT valid_trigger_type CHECK (
    trigger_type IN (
      'warranty_created',
      'warranty_expiring',
      'warranty_expired',
      'claim_submitted',
      'claim_approved',
      'claim_rejected',
      'invoice_due',
      'schedule',
      'manual'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_automation_workflows_org ON automation_workflows(organization_id);
CREATE INDEX IF NOT EXISTS idx_automation_workflows_trigger ON automation_workflows(trigger_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_automation_workflows_active ON automation_workflows(is_active);

COMMENT ON TABLE automation_workflows IS 'Définition des workflows d''automatisation';

-- ============================================================================
-- TABLE: automation_executions
-- ============================================================================

CREATE TABLE IF NOT EXISTS automation_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES automation_workflows(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  trigger_data jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  actions_executed jsonb DEFAULT '[]'::jsonb,
  actions_failed jsonb DEFAULT '[]'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT valid_execution_status CHECK (
    status IN ('pending', 'running', 'completed', 'failed', 'cancelled')
  )
);

CREATE INDEX IF NOT EXISTS idx_automation_executions_workflow ON automation_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_org ON automation_executions(organization_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_status ON automation_executions(status);
CREATE INDEX IF NOT EXISTS idx_automation_executions_created ON automation_executions(created_at DESC);

COMMENT ON TABLE automation_executions IS 'Historique d''exécution des workflows';

-- ============================================================================
-- TABLE: notification_preferences
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,

  -- Email notifications
  email_enabled boolean DEFAULT true,
  warranty_created boolean DEFAULT true,
  warranty_expiring_30_days boolean DEFAULT true,
  warranty_expiring_15_days boolean DEFAULT true,
  warranty_expiring_7_days boolean DEFAULT true,
  warranty_expired boolean DEFAULT true,
  claim_submitted boolean DEFAULT true,
  claim_status_changed boolean DEFAULT true,
  invoice_generated boolean DEFAULT true,
  invoice_due boolean DEFAULT true,

  -- Push notifications
  push_enabled boolean DEFAULT false,
  push_warranty_expiring boolean DEFAULT true,
  push_claim_updates boolean DEFAULT true,

  -- SMS notifications
  sms_enabled boolean DEFAULT false,
  sms_warranty_expiring boolean DEFAULT false,
  sms_claim_urgent boolean DEFAULT false,

  -- Frequency settings
  digest_frequency text DEFAULT 'never', -- 'never', 'daily', 'weekly'
  quiet_hours_start time,
  quiet_hours_end time,
  timezone text DEFAULT 'America/Montreal',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT unique_user_org_prefs UNIQUE (user_id, organization_id),
  CONSTRAINT valid_digest_frequency CHECK (
    digest_frequency IN ('never', 'daily', 'weekly', 'monthly')
  )
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_prefs_org ON notification_preferences(organization_id);

COMMENT ON TABLE notification_preferences IS 'Préférences de notification par utilisateur';

-- ============================================================================
-- TABLE: scheduled_tasks
-- ============================================================================

CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  task_type text NOT NULL, -- 'expiration_check', 'invoice_generation', 'reminder', 'report'
  schedule_cron text NOT NULL, -- Cron expression
  is_active boolean DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  run_count integer DEFAULT 0,
  fail_count integer DEFAULT 0,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT valid_task_type CHECK (
    task_type IN (
      'expiration_check',
      'invoice_generation',
      'reminder',
      'report',
      'cleanup',
      'backup'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_org ON scheduled_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_active ON scheduled_tasks(is_active, next_run_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_type ON scheduled_tasks(task_type);

COMMENT ON TABLE scheduled_tasks IS 'Tâches planifiées pour automatisation';

-- ============================================================================
-- TABLE: automation_logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workflow_id uuid REFERENCES automation_workflows(id) ON DELETE SET NULL,
  execution_id uuid REFERENCES automation_executions(id) ON DELETE SET NULL,
  level text NOT NULL DEFAULT 'info', -- 'debug', 'info', 'warning', 'error'
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT valid_log_level CHECK (
    level IN ('debug', 'info', 'warning', 'error')
  )
);

CREATE INDEX IF NOT EXISTS idx_automation_logs_org ON automation_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_workflow ON automation_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_execution ON automation_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created ON automation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_logs_level ON automation_logs(level) WHERE level IN ('warning', 'error');

COMMENT ON TABLE automation_logs IS 'Logs détaillés des automations';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE automation_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

-- automation_workflows policies
CREATE POLICY "Users can view workflows in their organization"
  ON automation_workflows FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage workflows"
  ON automation_workflows FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin', 'franchisee_admin')
    )
  );

-- automation_executions policies
CREATE POLICY "Users can view executions in their organization"
  ON automation_executions FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- notification_preferences policies
CREATE POLICY "Users can view their own preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences"
  ON notification_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- scheduled_tasks policies
CREATE POLICY "Users can view scheduled tasks in their organization"
  ON scheduled_tasks FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage scheduled tasks"
  ON scheduled_tasks FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin', 'franchisee_admin')
    )
  );

-- automation_logs policies
CREATE POLICY "Admins can view automation logs"
  ON automation_logs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin', 'franchisee_admin')
    )
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to auto-update workflow execution count
CREATE OR REPLACE FUNCTION update_workflow_execution_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    UPDATE automation_workflows
    SET
      execution_count = execution_count + 1,
      last_executed_at = NEW.completed_at,
      updated_at = now()
    WHERE id = NEW.workflow_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_workflow_stats
  AFTER UPDATE ON automation_executions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed')
  EXECUTE FUNCTION update_workflow_execution_stats();

-- Function to create default notification preferences
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO notification_preferences (
    user_id,
    organization_id,
    email_enabled,
    warranty_expiring_30_days,
    warranty_expiring_15_days,
    warranty_expiring_7_days,
    claim_submitted,
    claim_status_changed
  )
  VALUES (
    NEW.id,
    NEW.organization_id,
    true,
    true,
    true,
    true,
    true,
    true
  )
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_create_default_notification_prefs
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- ============================================================================
-- DEFAULT WORKFLOWS
-- ============================================================================

-- Insert default workflows for each organization
CREATE OR REPLACE FUNCTION create_default_automation_workflows(org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Workflow 1: Warranty Expiration 30 days
  INSERT INTO automation_workflows (
    organization_id,
    name,
    description,
    trigger_type,
    trigger_config,
    conditions,
    actions,
    is_active
  )
  VALUES (
    org_id,
    'Rappel d''expiration 30 jours',
    'Envoie un email de rappel 30 jours avant l''expiration de la garantie',
    'warranty_expiring',
    '{"days_before": 30}'::jsonb,
    '[{"field": "status", "operator": "eq", "value": "active"}]'::jsonb,
    '[
      {
        "type": "send_email",
        "template": "warranty_expiring_30_days",
        "to": "customer",
        "subject": "Votre garantie expire dans 30 jours"
      },
      {
        "type": "create_notification",
        "message": "Garantie expire dans 30 jours",
        "priority": "medium"
      }
    ]'::jsonb,
    true
  );

  -- Workflow 2: Warranty Expiration 15 days
  INSERT INTO automation_workflows (
    organization_id,
    name,
    description,
    trigger_type,
    trigger_config,
    conditions,
    actions,
    is_active
  )
  VALUES (
    org_id,
    'Rappel d''expiration 15 jours',
    'Envoie un email de rappel 15 jours avant l''expiration',
    'warranty_expiring',
    '{"days_before": 15}'::jsonb,
    '[{"field": "status", "operator": "eq", "value": "active"}]'::jsonb,
    '[
      {
        "type": "send_email",
        "template": "warranty_expiring_15_days",
        "to": "customer",
        "subject": "Votre garantie expire dans 15 jours"
      },
      {
        "type": "create_notification",
        "message": "Garantie expire dans 15 jours",
        "priority": "high"
      }
    ]'::jsonb,
    true
  );

  -- Workflow 3: Warranty Expiration 7 days
  INSERT INTO automation_workflows (
    organization_id,
    name,
    description,
    trigger_type,
    trigger_config,
    conditions,
    actions,
    is_active
  )
  VALUES (
    org_id,
    'Rappel d''expiration 7 jours',
    'Envoie un email de rappel 7 jours avant l''expiration',
    'warranty_expiring',
    '{"days_before": 7}'::jsonb,
    '[{"field": "status", "operator": "eq", "value": "active"}]'::jsonb,
    '[
      {
        "type": "send_email",
        "template": "warranty_expiring_7_days",
        "to": "customer",
        "subject": "Dernière chance: Votre garantie expire dans 7 jours!"
      },
      {
        "type": "create_notification",
        "message": "Garantie expire dans 7 jours - URGENT",
        "priority": "urgent"
      },
      {
        "type": "send_sms",
        "message": "Votre garantie expire dans 7 jours. Renouvelez maintenant!",
        "condition": "sms_enabled"
      }
    ]'::jsonb,
    true
  );

  -- Workflow 4: New Warranty Confirmation
  INSERT INTO automation_workflows (
    organization_id,
    name,
    description,
    trigger_type,
    trigger_config,
    actions,
    is_active
  )
  VALUES (
    org_id,
    'Confirmation nouvelle garantie',
    'Envoie un email de confirmation lors de la création d''une garantie',
    'warranty_created',
    '{}'::jsonb,
    '[
      {
        "type": "send_email",
        "template": "warranty_confirmation",
        "to": "customer",
        "subject": "Confirmation de votre garantie",
        "attachments": ["contract_pdf"]
      },
      {
        "type": "send_email",
        "template": "warranty_notification_admin",
        "to": "admin",
        "subject": "Nouvelle garantie créée"
      }
    ]'::jsonb,
    true
  );

  -- Workflow 5: Claim Submitted
  INSERT INTO automation_workflows (
    organization_id,
    name,
    description,
    trigger_type,
    trigger_config,
    actions,
    is_active
  )
  VALUES (
    org_id,
    'Nouvelle réclamation',
    'Notifie l''équipe lors d''une nouvelle réclamation',
    'claim_submitted',
    '{}'::jsonb,
    '[
      {
        "type": "send_email",
        "template": "claim_received",
        "to": "customer",
        "subject": "Réclamation reçue - En traitement"
      },
      {
        "type": "send_email",
        "template": "claim_notification_admin",
        "to": "admin",
        "subject": "Nouvelle réclamation à traiter",
        "priority": "high"
      },
      {
        "type": "create_notification",
        "message": "Nouvelle réclamation nécessite votre attention",
        "priority": "high",
        "roles": ["admin", "franchisee_admin"]
      }
    ]'::jsonb,
    true
  );

  -- Workflow 6: Monthly Invoice Generation
  INSERT INTO automation_workflows (
    organization_id,
    name,
    description,
    trigger_type,
    trigger_config,
    actions,
    is_active
  )
  VALUES (
    org_id,
    'Génération factures mensuelles',
    'Génère automatiquement les factures le premier du mois',
    'schedule',
    '{"cron": "0 0 1 * *", "description": "Premier jour du mois à minuit"}'::jsonb,
    '[
      {
        "type": "generate_invoices",
        "period": "monthly",
        "send_email": true
      },
      {
        "type": "create_notification",
        "message": "Factures mensuelles générées",
        "priority": "medium",
        "roles": ["admin"]
      }
    ]'::jsonb,
    true
  );

END;
$$;

COMMENT ON FUNCTION create_default_automation_workflows IS 'Crée les workflows d''automatisation par défaut pour une organisation';
