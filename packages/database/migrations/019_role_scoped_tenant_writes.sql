-- Tenant membership is not an authorization to mutate every tenant object.
CREATE OR REPLACE FUNCTION public.has_org_role(p_org_id UUID, p_roles TEXT[])
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
      AND m.role = ANY(p_roles)
  );
$$;

REVOKE ALL ON FUNCTION public.has_org_role(UUID, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_org_role(UUID, TEXT[]) TO authenticated;

-- Replace blanket FOR ALL tenant policies with read membership and explicit
-- mutation grants. Service-role agent and server operations bypass RLS.
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
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_read ON public.%I', tbl);
    EXECUTE format('CREATE POLICY tenant_read ON public.%I FOR SELECT TO authenticated USING (public.has_org_membership(org_id))', tbl);
  END LOOP;
END $$;

DROP POLICY IF EXISTS tenant_isolation_org ON public.organizations;
DROP POLICY IF EXISTS organizations_service_insert ON public.organizations;
DROP POLICY IF EXISTS organizations_read ON public.organizations;
DROP POLICY IF EXISTS organizations_update_admin ON public.organizations;
DROP POLICY IF EXISTS organizations_delete_owner ON public.organizations;
CREATE POLICY organizations_read ON public.organizations
  FOR SELECT TO authenticated USING (public.has_org_membership(id));
CREATE POLICY organizations_update_admin ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.has_org_role(id, ARRAY['owner', 'super_admin', 'admin']))
  WITH CHECK (public.has_org_role(id, ARRAY['owner', 'super_admin', 'admin']));
CREATE POLICY organizations_delete_owner ON public.organizations
  FOR DELETE TO authenticated
  USING (public.has_org_role(id, ARRAY['owner']));

-- Device enrollment and revocation happen only through trusted server flows.
CREATE POLICY enrollment_create_admin ON public.enrollment_sessions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin']));

-- Device grouping and policy configuration are administrative operations.
CREATE POLICY groups_insert_admin ON public.device_groups
  FOR INSERT TO authenticated WITH CHECK (public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin']));
CREATE POLICY groups_update_admin ON public.device_groups
  FOR UPDATE TO authenticated
  USING (public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin']))
  WITH CHECK (public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin']));
CREATE POLICY groups_delete_admin ON public.device_groups
  FOR DELETE TO authenticated USING (public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin']));

CREATE POLICY device_update_operator ON public.devices
  FOR UPDATE TO authenticated
  USING (public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin', 'technician']))
  WITH CHECK (public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin', 'technician']));
CREATE POLICY device_delete_admin ON public.devices
  FOR DELETE TO authenticated USING (public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin']));

CREATE POLICY incident_insert_operator ON public.incidents
  FOR INSERT TO authenticated WITH CHECK (public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin', 'technician']));
CREATE POLICY incident_update_operator ON public.incidents
  FOR UPDATE TO authenticated
  USING (public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin', 'technician']))
  WITH CHECK (public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin', 'technician']));

CREATE POLICY command_create_operator ON public.commands
  FOR INSERT TO authenticated WITH CHECK (public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin', 'technician']));
CREATE POLICY ticket_create_member ON public.tickets
  FOR INSERT TO authenticated WITH CHECK (public.has_org_membership(org_id));
CREATE POLICY ticket_update_operator ON public.tickets
  FOR UPDATE TO authenticated
  USING (public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin', 'technician']))
  WITH CHECK (public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin', 'technician']));

CREATE POLICY workflow_create_admin ON public.workflows
  FOR INSERT TO authenticated WITH CHECK (public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin']));
CREATE POLICY workflow_update_admin ON public.workflows
  FOR UPDATE TO authenticated
  USING (public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin']))
  WITH CHECK (public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin']));
CREATE POLICY workflow_delete_admin ON public.workflows
  FOR DELETE TO authenticated USING (public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin']));
CREATE POLICY workflow_run_create_operator ON public.workflow_runs
  FOR INSERT TO authenticated WITH CHECK (public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin', 'technician']));
CREATE POLICY file_transfer_create_operator ON public.file_transfers
  FOR INSERT TO authenticated WITH CHECK (public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin', 'technician']));

CREATE POLICY tag_insert_operator ON public.device_tags
  FOR INSERT TO authenticated WITH CHECK (public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin', 'technician']));
CREATE POLICY tag_update_operator ON public.device_tags
  FOR UPDATE TO authenticated
  USING (public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin', 'technician']))
  WITH CHECK (public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin', 'technician']));
CREATE POLICY tag_delete_operator ON public.device_tags
  FOR DELETE TO authenticated USING (public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin', 'technician']));

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['policies', 'notification_rules', 'api_keys', 'webhooks'] LOOP
    EXECUTE format('CREATE POLICY admin_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_org_role(org_id, ARRAY[''owner'', ''super_admin'', ''admin'']))', tbl);
    EXECUTE format('CREATE POLICY admin_update ON public.%I FOR UPDATE TO authenticated USING (public.has_org_role(org_id, ARRAY[''owner'', ''super_admin'', ''admin''])) WITH CHECK (public.has_org_role(org_id, ARRAY[''owner'', ''super_admin'', ''admin'']))', tbl);
    EXECUTE format('CREATE POLICY admin_delete ON public.%I FOR DELETE TO authenticated USING (public.has_org_role(org_id, ARRAY[''owner'', ''super_admin'', ''admin'']))', tbl);
  END LOOP;
END $$;

-- Audit history is immutable to customer-facing API roles and visible only to
-- administrators and auditors. Agent/service writers use service_role.
DROP POLICY IF EXISTS tenant_read ON public.audit_logs;
CREATE POLICY audit_read_admin ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin', 'auditor']));

-- Enrollment codes and administrative configuration are not visible to every
-- tenant member. Operational records are limited to staff roles.
DROP POLICY IF EXISTS tenant_read ON public.enrollment_sessions;
CREATE POLICY enrollment_read_admin ON public.enrollment_sessions
  FOR SELECT TO authenticated
  USING (public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin']));

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['policies', 'notification_rules', 'api_keys', 'webhooks'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_read ON public.%I', tbl);
    EXECUTE format('CREATE POLICY admin_read ON public.%I FOR SELECT TO authenticated USING (public.has_org_role(org_id, ARRAY[''owner'', ''super_admin'', ''admin'']))', tbl);
  END LOOP;
  FOREACH tbl IN ARRAY ARRAY['commands', 'remote_sessions', 'file_transfers'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_read ON public.%I', tbl);
    EXECUTE format('CREATE POLICY operator_read ON public.%I FOR SELECT TO authenticated USING (public.has_org_role(org_id, ARRAY[''owner'', ''super_admin'', ''admin'', ''technician'', ''help_desk'']))', tbl);
  END LOOP;
END $$;

-- Operational telemetry is written only by trusted ingestion services.
-- Memberships are likewise changed only by trusted server-side flows.
