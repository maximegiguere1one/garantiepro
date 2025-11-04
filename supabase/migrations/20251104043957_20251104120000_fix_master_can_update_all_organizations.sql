/*
  # Autoriser Master à Modifier Toutes les Organisations

  ## Problème
  - Master peut VOIR toutes les organisations
  - Mais ne peut PAS les modifier (UPDATE bloqué par RLS)
  - Les utilisateurs ne peuvent pas modifier le nom des organisations

  ## Solution
  1. Ajouter policy UPDATE pour role='master'
  2. Ajouter policy UPDATE pour admin de leur propre organisation
  3. Permettre modification de: name, billing_email, billing_phone, address, city, province, postal_code

  ## Sécurité
  - Seul master et admin peuvent modifier
  - Admin ne peut modifier que sa propre organisation
  - Master peut modifier toutes les organisations
*/

-- Drop existing UPDATE policies if they exist
DROP POLICY IF EXISTS "Master can update all organizations" ON organizations;
DROP POLICY IF EXISTS "Users can update their own organization" ON organizations;
DROP POLICY IF EXISTS "Admin users can update organization" ON organizations;
DROP POLICY IF EXISTS "Admins can update organization" ON public.organizations;

-- Policy 1: Master peut modifier TOUTES les organisations
CREATE POLICY "Master can update all organizations"
  ON organizations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'master'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'master'
    )
  );

-- Policy 2: Admin/Franchisee_admin peuvent modifier LEUR organisation
CREATE POLICY "Admins can update their organization"
  ON organizations
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'franchisee_admin')
    )
  )
  WITH CHECK (
    id IN (
      SELECT organization_id FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'franchisee_admin')
    )
  );

-- Log de succès
DO $$
BEGIN
  RAISE NOTICE '✅ Policies UPDATE créées pour organizations';
  RAISE NOTICE '   - Master peut modifier toutes les organisations';
  RAISE NOTICE '   - Admin peut modifier sa propre organisation';
  RAISE NOTICE '   - Modification du nom et des infos de facturation autorisée';
END $$;
