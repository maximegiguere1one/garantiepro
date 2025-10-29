/*
  # Correction de l'isolation des clients et réclamations par franchisé

  1. Problème identifié
    - Les politiques RLS sur customers et warranty_claims permettent aux owners de voir tous les enregistrements
    - Les franchisés peuvent potentiellement voir les clients d'autres franchises

  2. Changements appliqués
    - Mise à jour des politiques customers pour utiliser user_can_access_organization()
    - Mise à jour des politiques warranty_claims pour une isolation stricte
    - Les franchisés ne voient QUE leurs propres données

  3. Sécurité
    - Isolation stricte par organization_id
    - Les clients voient uniquement leurs propres données
*/

-- Fix customers table RLS policies
DROP POLICY IF EXISTS "Users can view own org customers" ON customers;
DROP POLICY IF EXISTS "Staff can manage own org customers" ON customers;
DROP POLICY IF EXISTS "Clients can view own customer record" ON customers;

-- Clients can view their own customer record
CREATE POLICY "Clients view own record"
  ON customers
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Franchisees can view customers from their organization only
CREATE POLICY "Franchisees view own org customers"
  ON customers
  FOR SELECT
  TO authenticated
  USING (
    user_can_access_organization(customers.organization_id)
  );

-- Franchisees can insert customers for their organization only
CREATE POLICY "Franchisees insert own org customers"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
  );

-- Franchisees can update customers from their organization only
CREATE POLICY "Franchisees update own org customers"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (
    user_can_access_organization(customers.organization_id)
  )
  WITH CHECK (
    user_can_access_organization(customers.organization_id)
  );

-- Only admins can delete customers from their organization
CREATE POLICY "Admins delete own org customers"
  ON customers
  FOR DELETE
  TO authenticated
  USING (
    user_can_access_organization(customers.organization_id)
    AND EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'master')
    )
  );

-- Fix warranty_claims table RLS policies if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'warranty_claims') THEN
    
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view claims" ON warranty_claims;
    DROP POLICY IF EXISTS "Staff can manage claims" ON warranty_claims;
    DROP POLICY IF EXISTS "Clients can view own claims" ON warranty_claims;
    
    -- Clients can view their own claims
    CREATE POLICY "Clients view own claims"
      ON warranty_claims
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM warranties w
          INNER JOIN customers c ON w.customer_id = c.id
          WHERE w.id = warranty_claims.warranty_id
            AND c.user_id = auth.uid()
        )
      );
    
    -- Franchisees can view claims from their organization only
    CREATE POLICY "Franchisees view own org claims"
      ON warranty_claims
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM warranties w
          WHERE w.id = warranty_claims.warranty_id
            AND user_can_access_organization(w.organization_id)
        )
      );
    
    -- Franchisees can insert claims for their organization's warranties
    CREATE POLICY "Franchisees insert own org claims"
      ON warranty_claims
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM warranties w
          WHERE w.id = warranty_claims.warranty_id
            AND user_can_access_organization(w.organization_id)
        )
      );
    
    -- Franchisees can update claims from their organization only
    CREATE POLICY "Franchisees update own org claims"
      ON warranty_claims
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM warranties w
          WHERE w.id = warranty_claims.warranty_id
            AND user_can_access_organization(w.organization_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM warranties w
          WHERE w.id = warranty_claims.warranty_id
            AND user_can_access_organization(w.organization_id)
        )
      );
    
    -- Only admins can delete claims
    CREATE POLICY "Admins delete own org claims"
      ON warranty_claims
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM warranties w
          WHERE w.id = warranty_claims.warranty_id
            AND user_can_access_organization(w.organization_id)
        )
        AND EXISTS (
          SELECT 1
          FROM profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'master')
        )
      );
      
  END IF;
END $$;

-- Add comments
COMMENT ON TABLE customers IS 'Customers are strictly isolated by organization_id. Franchisees can only access customers from their own organization.';
