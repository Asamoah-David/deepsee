-- 011_org_service_insert.sql
-- Allow service role to insert organizations
--
-- The organizations table needs a service role insert policy to allow
-- organization creation when no memberships exist yet.

-- Allow service role to insert organizations
CREATE POLICY "organizations_service_insert" ON organizations
FOR INSERT
TO service_role
WITH CHECK (true);
