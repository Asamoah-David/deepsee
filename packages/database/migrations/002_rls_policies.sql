-- 002_rls_policies.sql
-- Enable RLS and setup tenant isolation policies for all tenant-scoped tables.
--
-- §86 (tenant isolation): Every tenant-owned object must have tenant ownership enforced.
-- §140 (security architecture): Never rely solely on the frontend to prevent cross-tenant access.
-- Authorization must happen server-side.
--
-- CRITICAL: This migration adds WITH CHECK clauses to prevent INSERT/UPDATE from bypassing
-- tenant isolation. A FOR ALL policy with only USING does not filter INSERT (security hole).
--
-- Service role: Since Supabase's service role overrides RLS by default, these policies
-- only apply to authenticated user sessions (auth.uid()).

DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename IN (
            'memberships', 'device_groups', 'devices',
            'enrollment_sessions', 'remote_sessions', 'device_metrics',
            'alerts', 'incidents', 'commands', 'audit_logs', 'tickets',
            'workflows', 'workflow_runs', 'device_software', 'device_processes',
            'device_services', 'activity_events', 'file_transfers',
            'notification_rules', 'device_tags', 'policies', 'api_keys', 'webhooks'
          )
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl.tablename);

        -- Drop existing policy if it exists (idempotent)
        EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation" ON %I;', tbl.tablename);

        -- Create tenant isolation policy with both USING (SELECT/DELETE) and WITH CHECK (INSERT/UPDATE)
        EXECUTE format('
            CREATE POLICY "tenant_isolation" ON %I
            FOR ALL
            USING (
                org_id IN (
                    SELECT org_id FROM memberships WHERE user_id = auth.uid()
                )
            )
            WITH CHECK (
                org_id IN (
                    SELECT org_id FROM memberships WHERE user_id = auth.uid()
                )
            );', tbl.tablename);

    END LOOP;
END $$;

-- Organizations: Users can only see organizations they belong to
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_org" ON organizations;
CREATE POLICY "tenant_isolation_org" ON organizations
FOR ALL
USING (
    id IN (
        SELECT org_id FROM memberships WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    id IN (
        SELECT org_id FROM memberships WHERE user_id = auth.uid()
    )
);

-- Memberships: Users can see their own memberships, service role handles insertion
DROP POLICY IF EXISTS "tenant_isolation" ON memberships;
CREATE POLICY "memberships_select" ON memberships
FOR SELECT
USING (
    user_id = auth.uid() OR
    org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);

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
