-- Phase 3 governance: explicit device scopes, organization MFA policy,
-- recoverable TOTP enrollment and auditable device revocation.
ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS device_scope_limited BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS require_mfa BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.has_org_device_access(p_org_id UUID, p_device_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships m
    JOIN public.devices d ON d.org_id = m.org_id AND d.id = p_device_id
    WHERE m.user_id = auth.uid()
      AND m.org_id = p_org_id
      AND d.org_id = p_org_id
      AND (
        NOT m.device_scope_limited OR (
          (m.department IS NULL OR d.department = m.department)
          AND (cardinality(m.device_group_scope) = 0 OR d.group_ids && m.device_group_scope)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.has_org_incident_access(p_org_id UUID, p_device_ids UUID[])
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
  SELECT CASE
    WHEN cardinality(coalesce(p_device_ids, '{}'::UUID[])) = 0
      THEN public.has_org_role(p_org_id, ARRAY['owner', 'super_admin', 'admin', 'it_manager'])
    ELSE public.has_org_membership(p_org_id)
      AND NOT EXISTS (
        SELECT 1 FROM unnest(p_device_ids) AS scoped(device_id)
        WHERE NOT public.has_org_device_access(p_org_id, scoped.device_id)
      )
  END;
$$;
REVOKE ALL ON FUNCTION public.has_org_device_access(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_org_incident_access(UUID, UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_org_device_access(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_org_incident_access(UUID, UUID[]) TO authenticated, service_role;

-- Device rows and every device-linked history surface honor membership scopes.
DROP POLICY IF EXISTS tenant_read ON public.devices;
CREATE POLICY scoped_device_read ON public.devices
  FOR SELECT TO authenticated USING (public.has_org_device_access(org_id, id));
DROP POLICY IF EXISTS device_update_operator ON public.devices;
CREATE POLICY device_update_operator ON public.devices
  FOR UPDATE TO authenticated
  USING (public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin', 'technician'])
    AND public.has_org_device_access(org_id, id))
  WITH CHECK (public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin', 'technician'])
    AND public.has_org_device_access(org_id, id));

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'device_metrics', 'device_processes', 'device_services', 'device_software',
    'device_tags', 'activity_events', 'remote_sessions', 'commands', 'workflow_runs'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_read ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS operator_read ON public.%I', tbl);
    EXECUTE format(
      'CREATE POLICY scoped_device_read ON public.%I FOR SELECT TO authenticated USING (public.has_org_device_access(org_id, device_id))',
      tbl
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS audit_read_admin ON public.audit_logs;
CREATE POLICY audit_read_admin ON public.audit_logs FOR SELECT TO authenticated
  USING (
    public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin', 'auditor'])
    AND (device_id IS NULL OR public.has_org_device_access(org_id, device_id))
  );

DROP POLICY IF EXISTS tenant_read ON public.alerts;
CREATE POLICY scoped_alert_read ON public.alerts FOR SELECT TO authenticated
  USING (
    (device_id IS NOT NULL AND public.has_org_device_access(org_id, device_id))
    OR (device_id IS NULL AND public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin', 'it_manager']))
  );

DROP POLICY IF EXISTS tenant_read ON public.tickets;
CREATE POLICY scoped_ticket_read ON public.tickets FOR SELECT TO authenticated
  USING (
    (device_id IS NOT NULL AND public.has_org_device_access(org_id, device_id))
    OR (device_id IS NULL AND public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin', 'it_manager', 'help_desk']))
  );
DROP POLICY IF EXISTS ticket_create_member ON public.tickets;
CREATE POLICY ticket_create_member ON public.tickets FOR INSERT TO authenticated
  WITH CHECK (
    public.has_org_membership(org_id)
    AND (device_id IS NULL OR public.has_org_device_access(org_id, device_id))
  );
DROP POLICY IF EXISTS ticket_update_operator ON public.tickets;
CREATE POLICY ticket_update_operator ON public.tickets FOR UPDATE TO authenticated
  USING (
    public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin', 'technician', 'help_desk'])
    AND (device_id IS NULL OR public.has_org_device_access(org_id, device_id))
  )
  WITH CHECK (
    public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin', 'technician', 'help_desk'])
    AND (device_id IS NULL OR public.has_org_device_access(org_id, device_id))
  );

DROP POLICY IF EXISTS tenant_read ON public.incidents;
CREATE POLICY scoped_incident_read ON public.incidents FOR SELECT TO authenticated
  USING (public.has_org_incident_access(org_id, device_ids));
DROP POLICY IF EXISTS incident_insert_operator ON public.incidents;
CREATE POLICY incident_insert_operator ON public.incidents FOR INSERT TO authenticated
  WITH CHECK (
    public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin', 'technician'])
    AND public.has_org_incident_access(org_id, device_ids)
  );
DROP POLICY IF EXISTS incident_update_operator ON public.incidents;
CREATE POLICY incident_update_operator ON public.incidents FOR UPDATE TO authenticated
  USING (
    public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin', 'technician'])
    AND public.has_org_incident_access(org_id, device_ids)
  )
  WITH CHECK (
    public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin', 'technician'])
    AND public.has_org_incident_access(org_id, device_ids)
  );

DROP POLICY IF EXISTS operator_read ON public.commands;
CREATE POLICY operator_read ON public.commands FOR SELECT TO authenticated
  USING (
    public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin', 'technician', 'help_desk'])
    AND public.has_org_device_access(org_id, device_id)
  );
DROP POLICY IF EXISTS command_create_operator ON public.commands;
CREATE POLICY command_create_operator ON public.commands FOR INSERT TO authenticated
  WITH CHECK (
    public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin', 'technician'])
    AND public.has_org_device_access(org_id, device_id)
  );

DROP POLICY IF EXISTS operator_read ON public.remote_sessions;
CREATE POLICY operator_read ON public.remote_sessions FOR SELECT TO authenticated
  USING (
    public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin', 'technician', 'help_desk'])
    AND public.has_org_device_access(org_id, device_id)
  );
DROP POLICY IF EXISTS tenant_read ON public.file_transfers;
CREATE POLICY scoped_transfer_read ON public.file_transfers FOR SELECT TO authenticated
  USING (
    public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin', 'technician', 'help_desk'])
    AND public.has_org_device_access(org_id, source_device_id)
    AND public.has_org_device_access(org_id, dest_device_id)
  );
DROP POLICY IF EXISTS file_transfer_create_operator ON public.file_transfers;
CREATE POLICY file_transfer_create_operator ON public.file_transfers FOR INSERT TO authenticated
  WITH CHECK (
    public.has_org_role(org_id, ARRAY['owner', 'super_admin', 'admin', 'technician'])
    AND public.has_org_device_access(org_id, source_device_id)
    AND public.has_org_device_access(org_id, dest_device_id)
  );

CREATE OR REPLACE FUNCTION public.list_current_org_member_scopes()
RETURNS TABLE (user_id UUID, department TEXT, device_group_scope UUID[], device_scope_limited BOOLEAN)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
DECLARE v_org_id UUID;
BEGIN
  SELECT m.org_id INTO v_org_id FROM public.memberships m
    WHERE m.user_id = auth.uid() ORDER BY m.created_at LIMIT 1;
  IF v_org_id IS NULL OR NOT public.has_org_role(v_org_id, ARRAY['owner', 'super_admin', 'admin']) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT m.user_id, m.department, m.device_group_scope, m.device_scope_limited
    FROM public.memberships m WHERE m.org_id = v_org_id ORDER BY m.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_current_org_member_scope(
  p_target_user_id UUID,
  p_department TEXT,
  p_device_group_scope UUID[],
  p_scope_limited BOOLEAN
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
DECLARE v_org UUID; v_actor_role TEXT; v_target_role TEXT; v_before JSONB;
BEGIN
  SELECT m.org_id, m.role INTO v_org, v_actor_role FROM public.memberships m
    WHERE m.user_id = auth.uid() ORDER BY m.created_at LIMIT 1;
  IF v_org IS NULL OR v_actor_role NOT IN ('owner', 'super_admin', 'admin') THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT m.role, jsonb_build_object('department',m.department,'device_group_scope',m.device_group_scope,'device_scope_limited',m.device_scope_limited)
    INTO v_target_role, v_before FROM public.memberships m
    WHERE m.org_id = v_org AND m.user_id = p_target_user_id FOR UPDATE;
  IF v_target_role IS NULL THEN RAISE EXCEPTION 'member not found' USING ERRCODE = 'P0002'; END IF;
  IF p_target_user_id = auth.uid() OR v_target_role IN ('owner','super_admin')
     OR (v_target_role = 'admin' AND v_actor_role NOT IN ('owner','super_admin')) THEN
    RAISE EXCEPTION 'not authorized to change this member scope' USING ERRCODE = '42501';
  END IF;
  IF p_scope_limited AND nullif(trim(coalesce(p_department,'')), '') IS NULL
     AND cardinality(coalesce(p_device_group_scope, '{}'::UUID[])) = 0 THEN
    RAISE EXCEPTION 'a restricted scope must include a department or device group' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(coalesce(p_device_group_scope, '{}'::UUID[])) requested(group_id)
    LEFT JOIN public.device_groups g ON g.id = requested.group_id AND g.org_id = v_org
    WHERE g.id IS NULL
  ) THEN RAISE EXCEPTION 'device group is outside this organization' USING ERRCODE = '42501'; END IF;
  UPDATE public.memberships SET department = nullif(trim(coalesce(p_department,'')), ''),
    device_group_scope = coalesce(p_device_group_scope, '{}'::UUID[]),
    device_scope_limited = p_scope_limited
    WHERE org_id = v_org AND user_id = p_target_user_id;
  INSERT INTO public.audit_logs(org_id,user_id,action,target_type,target_id,before_state,after_state,result)
    VALUES (v_org,auth.uid(),'membership.scope_changed','membership',p_target_user_id::TEXT,v_before,
      jsonb_build_object('department',nullif(trim(coalesce(p_department,'')),''),'device_group_scope',coalesce(p_device_group_scope,'{}'::UUID[]),'device_scope_limited',p_scope_limited),'success');
END;
$$;

CREATE OR REPLACE FUNCTION public.update_current_org_device_placement(
  p_device_id UUID,
  p_department TEXT,
  p_group_ids UUID[]
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
DECLARE v_org UUID; v_before JSONB;
BEGIN
  SELECT d.org_id, jsonb_build_object('department',d.department,'group_ids',d.group_ids)
    INTO v_org, v_before FROM public.devices d WHERE d.id=p_device_id FOR UPDATE;
  IF v_org IS NULL OR NOT public.has_org_role(v_org,ARRAY['owner','super_admin','admin'])
    OR NOT public.has_org_device_access(v_org,p_device_id) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(coalesce(p_group_ids,'{}'::UUID[])) requested(group_id)
    LEFT JOIN public.device_groups g ON g.id=requested.group_id AND g.org_id=v_org WHERE g.id IS NULL
  ) THEN RAISE EXCEPTION 'device group is outside this organization' USING ERRCODE = '42501'; END IF;
  UPDATE public.devices SET department=nullif(trim(coalesce(p_department,'')),''), group_ids=coalesce(p_group_ids,'{}'::UUID[]), updated_at=now()
    WHERE id=p_device_id;
  INSERT INTO public.audit_logs(org_id,user_id,device_id,action,target_type,target_id,before_state,after_state,result)
    VALUES(v_org,auth.uid(),p_device_id,'device.placement_changed','device',p_device_id::TEXT,v_before,
      jsonb_build_object('department',nullif(trim(coalesce(p_department,'')),''),'group_ids',coalesce(p_group_ids,'{}'::UUID[])),'success');
END;
$$;

CREATE OR REPLACE FUNCTION public.create_current_org_device_group(p_name TEXT, p_description TEXT DEFAULT NULL)
RETURNS TABLE(id UUID, name TEXT, description TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
DECLARE v_org UUID; v_group public.device_groups%ROWTYPE;
BEGIN
  SELECT m.org_id INTO v_org FROM public.memberships m
    WHERE m.user_id=auth.uid() ORDER BY m.created_at LIMIT 1;
  IF v_org IS NULL OR NOT public.has_org_role(v_org,ARRAY['owner','super_admin','admin']) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE='42501';
  END IF;
  IF p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 2 AND 80 OR length(coalesce(p_description,'')) > 240 THEN
    RAISE EXCEPTION 'invalid group details' USING ERRCODE='22023';
  END IF;
  IF EXISTS(SELECT 1 FROM public.device_groups g WHERE g.org_id=v_org AND lower(g.name)=lower(trim(p_name))) THEN
    RAISE EXCEPTION 'group name already exists' USING ERRCODE='23505';
  END IF;
  INSERT INTO public.device_groups(org_id,name,description) VALUES(v_org,trim(p_name),nullif(trim(coalesce(p_description,'')),'')) RETURNING * INTO v_group;
  INSERT INTO public.audit_logs(org_id,user_id,action,target_type,target_id,after_state,result)
    VALUES(v_org,auth.uid(),'device_group.created','device_group',v_group.id::TEXT,
      jsonb_build_object('name',v_group.name),'success');
  RETURN QUERY SELECT v_group.id,v_group.name,v_group.description,v_group.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_org_mfa_policy()
RETURNS TABLE (org_id UUID, org_name TEXT, require_mfa BOOLEAN, actor_role TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
BEGIN
  RETURN QUERY SELECT o.id,o.name,o.require_mfa,m.role
    FROM public.memberships m JOIN public.organizations o ON o.id=m.org_id
    WHERE m.user_id=auth.uid() ORDER BY m.created_at LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_current_org_mfa_policy(p_required BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
DECLARE v_org UUID; v_role TEXT; v_before BOOLEAN;
BEGIN
  SELECT m.org_id,m.role,o.require_mfa INTO v_org,v_role,v_before
    FROM public.memberships m JOIN public.organizations o ON o.id=m.org_id
    WHERE m.user_id=auth.uid() ORDER BY m.created_at LIMIT 1 FOR UPDATE OF o;
  IF v_org IS NULL OR v_role NOT IN ('owner','super_admin','admin') THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  IF auth.jwt()->>'aal' IS DISTINCT FROM 'aal2' THEN RAISE EXCEPTION 'MFA required to change organization security policy' USING ERRCODE='42501'; END IF;
  UPDATE public.organizations SET require_mfa=p_required,updated_at=now() WHERE id=v_org;
  INSERT INTO public.audit_logs(org_id,user_id,action,target_type,target_id,before_state,after_state,result)
    VALUES(v_org,auth.uid(),'organization.mfa_policy_changed','organization',v_org::TEXT,
      jsonb_build_object('require_mfa',v_before),jsonb_build_object('require_mfa',p_required),'success');
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_current_org_device(p_device_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
DECLARE v_org UUID; v_device_id TEXT; v_revoked TIMESTAMPTZ;
BEGIN
  SELECT d.org_id,d.device_id,d.revoked_at INTO v_org,v_device_id,v_revoked
    FROM public.devices d WHERE d.id=p_device_id FOR UPDATE;
  IF v_org IS NULL OR NOT public.has_org_role(v_org,ARRAY['owner','super_admin','admin'])
    OR NOT public.has_org_device_access(v_org,p_device_id) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  IF v_revoked IS NOT NULL THEN RAISE EXCEPTION 'device already revoked' USING ERRCODE='22023'; END IF;
  UPDATE public.devices SET revoked_at=now(),status='offline',updated_at=now() WHERE id=p_device_id;
  INSERT INTO public.audit_logs(org_id,user_id,device_id,action,target_type,target_id,before_state,after_state,result)
    VALUES(v_org,auth.uid(),p_device_id,'device.revoked','device',v_device_id,
      jsonb_build_object('revoked_at',NULL),jsonb_build_object('revoked_at',now()),'success');
END;
$$;

CREATE TABLE IF NOT EXISTS public.user_mfa_recovery_codes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL CHECK (code_hash ~ '^[a-f0-9]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,code_hash)
);
CREATE TABLE IF NOT EXISTS public.user_mfa_recovery_attempts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempts INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.user_mfa_recovery_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mfa_recovery_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_mfa_recovery_codes, public.user_mfa_recovery_attempts FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.replace_current_user_mfa_recovery_codes(p_code_hashes TEXT[])
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
DECLARE v_org UUID;
BEGIN
  IF auth.uid() IS NULL OR auth.jwt()->>'aal' IS DISTINCT FROM 'aal2' OR p_code_hashes IS NULL
    OR cardinality(p_code_hashes) NOT BETWEEN 8 AND 12
    OR EXISTS(SELECT 1 FROM unnest(p_code_hashes) h WHERE h !~ '^[a-f0-9]{64}$') THEN
    RAISE EXCEPTION 'not authorized or invalid recovery codes' USING ERRCODE='42501';
  END IF;
  DELETE FROM public.user_mfa_recovery_codes WHERE user_id=auth.uid();
  INSERT INTO public.user_mfa_recovery_codes(user_id,code_hash)
    SELECT auth.uid(),h FROM (SELECT DISTINCT unnest(p_code_hashes) h) codes;
  IF (SELECT count(*) FROM public.user_mfa_recovery_codes WHERE user_id=auth.uid()) <> cardinality(p_code_hashes) THEN
    RAISE EXCEPTION 'duplicate recovery codes' USING ERRCODE='22023';
  END IF;
  SELECT m.org_id INTO v_org FROM public.memberships m WHERE m.user_id=auth.uid() ORDER BY m.created_at LIMIT 1;
  IF v_org IS NOT NULL THEN
    INSERT INTO public.audit_logs(org_id,user_id,action,target_type,target_id,result)
      VALUES(v_org,auth.uid(),'mfa.recovery_codes_rotated','user',auth.uid()::TEXT,'success');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_current_user_mfa_recovery_code(p_code_hash TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
DECLARE v_attempts INTEGER; v_org UUID;
BEGIN
  IF auth.uid() IS NULL OR auth.jwt()->>'aal' IS DISTINCT FROM 'aal1'
     OR p_code_hash IS NULL OR p_code_hash !~ '^[a-f0-9]{64}$' THEN RETURN FALSE; END IF;
  INSERT INTO public.user_mfa_recovery_attempts(user_id,window_started_at,attempts)
    VALUES(auth.uid(),now(),1)
    ON CONFLICT(user_id) DO UPDATE SET
      window_started_at=CASE WHEN user_mfa_recovery_attempts.window_started_at < now()-interval '15 minutes' THEN now() ELSE user_mfa_recovery_attempts.window_started_at END,
      attempts=CASE WHEN user_mfa_recovery_attempts.window_started_at < now()-interval '15 minutes' THEN 1 ELSE user_mfa_recovery_attempts.attempts+1 END
    RETURNING attempts INTO v_attempts;
  IF v_attempts > 10 THEN RETURN FALSE; END IF;
  DELETE FROM public.user_mfa_recovery_codes WHERE user_id=auth.uid() AND code_hash=p_code_hash;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  SELECT m.org_id INTO v_org FROM public.memberships m WHERE m.user_id=auth.uid() ORDER BY m.created_at LIMIT 1;
  IF v_org IS NOT NULL THEN
    INSERT INTO public.audit_logs(org_id,user_id,action,target_type,target_id,result)
      VALUES(v_org,auth.uid(),'mfa.recovery_code_used','user',auth.uid()::TEXT,'success');
  END IF;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_current_user_mfa_recovery_codes()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$ BEGIN DELETE FROM public.user_mfa_recovery_codes WHERE user_id=auth.uid(); END; $$;

CREATE OR REPLACE FUNCTION public.clear_org_member_mfa_recovery_codes(p_target_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.memberships actor
    JOIN public.memberships target ON target.org_id=actor.org_id
    WHERE actor.user_id=auth.uid() AND actor.role IN ('owner','super_admin')
      AND target.user_id=p_target_user_id AND target.role NOT IN ('owner','super_admin')
      AND auth.jwt()->>'aal'='aal2'
  ) AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE='42501';
  END IF;
  DELETE FROM public.user_mfa_recovery_codes WHERE user_id=p_target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_current_org_audit_logs(
  p_limit INTEGER DEFAULT 50,
  p_before TIMESTAMPTZ DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT, user_id UUID, user_email TEXT, device_id UUID, action TEXT,
  target_type TEXT, target_id TEXT, result TEXT, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, auth
SET row_security = off
AS $$
DECLARE v_org UUID;
BEGIN
  SELECT m.org_id INTO v_org FROM public.memberships m
    WHERE m.user_id=auth.uid() ORDER BY m.created_at LIMIT 1;
  IF v_org IS NULL OR NOT public.has_org_role(v_org,ARRAY['owner','super_admin','admin','auditor']) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE='42501';
  END IF;
  RETURN QUERY SELECT a.id,a.user_id,u.email::TEXT,a.device_id,a.action,a.target_type,a.target_id,a.result,a.created_at
    FROM public.audit_logs a LEFT JOIN auth.users u ON u.id=a.user_id
    WHERE a.org_id=v_org
      AND (p_before IS NULL OR a.created_at < p_before)
      AND (nullif(trim(coalesce(p_search,'')),'') IS NULL OR
        concat_ws(' ',a.action,a.target_type,a.target_id,a.result,u.email) ILIKE '%'||trim(p_search)||'%')
    ORDER BY a.created_at DESC,a.id DESC LIMIT least(greatest(coalesce(p_limit,50),1),100);
END;
$$;

CREATE OR REPLACE FUNCTION public.authorize_org_member_mfa_reset(p_target_user_id UUID)
RETURNS UUID LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
DECLARE v_org UUID; v_actor_role TEXT; v_target_role TEXT;
BEGIN
  SELECT m.org_id,m.role INTO v_org,v_actor_role FROM public.memberships m
    WHERE m.user_id=auth.uid() ORDER BY m.created_at LIMIT 1;
  IF v_org IS NULL OR v_actor_role NOT IN ('owner','super_admin') OR auth.jwt()->>'aal' IS DISTINCT FROM 'aal2' THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE='42501';
  END IF;
  SELECT m.role INTO v_target_role FROM public.memberships m WHERE m.org_id=v_org AND m.user_id=p_target_user_id;
  IF v_target_role IS NULL OR v_target_role IN ('owner','super_admin') OR p_target_user_id=auth.uid() THEN
    RAISE EXCEPTION 'member cannot be reset here' USING ERRCODE='42501';
  END IF;
  RETURN v_org;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_org_member_mfa_reset(p_org_id UUID,p_target_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
BEGIN
  IF NOT public.has_org_role(p_org_id,ARRAY['owner','super_admin']) OR auth.jwt()->>'aal' IS DISTINCT FROM 'aal2'
     OR NOT EXISTS(SELECT 1 FROM public.memberships m WHERE m.org_id=p_org_id AND m.user_id=p_target_user_id AND m.role NOT IN ('owner','super_admin')) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE='42501';
  END IF;
  INSERT INTO public.audit_logs(org_id,user_id,action,target_type,target_id,result)
    VALUES(p_org_id,auth.uid(),'mfa.admin_reset','user',p_target_user_id::TEXT,'success');
END;
$$;

REVOKE ALL ON FUNCTION public.list_current_org_member_scopes() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.set_current_org_member_scope(UUID,TEXT,UUID[],BOOLEAN) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.update_current_org_device_placement(UUID,TEXT,UUID[]) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.create_current_org_device_group(TEXT,TEXT) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_current_org_mfa_policy() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.set_current_org_mfa_policy(BOOLEAN) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.revoke_current_org_device(UUID) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.replace_current_user_mfa_recovery_codes(TEXT[]) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.consume_current_user_mfa_recovery_code(TEXT) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.clear_current_user_mfa_recovery_codes() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.clear_org_member_mfa_recovery_codes(UUID) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.list_current_org_audit_logs(INTEGER,TIMESTAMPTZ,TEXT) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.authorize_org_member_mfa_reset(UUID) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.record_org_member_mfa_reset(UUID,UUID) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_current_org_member_scopes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_current_org_member_scope(UUID,TEXT,UUID[],BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_current_org_device_placement(UUID,TEXT,UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_current_org_device_group(TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_org_mfa_policy() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_current_org_mfa_policy(BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_current_org_device(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_current_user_mfa_recovery_codes(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_current_user_mfa_recovery_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_current_user_mfa_recovery_codes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_org_member_mfa_recovery_codes(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_current_org_audit_logs(INTEGER,TIMESTAMPTZ,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.authorize_org_member_mfa_reset(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_org_member_mfa_reset(UUID,UUID) TO authenticated;
NOTIFY pgrst,'reload schema';
