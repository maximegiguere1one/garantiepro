/*
  # Ajout de organization_id aux Tables Restantes
  Date: 28 Octobre 2025

  ## Tables de cette migration (8 tables)
  1. ab_test_assignments - Assignations A/B testing
  2. franchise_messages - Messages franchises
  3. master_activity_log - Journal activité master
  4. trailer_brands - Marques de remorques
  5. trailer_models - Modèles de remorques
  6. user_notification_preferences - Préférences notifications
  7. typing_indicators - Indicateurs de frappe
  8. tour_progress - Progrès des tours guidés
*/

-- =====================================================
-- AJOUT DES COLONNES organization_id
-- =====================================================

ALTER TABLE ab_test_assignments 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_organization_id 
ON ab_test_assignments(organization_id);

ALTER TABLE franchise_messages 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_franchise_messages_organization_id 
ON franchise_messages(organization_id);

ALTER TABLE master_activity_log 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_master_activity_log_organization_id 
ON master_activity_log(organization_id);

ALTER TABLE trailer_brands 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_trailer_brands_organization_id 
ON trailer_brands(organization_id);

ALTER TABLE trailer_models 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_trailer_models_organization_id 
ON trailer_models(organization_id);

ALTER TABLE user_notification_preferences 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_organization_id 
ON user_notification_preferences(organization_id);

ALTER TABLE typing_indicators 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_typing_indicators_organization_id 
ON typing_indicators(organization_id);

ALTER TABLE tour_progress 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tour_progress_organization_id 
ON tour_progress(organization_id);

-- =====================================================
-- MISE À JOUR DES RLS POLICIES
-- =====================================================

-- TABLE: ab_test_assignments
DROP POLICY IF EXISTS "Users can view own test assignments" ON ab_test_assignments;
DROP POLICY IF EXISTS "System can assign tests" ON ab_test_assignments;

CREATE POLICY "Users can view ab test assignments in their organization"
  ON ab_test_assignments FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "System can manage ab test assignments"
  ON ab_test_assignments FOR ALL
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  )
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- TABLE: franchise_messages
DROP POLICY IF EXISTS "Users can view own org messages" ON franchise_messages;
DROP POLICY IF EXISTS "Users can send messages" ON franchise_messages;

CREATE POLICY "Users can view franchise messages in their organization"
  ON franchise_messages FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage franchise messages"
  ON franchise_messages FOR ALL
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id = get_user_organization_id())
  )
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- TABLE: trailer_brands
DROP POLICY IF EXISTS "Anyone can view trailer brands" ON trailer_brands;
DROP POLICY IF EXISTS "Admins can manage trailer brands" ON trailer_brands;

CREATE POLICY "Users can view trailer brands"
  ON trailer_brands FOR SELECT
  TO authenticated
  USING (
    organization_id IS NULL
    OR is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage trailer brands in their organization"
  ON trailer_brands FOR ALL
  TO authenticated
  USING (
    is_admin_user()
    AND (organization_id IS NULL OR is_master_user() OR organization_id = get_user_organization_id())
  )
  WITH CHECK (
    is_admin_user()
    AND (organization_id = get_user_organization_id() OR organization_id IS NULL)
  );

-- TABLE: trailer_models
DROP POLICY IF EXISTS "Anyone can view trailer models" ON trailer_models;
DROP POLICY IF EXISTS "Admins can manage trailer models" ON trailer_models;

CREATE POLICY "Users can view trailer models"
  ON trailer_models FOR SELECT
  TO authenticated
  USING (
    organization_id IS NULL
    OR is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage trailer models in their organization"
  ON trailer_models FOR ALL
  TO authenticated
  USING (
    is_admin_user()
    AND (organization_id IS NULL OR is_master_user() OR organization_id = get_user_organization_id())
  )
  WITH CHECK (
    is_admin_user()
    AND (organization_id = get_user_organization_id() OR organization_id IS NULL)
  );

-- TABLE: user_notification_preferences
DROP POLICY IF EXISTS "Users can manage own preferences" ON user_notification_preferences;

CREATE POLICY "Users can view their notification preferences"
  ON user_notification_preferences FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Users can manage their notification preferences"
  ON user_notification_preferences FOR ALL
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  )
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- TABLE: typing_indicators
DROP POLICY IF EXISTS "Users can view typing indicators" ON typing_indicators;
DROP POLICY IF EXISTS "Users can manage own typing status" ON typing_indicators;

CREATE POLICY "Users can view typing indicators in their organization"
  ON typing_indicators FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Users can manage typing indicators"
  ON typing_indicators FOR ALL
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  )
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );

-- TABLE: tour_progress
DROP POLICY IF EXISTS "Users can manage own tour progress" ON tour_progress;

CREATE POLICY "Users can view their tour progress"
  ON tour_progress FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Users can manage their tour progress"
  ON tour_progress FOR ALL
  TO authenticated
  USING (
    is_master_user()
    OR organization_id = get_user_organization_id()
  )
  WITH CHECK (
    organization_id = get_user_organization_id() OR organization_id IS NULL
  );