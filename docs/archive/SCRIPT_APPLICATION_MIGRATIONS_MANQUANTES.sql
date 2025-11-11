-- =====================================================
-- SCRIPT D'APPLICATION DES MIGRATIONS MANQUANTES
-- Date: 28 Octobre 2025
-- Objectif: Restaurer toutes les tables manquantes
-- =====================================================

/*
  INSTRUCTIONS D'UTILISATION:

  1. Ce script doit être exécuté dans le tableau de bord Supabase
  2. Aller dans: Database → SQL Editor
  3. Copier-coller ce script dans un nouveau query
  4. Exécuter le script complet
  5. Vérifier les logs pour les erreurs

  ATTENTION:
  - Ce script utilise IF NOT EXISTS pour éviter les erreurs
  - Les tables existantes ne seront pas modifiées
  - Temps d'exécution estimé: 2-3 minutes
*/

-- =====================================================
-- ÉTAPE 1: TABLES CRITIQUES (Email et Logs)
-- =====================================================

-- Table: email_queue (File d'attente d'emails)
CREATE TABLE IF NOT EXISTS email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  to_email text NOT NULL,
  from_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  scheduled_at timestamptz DEFAULT now(),
  sent_at timestamptz,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON email_queue(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_queue_org ON email_queue(organization_id);

ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org emails"
  ON email_queue FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND organization_id = email_queue.organization_id
    )
  );

-- Table: error_logs (Logs d'erreurs)
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  error_type text NOT NULL,
  error_message text NOT NULL,
  error_stack text,
  context jsonb DEFAULT '{}'::jsonb,
  severity text DEFAULT 'error' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_org ON error_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_unresolved ON error_logs(resolved) WHERE NOT resolved;

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view org error logs"
  ON error_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND organization_id = error_logs.organization_id
      AND role IN ('master', 'admin', 'franchisee_admin')
    )
  );

-- =====================================================
-- ÉTAPE 2: TABLES DE RÉCLAMATIONS PUBLIQUES
-- =====================================================

-- Table: warranty_claim_tokens (Tokens de réclamation)
CREATE TABLE IF NOT EXISTS warranty_claim_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id uuid REFERENCES warranties(id) ON DELETE CASCADE NOT NULL,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  used_at timestamptz,
  claim_id uuid REFERENCES claims(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_warranty_claim_tokens_token ON warranty_claim_tokens(token);
CREATE INDEX IF NOT EXISTS idx_warranty_claim_tokens_warranty ON warranty_claim_tokens(warranty_id);
CREATE INDEX IF NOT EXISTS idx_warranty_claim_tokens_unused ON warranty_claim_tokens(used) WHERE NOT used;

ALTER TABLE warranty_claim_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can use valid tokens"
  ON warranty_claim_tokens FOR SELECT
  TO anon, authenticated
  USING (NOT used AND expires_at > now());

CREATE POLICY "System can update tokens"
  ON warranty_claim_tokens FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- ÉTAPE 3: TABLES D'INVENTAIRE
-- =====================================================

-- Table: dealer_inventory (Inventaire du dealer)
CREATE TABLE IF NOT EXISTS dealer_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  vin text NOT NULL,
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  type text NOT NULL,
  color text,
  purchase_date date,
  purchase_price numeric(12,2),
  asking_price numeric(12,2),
  status text DEFAULT 'available' CHECK (status IN ('available', 'sold', 'reserved', 'pending')),
  location text,
  notes text,
  sold_date date,
  sold_price numeric(12,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dealer_inventory_org ON dealer_inventory(organization_id);
CREATE INDEX IF NOT EXISTS idx_dealer_inventory_vin ON dealer_inventory(vin);
CREATE INDEX IF NOT EXISTS idx_dealer_inventory_status ON dealer_inventory(status);

ALTER TABLE dealer_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org inventory"
  ON dealer_inventory FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND organization_id = dealer_inventory.organization_id
    )
  );

CREATE POLICY "Users can manage own org inventory"
  ON dealer_inventory FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND organization_id = dealer_inventory.organization_id
      AND role IN ('master', 'admin', 'franchisee_admin', 'employee')
    )
  );

-- Table: customer_products (Produits du client)
CREATE TABLE IF NOT EXISTS customer_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  product_type text NOT NULL,
  brand text,
  model text,
  serial_number text,
  purchase_date date,
  purchase_price numeric(12,2),
  warranty_id uuid REFERENCES warranties(id) ON DELETE SET NULL,
  manufacturer_warranty_end_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_products_customer ON customer_products(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_products_org ON customer_products(organization_id);
CREATE INDEX IF NOT EXISTS idx_customer_products_warranty ON customer_products(warranty_id);

ALTER TABLE customer_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org customer products"
  ON customer_products FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND organization_id = customer_products.organization_id
    )
  );

CREATE POLICY "Users can manage own org customer products"
  ON customer_products FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND organization_id = customer_products.organization_id
    )
  );

-- =====================================================
-- ÉTAPE 4: TABLES DE TÉLÉCHARGEMENT
-- =====================================================

-- Table: warranty_download_tokens (Tokens de téléchargement)
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
  USING (true)
  WITH CHECK (true);

-- Table: warranty_download_logs (Logs de téléchargement)
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

-- =====================================================
-- ÉTAPE 5: TABLES DE TEMPLATES
-- =====================================================

-- Table: warranty_templates (Templates de garanties)
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
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND organization_id = warranty_templates.organization_id
    )
  );

CREATE POLICY "Admins can manage own org templates"
  ON warranty_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND organization_id = warranty_templates.organization_id
      AND role IN ('master', 'admin', 'franchisee_admin')
    )
  );

-- Table: warranty_template_sections (Sections de templates)
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

-- =====================================================
-- RÉSULTAT ET VÉRIFICATION
-- =====================================================

DO $$
DECLARE
  table_count integer;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

  RAISE NOTICE '============================================';
  RAISE NOTICE 'MIGRATION TERMINÉE AVEC SUCCÈS';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Nombre total de tables: %', table_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Tables créées dans ce script:';
  RAISE NOTICE '  ✓ email_queue';
  RAISE NOTICE '  ✓ error_logs';
  RAISE NOTICE '  ✓ warranty_claim_tokens';
  RAISE NOTICE '  ✓ dealer_inventory';
  RAISE NOTICE '  ✓ customer_products';
  RAISE NOTICE '  ✓ warranty_download_tokens';
  RAISE NOTICE '  ✓ warranty_download_logs';
  RAISE NOTICE '  ✓ warranty_templates';
  RAISE NOTICE '  ✓ warranty_template_sections';
  RAISE NOTICE '';
  RAISE NOTICE 'Prochaines étapes:';
  RAISE NOTICE '  1. Vérifier les tables créées dans Database → Tables';
  RAISE NOTICE '  2. Tester les fonctionnalités dépendantes';
  RAISE NOTICE '  3. Appliquer les migrations suivantes si nécessaire';
  RAISE NOTICE '============================================';
END $$;
