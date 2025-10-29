/*
  # Fix Duplicate RLS Policies and Initialize Missing Settings
  
  ## Summary
  This migration fixes duplicate RLS policies on settings tables and initializes
  missing settings for the franchisee organization.
  
  ## Problems Fixed
  1. **Duplicate RLS Policies**: Multiple policies doing the same thing cause conflicts
     - Removes redundant INSERT/UPDATE policies (kept by ALL policy)
     - Removes duplicate SELECT policies
     - Keeps only ONE policy per operation type
  
  2. **Missing Settings**: Franchisee organization has no settings initialized
     - Initializes all settings tables for franchisee organization
  
  ## Changes Made
  
  ### 1. Clean up company_settings policies
  - Keep: "Users can view their org company settings" (SELECT)
  - Keep: "Admins can manage own org company settings" (ALL for admins)
  - Remove: Duplicate policies
  
  ### 2. Clean up tax_settings policies
  - Keep: "Users can view their org tax settings" (SELECT)
  - Keep: "Admins can manage own org tax settings" (ALL for admins)
  - Remove: Duplicate policies
  
  ### 3. Clean up notification_settings policies
  - Keep: "Users can view their org notification settings" (SELECT)
  - Keep: "Admins can manage own org notification settings" (ALL for admins)
  - Remove: Duplicate policies
  
  ### 4. Clean up pricing_settings policies
  - Same pattern as above
  
  ### 5. Clean up claim_settings policies
  - Same pattern as above
  
  ### 6. Initialize settings for franchisee organization
  - Create default settings for "alex the goat" organization
*/

-- =====================================================
-- 1. Clean up company_settings RLS policies
-- =====================================================

-- Drop duplicate and conflicting policies
DROP POLICY IF EXISTS "Users can view own org company settings" ON company_settings;
DROP POLICY IF EXISTS "Users can insert their org company settings" ON company_settings;
DROP POLICY IF EXISTS "Users can update their org company settings" ON company_settings;

-- Keep only these two policies:
-- 1. "Users can view their org company settings" - for SELECT
-- 2. "Admins can manage own org company settings" - for ALL (INSERT/UPDATE/DELETE)

-- =====================================================
-- 2. Clean up tax_settings RLS policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view own org tax settings" ON tax_settings;
DROP POLICY IF EXISTS "Users can insert their org tax settings" ON tax_settings;
DROP POLICY IF EXISTS "Users can update their org tax settings" ON tax_settings;

-- =====================================================
-- 3. Clean up notification_settings RLS policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view own org notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Users can insert their org notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Users can update their org notification settings" ON notification_settings;

-- =====================================================
-- 4. Clean up pricing_settings RLS policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view own org pricing settings" ON pricing_settings;
DROP POLICY IF EXISTS "Users can insert their org pricing settings" ON pricing_settings;
DROP POLICY IF EXISTS "Users can update their org pricing settings" ON pricing_settings;

-- Keep only:
-- 1. "Users can view their org pricing settings" - for SELECT
-- 2. "Admins can manage own org pricing settings" - for ALL

-- Create the view policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'pricing_settings' 
    AND policyname = 'Users can view their org pricing settings'
  ) THEN
    CREATE POLICY "Users can view their org pricing settings"
      ON pricing_settings FOR SELECT
      TO authenticated
      USING (organization_id = get_user_organization_id() OR is_owner());
  END IF;
END $$;

-- Create the manage policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'pricing_settings' 
    AND policyname = 'Admins can manage own org pricing settings'
  ) THEN
    CREATE POLICY "Admins can manage own org pricing settings"
      ON pricing_settings FOR ALL
      TO authenticated
      USING ((organization_id = get_user_organization_id() AND get_user_role() = 'admin') OR is_owner())
      WITH CHECK ((organization_id = get_user_organization_id() AND get_user_role() = 'admin') OR is_owner());
  END IF;
END $$;

-- =====================================================
-- 5. Clean up claim_settings RLS policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view own org claim settings" ON claim_settings;
DROP POLICY IF EXISTS "Users can insert their org claim settings" ON claim_settings;
DROP POLICY IF EXISTS "Users can update their org claim settings" ON claim_settings;

-- Create policies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'claim_settings' 
    AND policyname = 'Users can view their org claim settings'
  ) THEN
    CREATE POLICY "Users can view their org claim settings"
      ON claim_settings FOR SELECT
      TO authenticated
      USING (organization_id = get_user_organization_id() OR is_owner());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'claim_settings' 
    AND policyname = 'Admins can manage own org claim settings'
  ) THEN
    CREATE POLICY "Admins can manage own org claim settings"
      ON claim_settings FOR ALL
      TO authenticated
      USING ((organization_id = get_user_organization_id() AND get_user_role() = 'admin') OR is_owner())
      WITH CHECK ((organization_id = get_user_organization_id() AND get_user_role() = 'admin') OR is_owner());
  END IF;
END $$;

-- =====================================================
-- 6. Initialize settings for franchisee organization
-- =====================================================

-- Get the franchisee organization ID
DO $$
DECLARE
  franchisee_org_id uuid;
  franchisee_org_name text;
  franchisee_email text;
BEGIN
  -- Find franchisee organization
  SELECT id, name INTO franchisee_org_id, franchisee_org_name
  FROM organizations
  WHERE type = 'franchisee'
  AND id = '4286fe95-1cbe-4942-a4ba-4e7d569ad2fe'
  LIMIT 1;

  -- Get franchisee admin email
  SELECT email INTO franchisee_email
  FROM profiles
  WHERE organization_id = franchisee_org_id
  LIMIT 1;

  IF franchisee_org_id IS NOT NULL THEN
    -- Initialize company_settings
    INSERT INTO company_settings (
      organization_id,
      company_name,
      email,
      phone,
      address,
      city,
      province,
      postal_code,
      primary_color,
      secondary_color
    ) VALUES (
      franchisee_org_id,
      COALESCE(franchisee_org_name, 'Ma Compagnie'),
      COALESCE(franchisee_email, 'contact@example.com'),
      '',
      '',
      '',
      'QC',
      '',
      '#0f172a',
      '#3b82f6'
    ) ON CONFLICT (organization_id) DO NOTHING;

    -- Initialize tax_settings
    INSERT INTO tax_settings (
      organization_id,
      gst_rate,
      qst_rate,
      pst_rate,
      hst_rate,
      apply_gst,
      apply_qst,
      apply_pst,
      apply_hst
    ) VALUES (
      franchisee_org_id,
      5.0,
      9.975,
      0,
      0,
      true,
      true,
      false,
      false
    ) ON CONFLICT (organization_id) DO NOTHING;

    -- Initialize pricing_settings
    INSERT INTO pricing_settings (
      organization_id,
      default_margin_percentage,
      minimum_warranty_price,
      maximum_warranty_price,
      price_rounding_method,
      price_rounding_to
    ) VALUES (
      franchisee_org_id,
      20.0,
      50.0,
      10000.0,
      'nearest',
      0.99
    ) ON CONFLICT (organization_id) DO NOTHING;

    -- Initialize notification_settings
    INSERT INTO notification_settings (
      organization_id,
      email_notifications,
      sms_notifications,
      notify_new_warranty,
      notify_warranty_expiring,
      notify_claim_submitted,
      notify_claim_approved,
      notify_claim_rejected,
      expiring_warranty_days,
      notification_email
    ) VALUES (
      franchisee_org_id,
      true,
      false,
      true,
      true,
      true,
      true,
      true,
      30,
      COALESCE(franchisee_email, 'notifications@example.com')
    ) ON CONFLICT (organization_id) DO NOTHING;

    -- Initialize claim_settings
    INSERT INTO claim_settings (
      organization_id,
      sla_hours,
      auto_approval_threshold,
      require_supervisor_approval_above,
      auto_approve_under_amount,
      require_manager_approval,
      manager_approval_threshold,
      allow_partial_approvals,
      max_claim_processing_days,
      require_photo_evidence,
      email_customer_on_status_change
    ) VALUES (
      franchisee_org_id,
      48,
      500,
      2000,
      100,
      true,
      500,
      true,
      14,
      true,
      true
    ) ON CONFLICT (organization_id) DO NOTHING;

    RAISE NOTICE 'Settings initialized for franchisee organization: %', franchisee_org_name;
  END IF;
END $$;
