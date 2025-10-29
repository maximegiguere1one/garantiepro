/*
  # Add Performance Indexes for Warranties Table

  ## Summary
  This migration adds composite indexes to the warranties table to significantly
  improve query performance, especially for the warranties list page which was
  experiencing slow load times.

  ## Changes Made

  ### 1. Composite Indexes
  - Add index on (organization_id, created_at DESC) for organization-filtered queries with ordering
  - Add index on (status, created_at DESC) for status-filtered queries with ordering
  - Add index on (customer_id, created_at DESC) for customer-specific queries (client role)

  ### 2. Performance Benefits
  - Dramatically improves warranties list page load time
  - Optimizes queries that filter by organization and sort by date
  - Speeds up filtered queries (by status) with date ordering
  - Improves client-specific warranty listing

  ## Important Notes
  - These are non-blocking indexes that will be created concurrently
  - Existing queries will automatically benefit from these indexes
  - The database query planner will choose the most efficient index
*/

-- =====================================================
-- 1. Add composite index for organization + created_at
-- =====================================================
-- This index optimizes the main warranties list query which filters by
-- organization_id and orders by created_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_warranties_org_created
  ON warranties(organization_id, created_at DESC);

-- =====================================================
-- 2. Add composite index for status + created_at
-- =====================================================
-- This index optimizes filtered queries by status with date ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_warranties_status_created
  ON warranties(status, created_at DESC);

-- =====================================================
-- 3. Add composite index for customer + created_at
-- =====================================================
-- This index optimizes client role queries that filter by customer_id
-- and order by created_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_warranties_customer_created
  ON warranties(customer_id, created_at DESC);

-- =====================================================
-- 4. Analyze table to update statistics
-- =====================================================
-- This helps the query planner make better decisions
ANALYZE warranties;
