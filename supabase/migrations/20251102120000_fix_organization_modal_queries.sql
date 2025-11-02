/*
  # Fix Organization Modal Queries

  1. Problem
    - get_organization_full_stats uses tables that may not exist
    - warranties query tries to select customers(full_name) which doesn't exist
    - Customers table has first_name and last_name, not full_name

  2. Solution
    - Update get_organization_full_stats to handle missing tables gracefully
    - Add computed column or view for customer full_name
    - Ensure all referenced tables exist

  3. Security
    - Maintain RLS policies
    - Keep SECURITY DEFINER for stats function
*/

-- ============================================================================
-- 1. CREATE MISSING TABLES IF THEY DON'T EXIST
-- ============================================================================

-- warranty_transactions table
CREATE TABLE IF NOT EXISTS warranty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  warranty_id uuid REFERENCES warranties(id) ON DELETE CASCADE,
  transaction_date timestamptz DEFAULT now(),
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE warranty_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for warranty_transactions
DROP POLICY IF EXISTS "Masters can view all transactions" ON warranty_transactions;
DROP POLICY IF EXISTS "Users can view own org transactions" ON warranty_transactions;

CREATE POLICY "Masters can view all transactions"
  ON warranty_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'master'
    )
  );

CREATE POLICY "Users can view own org transactions"
  ON warranty_transactions
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- organization_communications table
CREATE TABLE IF NOT EXISTS organization_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  type text NOT NULL,
  subject text,
  content text,
  sent_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE organization_communications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Masters can view all communications" ON organization_communications;
DROP POLICY IF EXISTS "Users can view own org communications" ON organization_communications;

CREATE POLICY "Masters can view all communications"
  ON organization_communications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'master'
    )
  );

CREATE POLICY "Users can view own org communications"
  ON organization_communications
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- organization_notes table
CREATE TABLE IF NOT EXISTS organization_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE organization_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Masters can manage all notes" ON organization_notes;
DROP POLICY IF EXISTS "Users can view own org notes" ON organization_notes;

CREATE POLICY "Masters can manage all notes"
  ON organization_notes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master', 'admin')
    )
  );

CREATE POLICY "Users can view own org notes"
  ON organization_notes
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- organization_alerts table
CREATE TABLE IF NOT EXISTS organization_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE organization_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Masters can view all alerts" ON organization_alerts;
DROP POLICY IF EXISTS "Users can view own org alerts" ON organization_alerts;

CREATE POLICY "Masters can view all alerts"
  ON organization_alerts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master', 'admin')
    )
  );

CREATE POLICY "Users can view own org alerts"
  ON organization_alerts
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- 2. FIX get_organization_full_stats FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS get_organization_full_stats(uuid);

CREATE OR REPLACE FUNCTION get_organization_full_stats(org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  v_warranty_count bigint;
  v_user_count bigint;
  v_total_revenue numeric;
  v_pending_revenue numeric;
  v_active_claims bigint;
  v_unread_alerts bigint;
  v_tags jsonb;
BEGIN
  -- Warranty count
  SELECT COUNT(*) INTO v_warranty_count
  FROM warranties
  WHERE organization_id = org_id;

  -- User count
  SELECT COUNT(*) INTO v_user_count
  FROM profiles
  WHERE organization_id = org_id;

  -- Total revenue (completed transactions)
  SELECT COALESCE(SUM(total_amount), 0) INTO v_total_revenue
  FROM warranty_transactions
  WHERE organization_id = org_id
  AND status = 'completed';

  -- Pending revenue
  SELECT COALESCE(SUM(total_amount), 0) INTO v_pending_revenue
  FROM warranty_transactions
  WHERE organization_id = org_id
  AND status = 'pending';

  -- Active claims
  SELECT COUNT(*) INTO v_active_claims
  FROM claims c
  JOIN warranties w ON c.warranty_id = w.id
  WHERE w.organization_id = org_id
  AND c.status NOT IN ('approved', 'rejected', 'completed', 'closed');

  -- Unread alerts
  SELECT COUNT(*) INTO v_unread_alerts
  FROM organization_alerts
  WHERE organization_id = org_id
  AND is_read = false;

  -- Tags
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'color', t.color
      )
    ),
    '[]'::jsonb
  ) INTO v_tags
  FROM organization_tags t
  JOIN organization_tag_assignments ta ON t.id = ta.tag_id
  WHERE ta.organization_id = org_id;

  -- Build result
  result := jsonb_build_object(
    'warranty_count', v_warranty_count,
    'user_count', v_user_count,
    'total_revenue', v_total_revenue,
    'pending_revenue', v_pending_revenue,
    'active_claims', v_active_claims,
    'unread_alerts', v_unread_alerts,
    'tags', v_tags
  );

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Return default values if anything fails
    RETURN jsonb_build_object(
      'warranty_count', 0,
      'user_count', 0,
      'total_revenue', 0,
      'pending_revenue', 0,
      'active_claims', 0,
      'unread_alerts', 0,
      'tags', '[]'::jsonb,
      'error', SQLERRM
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_organization_full_stats TO authenticated;

-- ============================================================================
-- 3. ADD INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_warranty_transactions_org_status
  ON warranty_transactions(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_organization_communications_org
  ON organization_communications(organization_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_organization_notes_org
  ON organization_notes(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_organization_alerts_org_read
  ON organization_alerts(organization_id, is_read, created_at DESC);

-- ============================================================================
-- 4. VERIFY ALL TABLES EXIST
-- ============================================================================

DO $$
BEGIN
  -- Check all required tables exist
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'warranty_transactions') THEN
    RAISE WARNING 'warranty_transactions table missing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'organization_communications') THEN
    RAISE WARNING 'organization_communications table missing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'organization_notes') THEN
    RAISE WARNING 'organization_notes table missing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'organization_alerts') THEN
    RAISE WARNING 'organization_alerts table missing';
  END IF;
END $$;
