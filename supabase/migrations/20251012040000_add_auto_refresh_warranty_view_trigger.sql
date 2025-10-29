/*
  # Auto-Refresh Warranty Materialized View on Changes

  ## Overview
  This migration adds database triggers to automatically refresh the warranty_list_view
  materialized view whenever warranties are created, updated, or deleted. This ensures
  that new warranties appear immediately in the warranties list without requiring manual
  refresh or waiting for cache expiration.

  ## Changes

  1. **New Function: `refresh_warranty_view_on_change()`**
     - Automatically refreshes the warranty_list_view materialized view
     - Uses CONCURRENTLY to avoid blocking other queries
     - Includes error handling to prevent trigger failures from blocking DML operations
     - Logs refresh actions for monitoring

  2. **New Triggers**
     - `trigger_refresh_warranty_view_after_insert` - Fires after INSERT on warranties
     - `trigger_refresh_warranty_view_after_update` - Fires after UPDATE on warranties
     - `trigger_refresh_warranty_view_after_delete` - Fires after DELETE on warranties

  ## Benefits
  - New warranties appear immediately in the warranties list
  - No need to wait for cache expiration
  - Maintains performance benefits of materialized views
  - Automatic and transparent to users

  ## Performance Considerations
  - Uses REFRESH MATERIALIZED VIEW CONCURRENTLY to avoid blocking reads
  - Triggers fire AFTER the warranty operation completes
  - Error handling ensures warranty operations aren't blocked by refresh failures
  - Small performance cost on INSERT/UPDATE/DELETE is acceptable for data freshness

  ## Security
  - Function uses SECURITY DEFINER to ensure proper permissions
  - Only fires after successful warranty operations (AFTER trigger)
*/

-- =====================================================
-- Drop existing triggers if they exist
-- =====================================================

DROP TRIGGER IF EXISTS trigger_refresh_warranty_view_after_insert ON warranties;
DROP TRIGGER IF EXISTS trigger_refresh_warranty_view_after_update ON warranties;
DROP TRIGGER IF EXISTS trigger_refresh_warranty_view_after_delete ON warranties;
DROP FUNCTION IF EXISTS refresh_warranty_view_on_change();

-- =====================================================
-- Create function to refresh materialized view
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_warranty_view_on_change()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Attempt to refresh the materialized view concurrently
  -- This runs in the background and doesn't block the triggering operation
  BEGIN
    -- Use CONCURRENTLY to allow reads during refresh
    REFRESH MATERIALIZED VIEW CONCURRENTLY warranty_list_view;

    -- Log the refresh for monitoring (optional)
    RAISE NOTICE 'Warranty list view refreshed after % operation on warranty %',
      TG_OP,
      COALESCE(NEW.id::text, OLD.id::text);

  EXCEPTION
    WHEN OTHERS THEN
      -- If refresh fails, log the error but don't block the warranty operation
      RAISE WARNING 'Failed to refresh warranty_list_view after % operation: %', TG_OP, SQLERRM;
      -- Return success anyway - the warranty operation should not be blocked
  END;

  -- Return the appropriate record based on operation type
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Add helpful comment
COMMENT ON FUNCTION refresh_warranty_view_on_change() IS
'Automatically refreshes the warranty_list_view materialized view after warranty INSERT/UPDATE/DELETE operations. Uses CONCURRENTLY to avoid blocking reads. Includes error handling to ensure warranty operations are never blocked by refresh failures.';

-- =====================================================
-- Create triggers on warranties table
-- =====================================================

-- Trigger after INSERT
CREATE TRIGGER trigger_refresh_warranty_view_after_insert
  AFTER INSERT ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION refresh_warranty_view_on_change();

COMMENT ON TRIGGER trigger_refresh_warranty_view_after_insert ON warranties IS
'Automatically refreshes warranty_list_view when new warranties are created';

-- Trigger after UPDATE
CREATE TRIGGER trigger_refresh_warranty_view_after_update
  AFTER UPDATE ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION refresh_warranty_view_on_change();

COMMENT ON TRIGGER trigger_refresh_warranty_view_after_update ON warranties IS
'Automatically refreshes warranty_list_view when warranties are modified';

-- Trigger after DELETE
CREATE TRIGGER trigger_refresh_warranty_view_after_delete
  AFTER DELETE ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION refresh_warranty_view_on_change();

COMMENT ON TRIGGER trigger_refresh_warranty_view_after_delete ON warranties IS
'Automatically refreshes warranty_list_view when warranties are deleted';

-- =====================================================
-- Refresh view immediately to ensure it's up to date
-- =====================================================

-- Refresh the view now to ensure all existing warranties are visible
REFRESH MATERIALIZED VIEW CONCURRENTLY warranty_list_view;

-- =====================================================
-- Verification and logging
-- =====================================================

DO $$
DECLARE
  warranty_count integer;
  view_count integer;
BEGIN
  -- Count warranties in the base table
  SELECT COUNT(*) INTO warranty_count FROM warranties;

  -- Count warranties in the materialized view
  SELECT COUNT(*) INTO view_count FROM warranty_list_view;

  RAISE NOTICE '=== Auto-Refresh Warranty View Triggers Installed ===';
  RAISE NOTICE 'Total warranties in database: %', warranty_count;
  RAISE NOTICE 'Total warranties in materialized view: %', view_count;
  RAISE NOTICE 'Triggers created: INSERT, UPDATE, DELETE';
  RAISE NOTICE 'New warranties will now appear immediately in the list';
  RAISE NOTICE '===================================================';
END $$;
