-- 010_fix_rls_policies.sql
-- Fix RLS policies to remove circular dependency
--
-- The memberships table had a policy that checked org_id in memberships, creating
-- a circular dependency when creating the first organization. This fixes it.

-- Drop existing membership policies
DROP POLICY IF EXISTS "memberships_select" ON memberships;
DROP POLICY IF EXISTS "memberships_service_insert" ON memberships;
DROP POLICY IF EXISTS "memberships_update_own" ON memberships;

-- Allow users to see their own memberships only (no circular dependency)
CREATE POLICY "memberships_select_own" ON memberships
FOR SELECT
USING (user_id = auth.uid());

-- Allow service role to insert memberships (for org creation)
CREATE POLICY "memberships_service_insert" ON memberships
FOR INSERT
TO service_role
WITH CHECK (true);

-- Allow users to update limited fields on their own membership
CREATE POLICY "memberships_update_own" ON memberships
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
