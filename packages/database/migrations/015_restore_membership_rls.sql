-- Restore membership row-level security without recursive policy evaluation.
-- Migration 014 disabled RLS as a temporary workaround and must not be the
-- final policy. The SECURITY DEFINER helper is owned by the migration role and
-- reads memberships with row_security disabled, avoiding self-referential RLS.
CREATE OR REPLACE FUNCTION public.has_org_membership(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships m
    WHERE m.org_id = p_org_id
      AND m.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.has_org_membership(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_org_membership(UUID) TO authenticated;

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON public.memberships;
DROP POLICY IF EXISTS "memberships_select_own" ON public.memberships;
DROP POLICY IF EXISTS "memberships_service_insert" ON public.memberships;
DROP POLICY IF EXISTS "memberships_update_own" ON public.memberships;
DROP POLICY IF EXISTS "memberships_select" ON public.memberships;
DROP POLICY IF EXISTS "memberships_insert" ON public.memberships;
DROP POLICY IF EXISTS "memberships_update" ON public.memberships;
DROP POLICY IF EXISTS "memberships_delete" ON public.memberships;

CREATE POLICY memberships_select_scoped ON public.memberships
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_org_membership(org_id));

-- Membership mutations are performed by trusted server-side flows. In
-- particular, a user cannot promote themselves by updating their own row.

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_org" ON public.organizations;
CREATE POLICY tenant_isolation_org ON public.organizations
  FOR ALL TO authenticated
  USING (public.has_org_membership(id))
  WITH CHECK (public.has_org_membership(id));

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'device_groups', 'devices', 'enrollment_sessions', 'remote_sessions',
    'device_metrics', 'alerts', 'incidents', 'commands', 'audit_logs',
    'tickets', 'workflows', 'workflow_runs', 'device_software',
    'device_processes', 'device_services', 'activity_events', 'file_transfers',
    'notification_rules', 'device_tags', 'policies', 'api_keys', 'webhooks'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I FOR ALL TO authenticated USING (public.has_org_membership(org_id)) WITH CHECK (public.has_org_membership(org_id))',
      tbl
    );
  END LOOP;
END $$;
