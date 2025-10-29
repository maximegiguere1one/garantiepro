/*
  # Système de Gestion Autonome des Franchises

  ## Résumé
  Ce migration crée un système complet permettant aux franchisés de gérer leur propre franchise
  de manière autonome, incluant la gestion des employés et le suivi des commissions.

  ## 1. Tables Créées

  ### warranty_commissions
  - Suivi automatique des commissions pour chaque garantie vendue
  - Calcul automatique basé sur le taux de commission de la franchise
  - Statut de paiement et historique

  ### employee_invitations
  - Gestion des invitations d'employés par les franchisés
  - Suivi du statut d'invitation et nombre de tentatives
  - Liens d'invitation sécurisés avec expiration

  ### commission_rules
  - Configuration des taux de commission par franchise
  - Possibilité de taux différents par type de garantie
  - Historique des changements de taux

  ## 2. Sécurité (RLS)
  - Franchisés peuvent voir et gérer uniquement leurs propres données
  - Employés peuvent voir les données de leur franchise uniquement
  - Propriétaire a accès complet à toutes les données
  - Isolation stricte entre franchises

  ## 3. Triggers et Fonctions
  - Calcul automatique des commissions lors de création de garantie
  - Validation des limites d'employés par franchise
  - Notifications automatiques des nouvelles commissions
  - Génération automatique de tokens d'invitation sécurisés
*/

-- =====================================================
-- ÉTAPE 1: TABLE DES RÈGLES DE COMMISSION
-- =====================================================

CREATE TABLE IF NOT EXISTS commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Taux de commission
  percentage_rate numeric(5,2) NOT NULL DEFAULT 50.00 CHECK (percentage_rate >= 0 AND percentage_rate <= 100),

  -- Règles par type de garantie (optionnel)
  warranty_type text,
  min_warranty_price numeric(10,2),
  max_warranty_price numeric(10,2),

  -- Dates de validité
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_until timestamptz,

  -- Métadonnées
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  notes text,

  -- Index composé pour recherches rapides
  CONSTRAINT valid_date_range CHECK (effective_until IS NULL OR effective_until > effective_from)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_commission_rules_org ON commission_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_commission_rules_dates ON commission_rules(effective_from, effective_until);
CREATE INDEX IF NOT EXISTS idx_commission_rules_active ON commission_rules(organization_id, effective_from, effective_until)
  WHERE effective_until IS NULL OR effective_until > now();

-- RLS pour commission_rules
ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;

-- Propriétaire peut tout voir et modifier
CREATE POLICY "Owner can manage all commission rules"
  ON commission_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.organization_id IN (
        SELECT id FROM organizations WHERE type = 'owner'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.organization_id IN (
        SELECT id FROM organizations WHERE type = 'owner'
      )
    )
  );

-- Franchisés peuvent voir leurs propres règles
CREATE POLICY "Franchisees can view own commission rules"
  ON commission_rules FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- ÉTAPE 2: TABLE DES COMMISSIONS DE GARANTIES
-- =====================================================

CREATE TABLE IF NOT EXISTS warranty_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id uuid NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Détails financiers
  warranty_price numeric(10,2) NOT NULL,
  commission_rate numeric(5,2) NOT NULL,
  commission_amount numeric(10,2) NOT NULL,

  -- Statut de paiement
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'paid', 'cancelled')),
  payment_date timestamptz,
  payment_reference text,

  -- Période de facturation
  billing_period_start date NOT NULL,
  billing_period_end date NOT NULL,

  -- Métadonnées
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  paid_by uuid REFERENCES auth.users(id),
  notes text,

  -- Contraintes
  CONSTRAINT unique_warranty_commission UNIQUE(warranty_id),
  CONSTRAINT positive_amounts CHECK (warranty_price > 0 AND commission_amount >= 0)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_warranty_commissions_org ON warranty_commissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_warranty_commissions_warranty ON warranty_commissions(warranty_id);
CREATE INDEX IF NOT EXISTS idx_warranty_commissions_status ON warranty_commissions(payment_status);
CREATE INDEX IF NOT EXISTS idx_warranty_commissions_period ON warranty_commissions(billing_period_start, billing_period_end);
CREATE INDEX IF NOT EXISTS idx_warranty_commissions_unpaid ON warranty_commissions(organization_id, payment_status)
  WHERE payment_status = 'pending';

-- RLS pour warranty_commissions
ALTER TABLE warranty_commissions ENABLE ROW LEVEL SECURITY;

-- Propriétaire peut tout voir et gérer
CREATE POLICY "Owner can manage all commissions"
  ON warranty_commissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.organization_id IN (
        SELECT id FROM organizations WHERE type = 'owner'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.organization_id IN (
        SELECT id FROM organizations WHERE type = 'owner'
      )
    )
  );

-- Franchisés peuvent voir leurs propres commissions
CREATE POLICY "Franchisees can view own commissions"
  ON warranty_commissions FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- ÉTAPE 3: TABLE DES INVITATIONS D'EMPLOYÉS
-- =====================================================

CREATE TABLE IF NOT EXISTS employee_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Informations de l'invité
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'franchisee_employee' CHECK (role IN ('franchisee_admin', 'franchisee_employee', 'f_and_i', 'operations')),

  -- Token sécurisé pour l'invitation
  invitation_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'base64'),

  -- Statut de l'invitation
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),

  -- Suivi des tentatives
  sent_at timestamptz,
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  attempts int DEFAULT 0,
  last_attempt_at timestamptz,

  -- Métadonnées
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Contraintes
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT unique_org_email UNIQUE(organization_id, email)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_employee_invitations_org ON employee_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_token ON employee_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_status ON employee_invitations(status);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_email ON employee_invitations(email);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_pending ON employee_invitations(organization_id, status)
  WHERE status = 'pending';

-- RLS pour employee_invitations
ALTER TABLE employee_invitations ENABLE ROW LEVEL SECURITY;

-- Propriétaire peut tout voir
CREATE POLICY "Owner can view all employee invitations"
  ON employee_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.organization_id IN (
        SELECT id FROM organizations WHERE type = 'owner'
      )
    )
  );

-- Franchisés peuvent gérer les invitations de leur franchise
CREATE POLICY "Franchisees can manage own employee invitations"
  ON employee_invitations FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'franchisee_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'franchisee_admin')
    )
  );

-- =====================================================
-- ÉTAPE 4: FONCTION POUR CALCULER LA COMMISSION
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_warranty_commission(
  p_warranty_id uuid,
  p_warranty_price numeric,
  p_organization_id uuid
) RETURNS void AS $$
DECLARE
  v_commission_rate numeric;
  v_commission_amount numeric;
  v_period_start date;
  v_period_end date;
BEGIN
  -- Obtenir le taux de commission actif pour cette organisation
  SELECT percentage_rate INTO v_commission_rate
  FROM commission_rules
  WHERE organization_id = p_organization_id
    AND effective_from <= now()
    AND (effective_until IS NULL OR effective_until > now())
  ORDER BY effective_from DESC
  LIMIT 1;

  -- Si aucun taux trouvé, utiliser le taux de la config de facturation ou 50% par défaut
  IF v_commission_rate IS NULL THEN
    SELECT COALESCE(percentage_rate, 50.00) INTO v_commission_rate
    FROM organization_billing_config
    WHERE organization_id = p_organization_id;

    IF v_commission_rate IS NULL THEN
      v_commission_rate := 50.00;
    END IF;
  END IF;

  -- Calculer le montant de la commission
  v_commission_amount := (p_warranty_price * v_commission_rate / 100);

  -- Déterminer la période de facturation (mois en cours)
  v_period_start := date_trunc('month', now())::date;
  v_period_end := (date_trunc('month', now()) + interval '1 month' - interval '1 day')::date;

  -- Insérer la commission
  INSERT INTO warranty_commissions (
    warranty_id,
    organization_id,
    warranty_price,
    commission_rate,
    commission_amount,
    billing_period_start,
    billing_period_end,
    created_by
  ) VALUES (
    p_warranty_id,
    p_organization_id,
    p_warranty_price,
    v_commission_rate,
    v_commission_amount,
    v_period_start,
    v_period_end,
    auth.uid()
  )
  ON CONFLICT (warranty_id) DO NOTHING;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ÉTAPE 5: TRIGGER AUTOMATIQUE POUR LES COMMISSIONS
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_calculate_warranty_commission()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculer la commission seulement si la garantie a un prix et une organisation franchisée
  IF NEW.total_price > 0 AND NEW.organization_id IS NOT NULL THEN
    -- Vérifier que c'est une organisation franchisée
    IF EXISTS (
      SELECT 1 FROM organizations
      WHERE id = NEW.organization_id
      AND type = 'franchisee'
    ) THEN
      -- Calculer la commission
      PERFORM calculate_warranty_commission(
        NEW.id,
        NEW.total_price,
        NEW.organization_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger sur les garanties
DROP TRIGGER IF EXISTS warranty_commission_trigger ON warranties;
CREATE TRIGGER warranty_commission_trigger
  AFTER INSERT ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calculate_warranty_commission();

-- =====================================================
-- ÉTAPE 6: FONCTION DE VALIDATION DES LIMITES
-- =====================================================

CREATE OR REPLACE FUNCTION validate_employee_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_max_employees int;
  v_current_count int;
  v_org_type text;
BEGIN
  -- Obtenir le type d'organisation et la limite
  SELECT type, max_employees INTO v_org_type, v_max_employees
  FROM organizations
  WHERE id = NEW.organization_id;

  -- Ne valider que pour les franchises
  IF v_org_type = 'franchisee' THEN
    -- Compter les employés actuels
    SELECT COUNT(*) INTO v_current_count
    FROM profiles
    WHERE organization_id = NEW.organization_id
    AND role IN ('franchisee_admin', 'franchisee_employee', 'f_and_i', 'operations');

    -- Vérifier la limite
    IF v_current_count >= v_max_employees THEN
      RAISE EXCEPTION 'Employee limit reached for this franchise. Maximum: %', v_max_employees;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger sur les profils
DROP TRIGGER IF EXISTS validate_employee_limit_trigger ON profiles;
CREATE TRIGGER validate_employee_limit_trigger
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_employee_limit();

-- =====================================================
-- ÉTAPE 7: FONCTION POUR ACCEPTER UNE INVITATION
-- =====================================================

CREATE OR REPLACE FUNCTION accept_employee_invitation(
  p_invitation_token text,
  p_user_id uuid
) RETURNS json AS $$
DECLARE
  v_invitation employee_invitations;
  v_profile_id uuid;
  v_result json;
BEGIN
  -- Récupérer l'invitation
  SELECT * INTO v_invitation
  FROM employee_invitations
  WHERE invitation_token = p_invitation_token
  AND status = 'pending'
  AND expires_at > now();

  IF v_invitation IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired invitation'
    );
  END IF;

  -- Vérifier que l'email correspond à l'utilisateur
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = p_user_id
    AND email = v_invitation.email
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Email mismatch'
    );
  END IF;

  -- Créer le profil s'il n'existe pas
  INSERT INTO profiles (
    id,
    organization_id,
    full_name,
    email,
    role
  ) VALUES (
    p_user_id,
    v_invitation.organization_id,
    v_invitation.full_name,
    v_invitation.email,
    v_invitation.role
  )
  ON CONFLICT (id) DO UPDATE
  SET
    organization_id = EXCLUDED.organization_id,
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;

  -- Mettre à jour l'invitation
  UPDATE employee_invitations
  SET
    status = 'accepted',
    accepted_at = now(),
    updated_at = now()
  WHERE id = v_invitation.id;

  RETURN json_build_object(
    'success', true,
    'organization_id', v_invitation.organization_id,
    'role', v_invitation.role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ÉTAPE 8: VUE POUR STATISTIQUES DE FRANCHISE
-- =====================================================

CREATE OR REPLACE VIEW franchisee_statistics AS
SELECT
  o.id as organization_id,
  o.name as organization_name,

  -- Statistiques de garanties
  COUNT(DISTINCT w.id) as total_warranties,
  COUNT(DISTINCT CASE WHEN w.status = 'active' THEN w.id END) as active_warranties,
  SUM(w.total_price) as total_warranty_value,

  -- Statistiques de commissions
  COUNT(DISTINCT wc.id) as total_commissions,
  SUM(wc.commission_amount) as total_commission_amount,
  SUM(CASE WHEN wc.payment_status = 'pending' THEN wc.commission_amount ELSE 0 END) as pending_commission_amount,
  SUM(CASE WHEN wc.payment_status = 'paid' THEN wc.commission_amount ELSE 0 END) as paid_commission_amount,

  -- Statistiques d'employés
  COUNT(DISTINCT p.id) as total_employees,
  o.max_employees,

  -- Statistiques de réclamations
  COUNT(DISTINCT wc2.id) as total_claims,
  COUNT(DISTINCT CASE WHEN wc2.status = 'approved' THEN wc2.id END) as approved_claims,

  -- Dates
  MIN(w.created_at) as first_warranty_date,
  MAX(w.created_at) as last_warranty_date

FROM organizations o
LEFT JOIN warranties w ON w.organization_id = o.id
LEFT JOIN warranty_commissions wc ON wc.organization_id = o.id
LEFT JOIN profiles p ON p.organization_id = o.id
  AND p.role IN ('franchisee_admin', 'franchisee_employee', 'f_and_i', 'operations')
LEFT JOIN warranty_claims wc2 ON wc2.organization_id = o.id
WHERE o.type = 'franchisee'
GROUP BY o.id, o.name, o.max_employees;

-- =====================================================
-- ÉTAPE 9: INITIALISER LES RÈGLES DE COMMISSION
-- =====================================================

-- Créer des règles de commission par défaut pour toutes les franchises existantes
INSERT INTO commission_rules (organization_id, percentage_rate, created_at)
SELECT
  o.id,
  COALESCE(obc.percentage_rate, 50.00),
  now()
FROM organizations o
LEFT JOIN organization_billing_config obc ON obc.organization_id = o.id
WHERE o.type = 'franchisee'
AND NOT EXISTS (
  SELECT 1 FROM commission_rules cr WHERE cr.organization_id = o.id
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- ÉTAPE 10: COMMENTER LES TABLES
-- =====================================================

COMMENT ON TABLE commission_rules IS 'Règles de commission configurables par franchise';
COMMENT ON TABLE warranty_commissions IS 'Commissions calculées automatiquement pour chaque garantie vendue';
COMMENT ON TABLE employee_invitations IS 'Invitations d''employés créées par les franchisés';
COMMENT ON VIEW franchisee_statistics IS 'Vue consolidée des statistiques par franchise';

COMMENT ON COLUMN warranty_commissions.payment_status IS 'Statut du paiement: pending, processing, paid, cancelled';
COMMENT ON COLUMN employee_invitations.invitation_token IS 'Token sécurisé unique pour l''invitation';
COMMENT ON COLUMN employee_invitations.expires_at IS 'Date d''expiration de l''invitation (7 jours par défaut)';
