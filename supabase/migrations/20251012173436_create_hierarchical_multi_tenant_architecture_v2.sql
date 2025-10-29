/*
  # Architecture Multi-Tenant Hiérarchique - Version Corrigée
  
  ## Résumé
  Création d'une structure hiérarchique complète pour gérer:
  - 1 Compte Maître (Philippe) - Vision globale de toutes les franchises
  - N Franchisés - Instances isolées avec leurs propres données
  - N Employés par franchise - Accès restreint à leur franchise uniquement
  
  ## Hiérarchie
  ```
  Master Account (Philippe)
    ├── Franchise A
    │   ├── Employee 1
    │   ├── Employee 2
    │   └── Employee 3
    ├── Franchise B
    │   └── Employee 1
    └── Franchise C
        ├── Employee 1
        └── Employee 2
  ```
*/

-- =====================================================
-- ÉTAPE 1: EXTENSION DE LA TABLE ORGANIZATIONS
-- =====================================================

-- Ajouter colonnes pour hiérarchie
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS parent_organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_master boolean DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS franchise_code text UNIQUE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active' CHECK (subscription_status IN ('active', 'suspended', 'cancelled', 'trial'));
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_employees int DEFAULT 10;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_warranties int DEFAULT 1000;

-- Créer index pour performance
CREATE INDEX IF NOT EXISTS idx_organizations_parent ON organizations(parent_organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_is_master ON organizations(is_master);
CREATE INDEX IF NOT EXISTS idx_organizations_franchise_code ON organizations(franchise_code);

COMMENT ON COLUMN organizations.parent_organization_id IS 'ID de l''organisation parent (maître). NULL pour le compte maître';
COMMENT ON COLUMN organizations.is_master IS 'true si c''est le compte maître (Philippe)';
COMMENT ON COLUMN organizations.franchise_code IS 'Code unique d''identification de la franchise (ex: FR-001)';

-- =====================================================
-- ÉTAPE 2: EXTENSION DE LA TABLE PROFILES
-- =====================================================

-- Ajouter colonne pour identifier le compte maître
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_master_account boolean DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_profiles_is_master ON profiles(is_master_account);

-- Mettre à jour la contrainte de rôle
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_role_check'
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
  END IF;
  
  ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('master', 'admin', 'super_admin', 'franchisee_admin', 'franchisee_employee', 'f_and_i', 'operations', 'dealer', 'client'));
END $$;

-- =====================================================
-- ÉTAPE 3: TABLE POUR STATISTIQUES PAR FRANCHISE
-- =====================================================

CREATE TABLE IF NOT EXISTS franchise_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  
  -- Métriques de garanties
  total_warranties int DEFAULT 0,
  active_warranties int DEFAULT 0,
  expired_warranties int DEFAULT 0,
  cancelled_warranties int DEFAULT 0,
  
  -- Métriques financières
  total_revenue numeric(12,2) DEFAULT 0,
  total_claims_cost numeric(12,2) DEFAULT 0,
  net_profit numeric(12,2) DEFAULT 0,
  
  -- Métriques clients
  total_customers int DEFAULT 0,
  new_customers int DEFAULT 0,
  
  -- Métriques employés
  total_employees int DEFAULT 0,
  
  -- Métriques réclamations
  total_claims int DEFAULT 0,
  approved_claims int DEFAULT 0,
  rejected_claims int DEFAULT 0,
  pending_claims int DEFAULT 0,
  avg_claim_resolution_days numeric(5,2) DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_franchise_stats_org ON franchise_stats(organization_id);
CREATE INDEX IF NOT EXISTS idx_franchise_stats_period ON franchise_stats(period_start, period_end);

ALTER TABLE franchise_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour franchise_stats
CREATE POLICY "Master can view all franchise stats"
  ON franchise_stats FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (is_master_account = true OR role = 'master')
    )
  );

CREATE POLICY "Franchise can view own stats"
  ON franchise_stats FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND profiles.organization_id = franchise_stats.organization_id
    )
  );

-- =====================================================
-- ÉTAPE 4: TABLE POUR LOGS D'ACTIVITÉ MAÎTRE
-- =====================================================

CREATE TABLE IF NOT EXISTS master_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN (
    'create_franchise', 
    'suspend_franchise', 
    'reactivate_franchise',
    'update_subscription',
    'view_franchise_data',
    'export_global_report',
    'send_announcement'
  )),
  target_organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_master_log_user ON master_activity_log(master_user_id);
CREATE INDEX IF NOT EXISTS idx_master_log_org ON master_activity_log(target_organization_id);
CREATE INDEX IF NOT EXISTS idx_master_log_created ON master_activity_log(created_at DESC);

ALTER TABLE master_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master can view own activity log"
  ON master_activity_log FOR SELECT
  TO authenticated
  USING (
    master_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (is_master_account = true OR role = 'master')
    )
  );

CREATE POLICY "Master can insert activity log"
  ON master_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (
    master_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (is_master_account = true OR role = 'master')
    )
  );

-- =====================================================
-- ÉTAPE 5: FONCTIONS HELPER POUR HIÉRARCHIE
-- =====================================================

CREATE OR REPLACE FUNCTION is_master_account()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (is_master_account = true OR role = 'master')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_master_account() TO authenticated;

-- Fonction pour obtenir toutes les franchises d'un maître
CREATE OR REPLACE FUNCTION get_master_franchises()
RETURNS TABLE (
  franchise_id uuid,
  franchise_name text,
  franchise_code text,
  status text,
  created_at timestamptz,
  total_employees bigint,
  total_warranties bigint,
  subscription_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_master_account() THEN
    RAISE EXCEPTION 'Access denied: Not a master account';
  END IF;

  RETURN QUERY
  SELECT
    o.id as franchise_id,
    o.name as franchise_name,
    o.franchise_code,
    o.status,
    o.created_at,
    COUNT(DISTINCT p.id) as total_employees,
    COUNT(DISTINCT w.id) as total_warranties,
    o.subscription_status
  FROM organizations o
  LEFT JOIN profiles p ON p.organization_id = o.id
  LEFT JOIN warranties w ON w.organization_id = o.id AND w.status = 'active'
  WHERE o.is_master = false
  AND o.parent_organization_id IS NOT NULL
  GROUP BY o.id, o.name, o.franchise_code, o.status, o.created_at, o.subscription_status
  ORDER BY o.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_master_franchises() TO authenticated;

-- Fonction pour obtenir les statistiques consolidées
CREATE OR REPLACE FUNCTION get_consolidated_stats(p_period_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT is_master_account() THEN
    RAISE EXCEPTION 'Access denied: Not a master account';
  END IF;

  SELECT jsonb_build_object(
    'total_franchises', COUNT(DISTINCT o.id),
    'active_franchises', COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'active'),
    'total_warranties', COUNT(DISTINCT w.id),
    'active_warranties', COUNT(DISTINCT w.id) FILTER (WHERE w.status = 'active'),
    'total_customers', COUNT(DISTINCT c.id),
    'total_employees', COUNT(DISTINCT p.id),
    'total_revenue', COALESCE(SUM(w.total_price), 0),
    'total_claims', COUNT(DISTINCT cl.id),
    'pending_claims', COUNT(DISTINCT cl.id) FILTER (WHERE cl.status = 'pending'),
    'period_days', p_period_days,
    'calculated_at', NOW()
  ) INTO v_result
  FROM organizations o
  LEFT JOIN warranties w ON w.organization_id = o.id 
    AND w.created_at > NOW() - (p_period_days || ' days')::interval
  LEFT JOIN customers c ON c.organization_id = o.id
  LEFT JOIN profiles p ON p.organization_id = o.id
  LEFT JOIN claims cl ON cl.organization_id = o.id
    AND cl.created_at > NOW() - (p_period_days || ' days')::interval
  WHERE o.is_master = false
  AND o.parent_organization_id IS NOT NULL;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_consolidated_stats(int) TO authenticated;

-- =====================================================
-- ÉTAPE 6: MISE À JOUR DES RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Master can view all organizations" ON organizations;
CREATE POLICY "Master can view all organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    is_master_account()
    OR id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- ÉTAPE 7: CRÉER/METTRE À JOUR LE COMPTE MAÎTRE
-- =====================================================

DO $$
DECLARE
  v_master_org_id uuid;
  v_existing_owner_org_id uuid;
BEGIN
  SELECT id INTO v_master_org_id
  FROM organizations
  WHERE is_master = true
  LIMIT 1;

  IF v_master_org_id IS NULL THEN
    SELECT id INTO v_existing_owner_org_id
    FROM organizations
    WHERE type = 'owner'
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_existing_owner_org_id IS NOT NULL THEN
      UPDATE organizations
      SET
        is_master = true,
        franchise_code = 'MASTER-001',
        name = 'Location Pro Remorque - Compte Maître',
        subscription_status = 'active',
        max_employees = 999,
        max_warranties = 999999
      WHERE id = v_existing_owner_org_id;

      UPDATE profiles
      SET
        is_master_account = true,
        role = 'master'
      WHERE organization_id = v_existing_owner_org_id
      AND role IN ('admin', 'super_admin');

      RAISE NOTICE 'Organisation owner convertie en compte maître: %', v_existing_owner_org_id;
    END IF;
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 8: FONCTION POUR CRÉER UNE FRANCHISE
-- =====================================================

CREATE OR REPLACE FUNCTION create_franchise(
  p_name text,
  p_billing_email text,
  p_phone text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_province text DEFAULT 'QC',
  p_postal_code text DEFAULT NULL,
  p_max_employees int DEFAULT 10,
  p_max_warranties int DEFAULT 1000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_master_org_id uuid;
  v_franchise_id uuid;
  v_franchise_code text;
  v_franchise_count int;
BEGIN
  IF NOT is_master_account() THEN
    RAISE EXCEPTION 'Access denied: Only master account can create franchises';
  END IF;

  SELECT organization_id INTO v_master_org_id
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;

  SELECT COUNT(*) INTO v_franchise_count
  FROM organizations
  WHERE parent_organization_id = v_master_org_id;

  v_franchise_code := 'FR-' || LPAD((v_franchise_count + 1)::text, 3, '0');

  INSERT INTO organizations (
    name,
    type,
    parent_organization_id,
    is_master,
    franchise_code,
    status,
    billing_email,
    billing_phone,
    address,
    city,
    province,
    postal_code,
    primary_color,
    secondary_color,
    subscription_status,
    subscription_expires_at,
    max_employees,
    max_warranties
  ) VALUES (
    p_name,
    'franchisee',
    v_master_org_id,
    false,
    v_franchise_code,
    'active',
    p_billing_email,
    p_phone,
    p_address,
    p_city,
    p_province,
    p_postal_code,
    '#10b981',
    '#3b82f6',
    'trial',
    NOW() + INTERVAL '30 days',
    p_max_employees,
    p_max_warranties
  )
  RETURNING id INTO v_franchise_id;

  INSERT INTO master_activity_log (
    master_user_id,
    action_type,
    target_organization_id,
    description,
    metadata
  ) VALUES (
    auth.uid(),
    'create_franchise',
    v_franchise_id,
    'Nouvelle franchise créée: ' || p_name,
    jsonb_build_object(
      'franchise_code', v_franchise_code,
      'billing_email', p_billing_email
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'franchise_id', v_franchise_id,
    'franchise_code', v_franchise_code,
    'name', p_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION create_franchise(text, text, text, text, text, text, text, int, int) TO authenticated;

-- =====================================================
-- VÉRIFICATION FINALE
-- =====================================================

DO $$
DECLARE
  master_org_count int;
  function_count int;
BEGIN
  SELECT COUNT(*) INTO master_org_count FROM organizations WHERE is_master = true;
  SELECT COUNT(*) INTO function_count
  FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname IN ('is_master_account', 'get_master_franchises', 'get_consolidated_stats', 'create_franchise');

  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION HIÉRARCHIQUE COMPLÉTÉE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ Organisations maîtres: %', master_org_count;
  RAISE NOTICE '✓ Fonctions créées: %', function_count;
  RAISE NOTICE '========================================';
END $$;
