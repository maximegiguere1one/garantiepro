/*
  # Ajout de organization_id aux 5 Tables Système Restantes
  Date: 28 Octobre 2025

  ## Résumé
  Ajoute organization_id aux 5 dernières tables pour atteindre 100% de couverture.

  ## Tables de cette migration (5 tables)
  1. materialized_view_refresh_queue - File de rafraîchissement des vues
  2. organization_tags - Tags pour organisations
  3. query_cache - Cache de requêtes
  4. token_access_rate_limit - Limite de taux pour tokens
  5. organizations - Table source (référence spéciale)

  ## Stratégie
  - materialized_view_refresh_queue: organization_id pour tracker par org
  - organization_tags: organization_id NULL pour tags globaux, non-NULL pour tags spécifiques
  - query_cache: organization_id pour cache par organisation
  - token_access_rate_limit: organization_id pour rate limiting par org
  - organizations: Ajouter parent_organization_id pour hiérarchie
*/

-- =====================================================
-- TABLE: materialized_view_refresh_queue
-- File système pour rafraîchir les vues matérialisées
-- organization_id NULL = vues globales
-- organization_id non-NULL = vues spécifiques à une org
-- =====================================================
ALTER TABLE materialized_view_refresh_queue 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_materialized_view_refresh_queue_organization_id 
ON materialized_view_refresh_queue(organization_id);

-- =====================================================
-- TABLE: organization_tags
-- Tags partagés ou spécifiques aux organisations
-- organization_id NULL = tags globaux disponibles pour tous
-- organization_id non-NULL = tags créés par une organisation spécifique
-- =====================================================
ALTER TABLE organization_tags 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_organization_tags_organization_id 
ON organization_tags(organization_id);

-- =====================================================
-- TABLE: query_cache
-- Cache de requêtes par organisation pour performance
-- organization_id NULL = cache global
-- organization_id non-NULL = cache spécifique à l'org
-- =====================================================
ALTER TABLE query_cache 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_query_cache_organization_id 
ON query_cache(organization_id);

-- =====================================================
-- TABLE: token_access_rate_limit
-- Rate limiting par organisation
-- organization_id NULL = rate limit global
-- organization_id non-NULL = rate limit par org
-- =====================================================
ALTER TABLE token_access_rate_limit 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_token_access_rate_limit_organization_id 
ON token_access_rate_limit(organization_id);

-- =====================================================
-- TABLE: organizations
-- Table source - Ajouter parent_organization_id pour hiérarchie
-- Permet de créer des sous-organisations (franchises)
-- =====================================================
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS parent_organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_parent_organization_id 
ON organizations(parent_organization_id);

-- =====================================================
-- RLS POLICIES POUR LES NOUVELLES TABLES
-- =====================================================

-- TABLE: materialized_view_refresh_queue
DROP POLICY IF EXISTS "System can view refresh queue" ON materialized_view_refresh_queue;
DROP POLICY IF EXISTS "System can manage refresh queue" ON materialized_view_refresh_queue;

CREATE POLICY "System can view refresh queue"
  ON materialized_view_refresh_queue FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id IS NULL
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "System can manage refresh queue"
  ON materialized_view_refresh_queue FOR ALL
  TO authenticated
  USING (
    is_admin_user()
    AND (is_master_user() OR organization_id IS NULL OR organization_id = get_user_organization_id())
  )
  WITH CHECK (
    is_admin_user()
  );

-- TABLE: organization_tags
DROP POLICY IF EXISTS "Users can view tags" ON organization_tags;
DROP POLICY IF EXISTS "Admins can manage tags" ON organization_tags;

CREATE POLICY "Users can view tags"
  ON organization_tags FOR SELECT
  TO authenticated
  USING (
    organization_id IS NULL
    OR is_master_user()
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can manage tags"
  ON organization_tags FOR ALL
  TO authenticated
  USING (
    is_admin_user()
    AND (organization_id IS NULL OR is_master_user() OR organization_id = get_user_organization_id())
  )
  WITH CHECK (
    is_admin_user()
  );

-- TABLE: query_cache
DROP POLICY IF EXISTS "System can view cache" ON query_cache;
DROP POLICY IF EXISTS "System can manage cache" ON query_cache;

CREATE POLICY "System can view cache"
  ON query_cache FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id IS NULL
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "System can manage cache"
  ON query_cache FOR ALL
  TO authenticated
  USING (
    is_master_user()
    OR organization_id IS NULL
    OR organization_id = get_user_organization_id()
  )
  WITH CHECK (true);

-- TABLE: token_access_rate_limit
DROP POLICY IF EXISTS "System can view rate limits" ON token_access_rate_limit;
DROP POLICY IF EXISTS "System can manage rate limits" ON token_access_rate_limit;

CREATE POLICY "System can view rate limits"
  ON token_access_rate_limit FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR organization_id IS NULL
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "System can manage rate limits"
  ON token_access_rate_limit FOR ALL
  TO authenticated
  USING (
    is_master_user()
    OR organization_id IS NULL
    OR organization_id = get_user_organization_id()
  )
  WITH CHECK (true);

-- =====================================================
-- TRIGGERS AUTO-FILL
-- =====================================================

-- materialized_view_refresh_queue
DROP TRIGGER IF EXISTS materialized_view_refresh_queue_auto_fill_organization_id ON materialized_view_refresh_queue;
CREATE TRIGGER materialized_view_refresh_queue_auto_fill_organization_id
  BEFORE INSERT ON materialized_view_refresh_queue
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- organization_tags
DROP TRIGGER IF EXISTS organization_tags_auto_fill_organization_id ON organization_tags;
CREATE TRIGGER organization_tags_auto_fill_organization_id
  BEFORE INSERT ON organization_tags
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- query_cache
DROP TRIGGER IF EXISTS query_cache_auto_fill_organization_id ON query_cache;
CREATE TRIGGER query_cache_auto_fill_organization_id
  BEFORE INSERT ON query_cache
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();

-- token_access_rate_limit
DROP TRIGGER IF EXISTS token_access_rate_limit_auto_fill_organization_id ON token_access_rate_limit;
CREATE TRIGGER token_access_rate_limit_auto_fill_organization_id
  BEFORE INSERT ON token_access_rate_limit
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_organization_id();