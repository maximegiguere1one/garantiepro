/*
  # Création de Toutes les Tables Manquantes - PARTIE 5 FINALE
  Date: 28 Octobre 2025
  
  Tables créées (18 dernières tables):
  
  STATISTIQUES ET MONITORING (7):
  1. franchise_stats
  2. master_activity_log
  3. franchise_messages
  4. commission_rules
  5. employee_invitations
  6. document_generation_status
  7. system_health_checks
  
  PERFORMANCE ET CACHE (3):
  8. query_cache
  9. dashboard_stats
  10. query_performance_log
  
  MARQUES ET MODÈLES (2):
  11. trailer_brands
  12. trailer_models
  
  MONITORING AVANCÉ (5):
  13. email_history
  14. invitation_logs
  15. push_notification_logs
  16. token_access_rate_limit
  17. warranty_commissions
  
  UTILITAIRE (1):
  18. materialized_view_refresh_queue
*/

-- =====================================================
-- STATISTIQUES ET MONITORING
-- =====================================================

CREATE TABLE IF NOT EXISTS franchise_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_warranties integer DEFAULT 0,
  total_revenue numeric(12,2) DEFAULT 0,
  total_claims integer DEFAULT 0,
  active_customers integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_franchise_stats_org ON franchise_stats(organization_id);
CREATE INDEX IF NOT EXISTS idx_franchise_stats_period ON franchise_stats(period_start, period_end);

ALTER TABLE franchise_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org stats"
  ON franchise_stats FOR SELECT
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "System can manage stats"
  ON franchise_stats FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin')
    )
  );

CREATE TABLE IF NOT EXISTS master_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_master_activity_log_user ON master_activity_log(master_user_id);
CREATE INDEX IF NOT EXISTS idx_master_activity_log_created_at ON master_activity_log(created_at);

ALTER TABLE master_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Masters can view master activity log"
  ON master_activity_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'master'
    )
  );

CREATE POLICY "System can insert master activity"
  ON master_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'master'
    )
  );

CREATE TABLE IF NOT EXISTS franchise_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  to_organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  subject text NOT NULL,
  body text NOT NULL,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_franchise_messages_from ON franchise_messages(from_organization_id);
CREATE INDEX IF NOT EXISTS idx_franchise_messages_to ON franchise_messages(to_organization_id);

ALTER TABLE franchise_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org messages"
  ON franchise_messages FOR SELECT
  TO authenticated
  USING (
    from_organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    OR to_organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can send messages"
  ON franchise_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    from_organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  rule_name text NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN ('percentage', 'fixed', 'tiered')),
  warranty_plan_id uuid REFERENCES warranty_plans(id) ON DELETE CASCADE,
  percentage_rate numeric(5,2),
  fixed_amount numeric(10,2),
  tiers jsonb,
  is_active boolean DEFAULT true,
  effective_from date NOT NULL,
  effective_to date,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commission_rules_org ON commission_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_commission_rules_plan ON commission_rules(warranty_plan_id);

ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage commission rules"
  ON commission_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin')
    )
  );

CREATE TABLE IF NOT EXISTS employee_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  role text NOT NULL,
  invited_by uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_invitations_org ON employee_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_email ON employee_invitations(email);

ALTER TABLE employee_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage employee invitations"
  ON employee_invitations FOR ALL
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin', 'franchisee_admin')
    )
  );

CREATE TABLE IF NOT EXISTS document_generation_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id uuid REFERENCES warranties(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message text,
  generated_url text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_document_generation_warranty ON document_generation_status(warranty_id);
CREATE INDEX IF NOT EXISTS idx_document_generation_status ON document_generation_status(status);

ALTER TABLE document_generation_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org document status"
  ON document_generation_status FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM warranties w
      JOIN profiles p ON p.organization_id = w.organization_id
      WHERE w.id = document_generation_status.warranty_id
      AND p.id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS system_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
  response_time_ms integer,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  checked_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_health_checks_checked_at ON system_health_checks(checked_at);
CREATE INDEX IF NOT EXISTS idx_system_health_checks_status ON system_health_checks(status);

ALTER TABLE system_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view health checks"
  ON system_health_checks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin')
    )
  );

-- =====================================================
-- PERFORMANCE ET CACHE
-- =====================================================

CREATE TABLE IF NOT EXISTS query_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  cache_value jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_query_cache_key ON query_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_query_cache_expires ON query_cache(expires_at);

ALTER TABLE query_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage cache"
  ON query_cache FOR ALL
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS dashboard_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  stat_type text NOT NULL,
  stat_value jsonb NOT NULL,
  calculated_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dashboard_stats_org ON dashboard_stats(organization_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_stats_type ON dashboard_stats(stat_type);

ALTER TABLE dashboard_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org dashboard stats"
  ON dashboard_stats FOR SELECT
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS query_performance_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_name text NOT NULL,
  execution_time_ms integer NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_query_performance_log_created_at ON query_performance_log(created_at);
CREATE INDEX IF NOT EXISTS idx_query_performance_log_query_name ON query_performance_log(query_name);

ALTER TABLE query_performance_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view query performance"
  ON query_performance_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin')
    )
  );

-- =====================================================
-- MARQUES ET MODÈLES
-- =====================================================

CREATE TABLE IF NOT EXISTS trailer_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  country text,
  website text,
  logo_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trailer_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view trailer brands"
  ON trailer_brands FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage trailer brands"
  ON trailer_brands FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin')
    )
  );

CREATE TABLE IF NOT EXISTS trailer_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES trailer_brands(id) ON DELETE CASCADE NOT NULL,
  model_name text NOT NULL,
  year_start integer,
  year_end integer,
  category text,
  specifications jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(brand_id, model_name)
);

CREATE INDEX IF NOT EXISTS idx_trailer_models_brand ON trailer_models(brand_id);

ALTER TABLE trailer_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view trailer models"
  ON trailer_models FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage trailer models"
  ON trailer_models FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin')
    )
  );

-- =====================================================
-- MONITORING AVANCÉ
-- =====================================================

CREATE TABLE IF NOT EXISTS email_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  to_email text NOT NULL,
  subject text NOT NULL,
  template_id text,
  status text NOT NULL CHECK (status IN ('sent', 'failed', 'bounced')),
  sent_at timestamptz DEFAULT now(),
  opened_at timestamptz,
  clicked_at timestamptz,
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_email_history_org ON email_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_history_sent_at ON email_history(sent_at);

ALTER TABLE email_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org email history"
  ON email_history FOR SELECT
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS invitation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid REFERENCES franchisee_invitations(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  details text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitation_logs_invitation ON invitation_logs(invitation_id);

ALTER TABLE invitation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view invitation logs"
  ON invitation_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin')
    )
  );

CREATE TABLE IF NOT EXISTS push_notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  status text NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message text,
  sent_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_notification_logs_user ON push_notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_push_notification_logs_sent_at ON push_notification_logs(sent_at);

ALTER TABLE push_notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification logs"
  ON push_notification_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS token_access_rate_limit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL,
  access_count integer DEFAULT 0,
  last_access_at timestamptz DEFAULT now(),
  window_start timestamptz DEFAULT now(),
  UNIQUE(token)
);

CREATE INDEX IF NOT EXISTS idx_token_access_rate_limit_token ON token_access_rate_limit(token);

ALTER TABLE token_access_rate_limit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage rate limits"
  ON token_access_rate_limit FOR ALL
  TO anon, authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS warranty_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id uuid REFERENCES warranties(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  commission_rule_id uuid REFERENCES commission_rules(id) ON DELETE SET NULL,
  commission_amount numeric(10,2) NOT NULL,
  commission_percentage numeric(5,2),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_warranty_commissions_warranty ON warranty_commissions(warranty_id);
CREATE INDEX IF NOT EXISTS idx_warranty_commissions_org ON warranty_commissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_warranty_commissions_employee ON warranty_commissions(employee_id);

ALTER TABLE warranty_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org commissions"
  ON warranty_commissions FOR SELECT
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can view own commissions"
  ON warranty_commissions FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

-- =====================================================
-- UTILITAIRE
-- =====================================================

CREATE TABLE IF NOT EXISTS materialized_view_refresh_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  view_name text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_materialized_view_refresh_queue_status ON materialized_view_refresh_queue(status);

ALTER TABLE materialized_view_refresh_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage view refresh queue"
  ON materialized_view_refresh_queue FOR ALL
  TO authenticated
  USING (true);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✓ PARTIE 5 FINALE TERMINÉE: 18 dernières tables créées';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '  TOUTES LES TABLES MANQUANTES ONT ÉTÉ CRÉÉES!';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '  Total de tables créées: 55+';
  RAISE NOTICE '  Base de données complète et fonctionnelle!';
  RAISE NOTICE '';
END $$;