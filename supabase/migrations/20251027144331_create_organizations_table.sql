/*
  # Create Organizations Table - Part 1

  ## Summary
  Creates the foundational organizations table for multi-tenant system.
  This table stores both Phil's owner organization and all franchisee organizations.

  ## Tables Created
  - organizations: Master table for all organizations

  ## Security
  - RLS enabled with basic policies
  - Will be enhanced after profiles table is updated
*/

-- =====================================================
-- 1. Create organizations table
-- =====================================================
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('owner', 'franchisee')),
  owner_organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  billing_email text NOT NULL DEFAULT '',
  billing_phone text DEFAULT '',
  address text DEFAULT '',
  city text DEFAULT '',
  province text DEFAULT 'QC',
  postal_code text DEFAULT '',
  logo_url text DEFAULT '',
  primary_color text DEFAULT '#1e293b',
  secondary_color text DEFAULT '#64748b',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Temporary policy - will be updated after profiles has organization_id
CREATE POLICY "Authenticated users can view organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage organizations"
  ON organizations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );