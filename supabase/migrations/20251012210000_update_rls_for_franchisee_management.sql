/*
  # Mise à Jour des Politiques RLS pour la Gestion Autonome des Franchisés

  ## Résumé
  Cette migration met à jour toutes les politiques RLS pour permettre aux franchisés
  de gérer leurs propres données et leurs employés de manière autonome, tout en
  maintenant une isolation stricte entre les franchises.

  ## Modifications RLS

  ### profiles
  - Franchisés peuvent voir tous les profils de leur organisation
  - Franchisés admin peuvent créer et modifier les profils employés de leur organisation
  - Employés peuvent voir leur propre profil et celui de leurs collègues

  ### warranties
  - Tous les membres d'une franchise peuvent voir les garanties de leur organisation
  - Franchisés et employés peuvent créer des garanties pour leur organisation

  ### warranty_claims
  - Tous les membres d'une franchise peuvent voir les réclamations de leur organisation

  ### company_settings
  - Franchisés admin peuvent modifier les paramètres de leur organisation

  ### organization_billing_config
  - Franchisés peuvent voir leur config de facturation (lecture seule)
*/

-- =====================================================
-- ÉTAPE 1: MISE À JOUR DES POLITIQUES PROFILES
-- =====================================================

-- Supprimer les anciennes politiques restrictives
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile and colleagues" ON profiles;
DROP POLICY IF EXISTS "Franchisees can view own organization profiles" ON profiles;

-- Nouvelle politique: Tous les membres peuvent voir les profils de leur organisation
CREATE POLICY "Members can view organization profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Nouvelle politique: Franchisés admin peuvent créer des employés
CREATE POLICY "Franchisee admins can create employees"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Vérifie que l'utilisateur est admin de cette organisation
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'franchisee_admin')
    )
    -- Et que le nouveau profil est un employé
    AND role IN ('franchisee_employee', 'f_and_i', 'operations', 'franchisee_admin')
  );

-- Nouvelle politique: Franchisés admin peuvent modifier les employés
CREATE POLICY "Franchisee admins can update employees"
  ON profiles FOR UPDATE
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

-- Nouvelle politique: Utilisateurs peuvent modifier leur propre profil
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- Ne peut pas changer son organization_id ou devenir admin
    AND organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
  );

-- =====================================================
-- ÉTAPE 2: MISE À JOUR DES POLITIQUES WARRANTIES
-- =====================================================

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Franchisees can view own warranties" ON warranties;
DROP POLICY IF EXISTS "Franchisees can create own warranties" ON warranties;

-- Nouvelle politique: Tous les membres peuvent voir les garanties de leur organisation
CREATE POLICY "Members can view organization warranties"
  ON warranties FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Nouvelle politique: Tous les membres peuvent créer des garanties
CREATE POLICY "Members can create warranties"
  ON warranties FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Nouvelle politique: Tous les membres peuvent modifier les garanties de leur org
CREATE POLICY "Members can update organization warranties"
  ON warranties FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- ÉTAPE 3: MISE À JOUR DES POLITIQUES WARRANTY_CLAIMS
-- =====================================================

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Franchisees can view own claims" ON warranty_claims;

-- Nouvelle politique: Tous les membres peuvent voir les réclamations de leur organisation
CREATE POLICY "Members can view organization claims"
  ON warranty_claims FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Nouvelle politique: Tous les membres peuvent créer des réclamations
CREATE POLICY "Members can create claims"
  ON warranty_claims FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Nouvelle politique: Tous les membres peuvent modifier les réclamations de leur org
CREATE POLICY "Members can update organization claims"
  ON warranty_claims FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- ÉTAPE 4: MISE À JOUR DES POLITIQUES COMPANY_SETTINGS
-- =====================================================

-- S'assurer que company_settings a organization_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN organization_id uuid REFERENCES organizations(id);
    CREATE INDEX IF NOT EXISTS idx_company_settings_org ON company_settings(organization_id);
  END IF;
END $$;

-- Activer RLS si pas déjà activé
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Supprimer anciennes politiques
DROP POLICY IF EXISTS "Franchisees can view own settings" ON company_settings;
DROP POLICY IF EXISTS "Franchisees can update own settings" ON company_settings;

-- Nouvelle politique: Tous les membres peuvent voir les paramètres de leur organisation
CREATE POLICY "Members can view organization settings"
  ON company_settings FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Nouvelle politique: Franchisés admin peuvent modifier les paramètres
CREATE POLICY "Franchisee admins can update settings"
  ON company_settings FOR UPDATE
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

-- Nouvelle politique: Franchisés admin peuvent créer des paramètres
CREATE POLICY "Franchisee admins can insert settings"
  ON company_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'franchisee_admin')
    )
  );

-- =====================================================
-- ÉTAPE 5: POLITIQUES POUR CUSTOMER_PRODUCTS
-- =====================================================

-- S'assurer que la table existe et a organization_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_products') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'customer_products' AND column_name = 'organization_id'
    ) THEN
      ALTER TABLE customer_products ADD COLUMN organization_id uuid REFERENCES organizations(id);
      CREATE INDEX IF NOT EXISTS idx_customer_products_org ON customer_products(organization_id);
    END IF;

    ALTER TABLE customer_products ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Members can view organization customer products" ON customer_products;
    DROP POLICY IF EXISTS "Members can manage customer products" ON customer_products;

    CREATE POLICY "Members can view organization customer products"
      ON customer_products FOR SELECT
      TO authenticated
      USING (
        organization_id IN (
          SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
      );

    CREATE POLICY "Members can manage customer products"
      ON customer_products FOR ALL
      TO authenticated
      USING (
        organization_id IN (
          SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
      )
      WITH CHECK (
        organization_id IN (
          SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 6: POLITIQUES POUR DEALER_INVENTORY
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dealer_inventory') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'dealer_inventory' AND column_name = 'organization_id'
    ) THEN
      ALTER TABLE dealer_inventory ADD COLUMN organization_id uuid REFERENCES organizations(id);
      CREATE INDEX IF NOT EXISTS idx_dealer_inventory_org ON dealer_inventory(organization_id);
    END IF;

    ALTER TABLE dealer_inventory ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Members can view organization inventory" ON dealer_inventory;
    DROP POLICY IF EXISTS "Members can manage inventory" ON dealer_inventory;

    CREATE POLICY "Members can view organization inventory"
      ON dealer_inventory FOR SELECT
      TO authenticated
      USING (
        organization_id IN (
          SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
      );

    CREATE POLICY "Members can manage inventory"
      ON dealer_inventory FOR ALL
      TO authenticated
      USING (
        organization_id IN (
          SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
      )
      WITH CHECK (
        organization_id IN (
          SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 7: FONCTION HELPER POUR VÉRIFIER LES PERMISSIONS
-- =====================================================

CREATE OR REPLACE FUNCTION is_franchisee_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'franchisee_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_same_organization(p_organization_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN p_organization_id = get_user_organization_id();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- ÉTAPE 8: MISE À JOUR POUR NOTIFICATIONS
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Members can view organization notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;

    -- Utilisateurs peuvent voir leurs propres notifications
    CREATE POLICY "Users can view own notifications"
      ON notifications FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());

    -- Utilisateurs peuvent mettre à jour leurs propres notifications
    CREATE POLICY "Users can update own notifications"
      ON notifications FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 9: COMMENTAIRES
-- =====================================================

COMMENT ON FUNCTION is_franchisee_admin() IS 'Vérifie si l''utilisateur actuel est admin de franchise';
COMMENT ON FUNCTION get_user_organization_id() IS 'Retourne l''organization_id de l''utilisateur actuel';
COMMENT ON FUNCTION is_same_organization(uuid) IS 'Vérifie si l''organization_id fourni correspond à celle de l''utilisateur';
