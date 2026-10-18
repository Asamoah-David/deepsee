-- 014_disable_membership_rls.sql
-- Temporarily disable RLS on memberships to fix the circular dependency issue
-- This will be re-enabled with proper policies once the basic flow works

ALTER TABLE memberships DISABLE ROW LEVEL SECURITY;
