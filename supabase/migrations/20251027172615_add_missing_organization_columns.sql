/*
  # Add Missing organization_id and user_id Columns

  ## Problem
  The application is failing to load dashboard data because several critical columns
  are missing from the database schema:
  - warranties.organization_id
  - claims.organization_id
  - notifications.organization_id
  - notifications.user_id

  ## Solution
  Add these columns to enable multi-tenant functionality and proper data isolation.

  ## Changes
  1. Add organization_id to warranties table
  2. Add organization_id to claims table
  3. Add organization_id and user_id to notifications table
  4. Create indexes for performance
  5. Update RLS policies to use these columns
  6. Populate existing data with default organization

  ## Security
  - RLS policies updated to enforce organization isolation
  - Existing data migrated to default organization
*/

-- =====================================================
-- STEP 1: Add organization_id to warranties table
-- =====================================================

-- Add the column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'warranties'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.warranties
    ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;

    RAISE NOTICE 'Added organization_id column to warranties table';
  ELSE
    RAISE NOTICE 'organization_id column already exists in warranties table';
  END IF;
END $$;

-- Populate with default organization for existing records
UPDATE public.warranties
SET organization_id = (
  SELECT id FROM public.organizations
  WHERE type = 'owner'
  ORDER BY created_at ASC
  LIMIT 1
)
WHERE organization_id IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_warranties_organization_id
ON public.warranties(organization_id);

-- =====================================================
-- STEP 2: Add organization_id to claims table
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'claims'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.claims
    ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;

    RAISE NOTICE 'Added organization_id column to claims table';
  ELSE
    RAISE NOTICE 'organization_id column already exists in claims table';
  END IF;
END $$;

-- Populate with organization from related warranty
UPDATE public.claims c
SET organization_id = w.organization_id
FROM public.warranties w
WHERE c.warranty_id = w.id
AND c.organization_id IS NULL;

-- For claims without a warranty, use default organization
UPDATE public.claims
SET organization_id = (
  SELECT id FROM public.organizations
  WHERE type = 'owner'
  ORDER BY created_at ASC
  LIMIT 1
)
WHERE organization_id IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_claims_organization_id
ON public.claims(organization_id);

-- =====================================================
-- STEP 3: Add organization_id and user_id to notifications table
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.notifications
    ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;

    RAISE NOTICE 'Added organization_id column to notifications table';
  ELSE
    RAISE NOTICE 'organization_id column already exists in notifications table';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.notifications
    ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

    RAISE NOTICE 'Added user_id column to notifications table';
  ELSE
    RAISE NOTICE 'user_id column already exists in notifications table';
  END IF;
END $$;

-- Populate user_id from recipient_id (they should be the same)
UPDATE public.notifications
SET user_id = recipient_id
WHERE user_id IS NULL AND recipient_id IS NOT NULL;

-- Populate organization_id from user's profile
UPDATE public.notifications n
SET organization_id = p.organization_id
FROM public.profiles p
WHERE n.user_id = p.id
AND n.organization_id IS NULL;

-- For notifications without a user, use default organization
UPDATE public.notifications
SET organization_id = (
  SELECT id FROM public.organizations
  WHERE type = 'owner'
  ORDER BY created_at ASC
  LIMIT 1
)
WHERE organization_id IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_organization_id
ON public.notifications(organization_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id
ON public.notifications(user_id);

-- =====================================================
-- STEP 4: Update RLS Policies for warranties
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view warranties in their organization" ON public.warranties;
DROP POLICY IF EXISTS "Users can create warranties" ON public.warranties;
DROP POLICY IF EXISTS "Users can update warranties in their organization" ON public.warranties;

-- Policy: Users can view warranties in their organization
CREATE POLICY "Users can view warranties in their organization"
  ON public.warranties FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
    OR
    -- Master accounts can see all
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'super_admin')
    )
  );

-- Policy: Users can create warranties
CREATE POLICY "Users can create warranties"
  ON public.warranties FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can update warranties in their organization
CREATE POLICY "Users can update warranties in their organization"
  ON public.warranties FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'super_admin')
    )
  );

-- =====================================================
-- STEP 5: Update RLS Policies for claims
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view claims in their organization" ON public.claims;
DROP POLICY IF EXISTS "Users can create claims" ON public.claims;
DROP POLICY IF EXISTS "Users can update claims in their organization" ON public.claims;

-- Policy: Users can view claims in their organization
CREATE POLICY "Users can view claims in their organization"
  ON public.claims FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
    OR
    -- Master accounts can see all
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'super_admin')
    )
  );

-- Policy: Users can create claims
CREATE POLICY "Users can create claims"
  ON public.claims FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can update claims in their organization
CREATE POLICY "Users can update claims in their organization"
  ON public.claims FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'super_admin')
    )
  );

-- =====================================================
-- STEP 6: Update RLS Policies for notifications
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;

-- Policy: Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    -- Admins can see notifications in their organization
    (
      organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin', 'master')
      )
    )
  );

-- Policy: System can create notifications
CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Users can update their own notifications
CREATE POLICY "Users can update their notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- STEP 7: Verification
-- =====================================================

DO $$
DECLARE
  v_warranties_org_col boolean;
  v_claims_org_col boolean;
  v_notifications_org_col boolean;
  v_notifications_user_col boolean;
  v_default_org_id uuid;
  v_warranties_count int;
  v_claims_count int;
  v_notifications_count int;
BEGIN
  -- Check if columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'warranties'
    AND column_name = 'organization_id'
  ) INTO v_warranties_org_col;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'claims'
    AND column_name = 'organization_id'
  ) INTO v_claims_org_col;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'organization_id'
  ) INTO v_notifications_org_col;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'user_id'
  ) INTO v_notifications_user_col;

  -- Get default organization
  SELECT id INTO v_default_org_id
  FROM public.organizations
  WHERE type = 'owner'
  ORDER BY created_at ASC
  LIMIT 1;

  -- Count records with organization_id
  SELECT COUNT(*) INTO v_warranties_count
  FROM public.warranties
  WHERE organization_id IS NOT NULL;

  SELECT COUNT(*) INTO v_claims_count
  FROM public.claims
  WHERE organization_id IS NOT NULL;

  SELECT COUNT(*) INTO v_notifications_count
  FROM public.notifications
  WHERE organization_id IS NOT NULL;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'MISSING COLUMNS MIGRATION COMPLETED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Column Status:';
  RAISE NOTICE '  ✓ warranties.organization_id exists: %', v_warranties_org_col;
  RAISE NOTICE '  ✓ claims.organization_id exists: %', v_claims_org_col;
  RAISE NOTICE '  ✓ notifications.organization_id exists: %', v_notifications_org_col;
  RAISE NOTICE '  ✓ notifications.user_id exists: %', v_notifications_user_col;
  RAISE NOTICE '';
  RAISE NOTICE 'Data Migration:';
  RAISE NOTICE '  ✓ Default organization: %', v_default_org_id;
  RAISE NOTICE '  ✓ Warranties with organization: %', v_warranties_count;
  RAISE NOTICE '  ✓ Claims with organization: %', v_claims_count;
  RAISE NOTICE '  ✓ Notifications with organization: %', v_notifications_count;
  RAISE NOTICE '';
  RAISE NOTICE 'RLS Policies:';
  RAISE NOTICE '  ✓ Warranties policies updated for multi-tenant';
  RAISE NOTICE '  ✓ Claims policies updated for multi-tenant';
  RAISE NOTICE '  ✓ Notifications policies updated for multi-tenant';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'APPLICATION SHOULD NOW LOAD PROPERLY';
  RAISE NOTICE '========================================';
END $$;
