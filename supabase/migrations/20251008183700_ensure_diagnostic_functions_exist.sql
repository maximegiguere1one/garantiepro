/*
  # Ensure Diagnostic Functions Exist

  This migration ensures that all diagnostic functions are properly created
  and accessible to authenticated users.

  ## Changes
  1. Drop and recreate diagnose_warranty_system function with proper structure
  2. Add simplified version that returns proper JSONB format
  3. Grant EXECUTE permissions to authenticated users
  4. Add function to diagnose user profile and organization setup

  ## Functions Created
  - diagnose_warranty_system() - Main diagnostic function
  - diagnose_user_setup() - User-specific diagnostics
*/

-- =====================================================
-- 1. Drop existing diagnostic functions if they exist
-- =====================================================

DROP FUNCTION IF EXISTS diagnose_warranty_system();
DROP FUNCTION IF EXISTS diagnose_user_setup();

-- =====================================================
-- 2. Create diagnose_warranty_system function
-- =====================================================

CREATE OR REPLACE FUNCTION diagnose_warranty_system()
RETURNS jsonb
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
  warranty_count integer;
  view_count integer;
  user_org_id uuid;
  user_role text;
  current_user_id uuid;
  view_exists boolean;
BEGIN
  current_user_id := auth.uid();

  -- Initialize result
  result := jsonb_build_object(
    'timestamp', now(),
    'user_id', current_user_id,
    'checks', jsonb_build_array()
  );

  -- Check 1: User authentication
  IF current_user_id IS NULL THEN
    result := jsonb_set(result, '{checks}',
      result->'checks' || jsonb_build_object(
        'check', 'authentication',
        'status', 'FAILED',
        'message', 'User not authenticated'
      )
    );
    RETURN result;
  END IF;

  result := jsonb_set(result, '{checks}',
    result->'checks' || jsonb_build_object(
      'check', 'authentication',
      'status', 'OK',
      'message', 'User is authenticated'
    )
  );

  -- Check 2: User profile
  BEGIN
    SELECT p.organization_id, p.role
    INTO user_org_id, user_role
    FROM profiles p
    WHERE p.id = current_user_id;

    IF user_org_id IS NULL THEN
      result := jsonb_set(result, '{checks}',
        result->'checks' || jsonb_build_object(
          'check', 'profile',
          'status', 'FAILED',
          'message', 'User has no organization_id'
        )
      );
      RETURN result;
    END IF;

    result := jsonb_set(result, '{checks}',
      result->'checks' || jsonb_build_object(
        'check', 'profile',
        'status', 'OK',
        'message', format('User organization: %s, role: %s', user_org_id, user_role)
      )
    );
  EXCEPTION WHEN OTHERS THEN
    result := jsonb_set(result, '{checks}',
      result->'checks' || jsonb_build_object(
        'check', 'profile',
        'status', 'FAILED',
        'message', SQLERRM
      )
    );
    RETURN result;
  END;

  -- Check 3: Warranties count
  BEGIN
    SELECT COUNT(*) INTO warranty_count
    FROM warranties
    WHERE organization_id = user_org_id;

    result := jsonb_set(result, '{checks}',
      result->'checks' || jsonb_build_object(
        'check', 'warranties',
        'status', 'OK',
        'message', format('Found %s warranties for organization', warranty_count)
      )
    );
  EXCEPTION WHEN OTHERS THEN
    result := jsonb_set(result, '{checks}',
      result->'checks' || jsonb_build_object(
        'check', 'warranties',
        'status', 'FAILED',
        'message', SQLERRM
      )
    );
  END;

  -- Check 4: Materialized view
  BEGIN
    -- Check if view exists
    SELECT EXISTS (
      SELECT 1 FROM pg_matviews WHERE matviewname = 'warranty_list_view'
    ) INTO view_exists;

    IF NOT view_exists THEN
      result := jsonb_set(result, '{checks}',
        result->'checks' || jsonb_build_object(
          'check', 'materialized_view',
          'status', 'WARNING',
          'message', 'Materialized view does not exist'
        )
      );
    ELSE
      SELECT COUNT(*) INTO view_count
      FROM warranty_list_view
      WHERE organization_id = user_org_id;

      result := jsonb_set(result, '{checks}',
        result->'checks' || jsonb_build_object(
          'check', 'materialized_view',
          'status', 'OK',
          'message', format('View contains %s warranties', view_count)
        )
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    result := jsonb_set(result, '{checks}',
      result->'checks' || jsonb_build_object(
        'check', 'materialized_view',
        'status', 'FAILED',
        'message', SQLERRM
      )
    );
  END;

  -- Check 5: RPC function test
  BEGIN
    PERFORM get_warranties_optimized(1, 1, 'all', '');

    result := jsonb_set(result, '{checks}',
      result->'checks' || jsonb_build_object(
        'check', 'rpc_function',
        'status', 'OK',
        'message', 'RPC function executed successfully'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    result := jsonb_set(result, '{checks}',
      result->'checks' || jsonb_build_object(
        'check', 'rpc_function',
        'status', 'FAILED',
        'message', SQLERRM
      )
    );
  END;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION diagnose_warranty_system TO authenticated;

COMMENT ON FUNCTION diagnose_warranty_system IS
'Diagnostic function to troubleshoot warranty loading issues. Returns detailed status of all system components in JSONB format.';

-- =====================================================
-- 3. Create diagnose_user_setup function
-- =====================================================

CREATE OR REPLACE FUNCTION diagnose_user_setup()
RETURNS jsonb
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
  current_user_id uuid;
  user_profile record;
  user_org record;
  settings_counts jsonb;
BEGIN
  current_user_id := auth.uid();

  -- Initialize result
  result := jsonb_build_object(
    'timestamp', now(),
    'user_id', current_user_id,
    'profile', null,
    'organization', null,
    'settings', jsonb_build_object(),
    'status', 'OK'
  );

  IF current_user_id IS NULL THEN
    result := jsonb_set(result, '{status}', '"FAILED"'::jsonb);
    result := jsonb_set(result, '{error}', '"User not authenticated"'::jsonb);
    RETURN result;
  END IF;

  -- Get profile
  BEGIN
    SELECT id, full_name, email, role, organization_id
    INTO user_profile
    FROM profiles
    WHERE id = current_user_id;

    result := jsonb_set(result, '{profile}', to_jsonb(user_profile));

    IF user_profile.organization_id IS NULL THEN
      result := jsonb_set(result, '{status}', '"WARNING"'::jsonb);
      result := jsonb_set(result, '{error}', '"User has no organization_id"'::jsonb);
      RETURN result;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    result := jsonb_set(result, '{status}', '"FAILED"'::jsonb);
    result := jsonb_set(result, '{error}', to_jsonb(SQLERRM));
    RETURN result;
  END;

  -- Get organization
  BEGIN
    SELECT id, name, type, status
    INTO user_org
    FROM organizations
    WHERE id = user_profile.organization_id;

    result := jsonb_set(result, '{organization}', to_jsonb(user_org));
  EXCEPTION WHEN OTHERS THEN
    result := jsonb_set(result, '{status}', '"WARNING"'::jsonb);
    result := jsonb_set(result, '{organization_error}', to_jsonb(SQLERRM));
  END;

  -- Check settings tables
  BEGIN
    SELECT jsonb_build_object(
      'company_settings', (SELECT COUNT(*) FROM company_settings WHERE organization_id = user_profile.organization_id),
      'tax_settings', (SELECT COUNT(*) FROM tax_settings WHERE organization_id = user_profile.organization_id),
      'pricing_settings', (SELECT COUNT(*) FROM pricing_settings WHERE organization_id = user_profile.organization_id),
      'notification_settings', (SELECT COUNT(*) FROM notification_settings WHERE organization_id = user_profile.organization_id),
      'claim_settings', (SELECT COUNT(*) FROM claim_settings WHERE organization_id = user_profile.organization_id)
    ) INTO settings_counts;

    result := jsonb_set(result, '{settings}', settings_counts);
  EXCEPTION WHEN OTHERS THEN
    result := jsonb_set(result, '{settings_error}', to_jsonb(SQLERRM));
  END;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION diagnose_user_setup TO authenticated;

COMMENT ON FUNCTION diagnose_user_setup IS
'Diagnostic function to check user profile, organization, and settings setup. Returns comprehensive user state in JSONB format.';

-- =====================================================
-- 4. Verify functions exist
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== Diagnostic Functions Created ===';
  RAISE NOTICE 'Functions available:';
  RAISE NOTICE '  - diagnose_warranty_system()';
  RAISE NOTICE '  - diagnose_user_setup()';
  RAISE NOTICE 'All functions granted EXECUTE to authenticated users';
  RAISE NOTICE '=====================================';
END $$;
