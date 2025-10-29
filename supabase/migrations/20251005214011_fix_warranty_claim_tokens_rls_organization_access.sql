/*
  # Fix RLS Access for warranty_claim_tokens with Organization Context

  ## Problem
  The `warranty_claim_tokens` table is missing an RLS policy that allows authenticated users
  to view claim tokens for warranties belonging to their organization. Currently:
  - Only admin and f_and_i roles can view ALL tokens (via get_user_role())
  - Anonymous users can view unused tokens
  - Regular users CANNOT view tokens even for their own organization's warranties

  This causes queries with relations like `warranties.select('*, warranty_claim_tokens(*)')`
  to fail because Supabase applies RLS on the related table.

  ## Solution
  Add a new RLS policy that allows authenticated users to SELECT warranty_claim_tokens
  when the associated warranty belongs to their organization.

  ## Security
  - Uses the existing `get_user_organization_id()` helper function to avoid RLS recursion
  - Only allows access to tokens for warranties in the same organization
  - Maintains existing admin/f_and_i and anonymous access policies
  - Does not grant INSERT, UPDATE, or DELETE permissions

  ## Changes
  1. Create new SELECT policy for organization-based access
  2. Policy checks that warranty.organization_id matches user's organization
*/

-- Create policy allowing users to view claim tokens for their organization's warranties
CREATE POLICY "Users can view claim tokens for organization warranties"
  ON warranty_claim_tokens FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM warranties
      WHERE warranties.id = warranty_claim_tokens.warranty_id
      AND warranties.organization_id = get_user_organization_id()
    )
  );
