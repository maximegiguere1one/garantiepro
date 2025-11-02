/*
  # Fix All Franchise System Issues

  1. Permissions RLS
    - Corriger toutes les politiques RLS pour organizations
    - Corriger les politiques pour organization_billing_config
    - Corriger les politiques pour franchisee_invitations
    - S'assurer que masters et admins peuvent tout faire

  2. Foreign Keys
    - Vérifier et corriger toutes les contraintes
    - Ajouter ON DELETE CASCADE où nécessaire

  3. Triggers
    - Corriger le trigger de création de profil
    - Corriger le trigger d'auto-fill organization_id

  4. Fonctions RPC
    - Vérifier check_invitation_rate_limit existe
    - Créer les fonctions manquantes
*/

-- ============================================================================
-- 1. PERMISSIONS RLS - ORGANIZATIONS
-- ============================================================================

-- Désactiver temporairement RLS pour nettoyer
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Masters can view all organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can view all organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view own organization" ON organizations;
DROP POLICY IF EXISTS "Masters can insert organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can insert organizations" ON organizations;
DROP POLICY IF EXISTS "Masters can update all organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can update all organizations" ON organizations;
DROP POLICY IF EXISTS "Masters can delete organizations" ON organizations;

-- Réactiver RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- SELECT: Masters voient TOUT, autres voient leur org ou celles qu'ils possèdent
CREATE POLICY "Masters and admins can view all organizations"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master', 'admin')
    )
  );

CREATE POLICY "Users can view own organization"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- INSERT: Seulement masters et admins
CREATE POLICY "Masters and admins can create organizations"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master', 'admin')
    )
  );

-- UPDATE: Masters et admins peuvent modifier toutes les orgs
CREATE POLICY "Masters and admins can update organizations"
  ON organizations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master', 'admin')
    )
  );

-- DELETE: Seulement masters
CREATE POLICY "Masters can delete organizations"
  ON organizations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'master'
    )
  );

-- ============================================================================
-- 2. PERMISSIONS RLS - ORGANIZATION_BILLING_CONFIG
-- ============================================================================

ALTER TABLE organization_billing_config DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Masters and admins can view all billing configs" ON organization_billing_config;
DROP POLICY IF EXISTS "Users can view own org billing config" ON organization_billing_config;
DROP POLICY IF EXISTS "Masters and admins can insert billing configs" ON organization_billing_config;
DROP POLICY IF EXISTS "Masters and admins can update billing configs" ON organization_billing_config;
DROP POLICY IF EXISTS "Masters can delete billing configs" ON organization_billing_config;

ALTER TABLE organization_billing_config ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "Masters and admins can view all billing configs"
  ON organization_billing_config
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master', 'admin')
    )
  );

CREATE POLICY "Users can view own org billing config"
  ON organization_billing_config
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- INSERT
CREATE POLICY "Masters and admins can insert billing configs"
  ON organization_billing_config
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master', 'admin')
    )
  );

-- UPDATE
CREATE POLICY "Masters and admins can update billing configs"
  ON organization_billing_config
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master', 'admin')
    )
  );

-- DELETE
CREATE POLICY "Masters can delete billing configs"
  ON organization_billing_config
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'master'
    )
  );

-- ============================================================================
-- 3. PERMISSIONS RLS - FRANCHISEE_INVITATIONS
-- ============================================================================

ALTER TABLE franchisee_invitations DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Masters and admins can view all invitations" ON franchisee_invitations;
DROP POLICY IF EXISTS "Masters and admins can insert invitations" ON franchisee_invitations;
DROP POLICY IF EXISTS "Masters and admins can update invitations" ON franchisee_invitations;
DROP POLICY IF EXISTS "Masters can delete invitations" ON franchisee_invitations;

ALTER TABLE franchisee_invitations ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "Masters and admins can view all invitations"
  ON franchisee_invitations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master', 'admin', 'franchisee_admin')
    )
  );

-- INSERT
CREATE POLICY "Masters and admins can insert invitations"
  ON franchisee_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master', 'admin', 'franchisee_admin')
    )
  );

-- UPDATE
CREATE POLICY "Masters and admins can update invitations"
  ON franchisee_invitations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master', 'admin', 'franchisee_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master', 'admin', 'franchisee_admin')
    )
  );

-- DELETE
CREATE POLICY "Masters can delete invitations"
  ON franchisee_invitations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master', 'admin')
    )
  );

-- ============================================================================
-- 4. FOREIGN KEYS - Corriger pour éviter les erreurs
-- ============================================================================

-- Vérifier que organization_billing_config a bien la FK
DO $$
BEGIN
  -- Supprimer l'ancienne FK si elle existe
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'organization_billing_config_organization_id_fkey'
    AND table_name = 'organization_billing_config'
  ) THEN
    ALTER TABLE organization_billing_config
    DROP CONSTRAINT organization_billing_config_organization_id_fkey;
  END IF;

  -- Recréer avec CASCADE
  ALTER TABLE organization_billing_config
  ADD CONSTRAINT organization_billing_config_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES organizations(id)
  ON DELETE CASCADE;
END $$;

-- Vérifier franchisee_invitations
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'franchisee_invitations_organization_id_fkey'
    AND table_name = 'franchisee_invitations'
  ) THEN
    ALTER TABLE franchisee_invitations
    DROP CONSTRAINT franchisee_invitations_organization_id_fkey;
  END IF;

  ALTER TABLE franchisee_invitations
  ADD CONSTRAINT franchisee_invitations_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES organizations(id)
  ON DELETE CASCADE;
END $$;

-- ============================================================================
-- 5. FONCTION RATE LIMIT - Créer si elle n'existe pas
-- ============================================================================

CREATE OR REPLACE FUNCTION check_invitation_rate_limit(
  p_organization_id uuid,
  p_hours integer DEFAULT 1,
  p_max_attempts integer DEFAULT 3
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  attempt_count integer;
BEGIN
  -- Compter les tentatives récentes
  SELECT COUNT(*)
  INTO attempt_count
  FROM franchisee_invitations
  WHERE organization_id = p_organization_id
    AND created_at > NOW() - (p_hours || ' hours')::interval;

  -- Retourner true si sous la limite, false si dépassé
  RETURN attempt_count < p_max_attempts;
END;
$$;

-- ============================================================================
-- 6. TRIGGER AUTO-FILL ORGANIZATION_ID
-- ============================================================================

-- Fonction pour auto-fill organization_id sur organization_billing_config
CREATE OR REPLACE FUNCTION auto_fill_billing_organization_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si organization_id est null, ne rien faire (sera fourni par l'utilisateur)
  -- Ce trigger est juste pour validation
  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id ne peut pas être null';
  END IF;

  RETURN NEW;
END;
$$;

-- Supprimer le trigger s'il existe
DROP TRIGGER IF EXISTS auto_fill_billing_organization_id_trigger ON organization_billing_config;

-- Recréer le trigger
CREATE TRIGGER auto_fill_billing_organization_id_trigger
  BEFORE INSERT ON organization_billing_config
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_billing_organization_id();

-- ============================================================================
-- 7. TRIGGER CRÉATION PROFIL - Améliorer pour être plus robuste
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    organization_id
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    (NEW.raw_user_meta_data->>'organization_id')::uuid
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = COALESCE(EXCLUDED.role, profiles.role),
    organization_id = COALESCE(EXCLUDED.organization_id, profiles.organization_id),
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Supprimer et recréer le trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- 8. PERMISSIONS SUR LES FONCTIONS
-- ============================================================================

-- Donner les permissions nécessaires
GRANT EXECUTE ON FUNCTION check_invitation_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION check_invitation_rate_limit TO service_role;

-- ============================================================================
-- 9. VÉRIFICATIONS FINALES
-- ============================================================================

-- Vérifier que toutes les tables ont RLS activé
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'organizations'
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on organizations table';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'organization_billing_config'
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on organization_billing_config table';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'franchisee_invitations'
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on franchisee_invitations table';
  END IF;
END $$;

-- ============================================================================
-- 10. INDEX POUR PERFORMANCE
-- ============================================================================

-- Index pour améliorer les performances des politiques RLS
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON profiles(role);

CREATE INDEX IF NOT EXISTS idx_profiles_organization_id
  ON profiles(organization_id);

CREATE INDEX IF NOT EXISTS idx_organizations_owner_organization_id
  ON organizations(owner_organization_id);

CREATE INDEX IF NOT EXISTS idx_franchisee_invitations_created_at
  ON franchisee_invitations(created_at);

CREATE INDEX IF NOT EXISTS idx_franchisee_invitations_organization_id
  ON franchisee_invitations(organization_id);
