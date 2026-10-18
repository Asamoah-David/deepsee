-- Tenant-scoped member directory and atomic role/removal audit events.
-- Membership changes are performed by narrowly-scoped SECURITY DEFINER RPCs;
-- no client or service key can turn an arbitrary org id into authority.

CREATE OR REPLACE FUNCTION public.list_current_org_members()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  role TEXT,
  department TEXT,
  created_at TIMESTAMPTZ,
  is_self BOOLEAN,
  can_manage BOOLEAN,
  can_grant_admin BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
SET row_security = off
AS $$
DECLARE
  v_org_id UUID;
  v_actor_role TEXT;
BEGIN
  SELECT m.org_id, m.role INTO v_org_id, v_actor_role
  FROM public.memberships m
  WHERE m.user_id = auth.uid()
  ORDER BY m.created_at
  LIMIT 1;

  IF v_org_id IS NULL OR NOT public.has_org_role(v_org_id, ARRAY['owner', 'super_admin', 'admin']) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT m.user_id, u.email::TEXT, m.role, m.department, m.created_at,
    m.user_id = auth.uid(),
    m.user_id <> auth.uid()
      AND m.role <> 'owner'
      AND m.role <> 'super_admin'
      AND (m.role <> 'admin' OR v_actor_role IN ('owner', 'super_admin')),
    v_actor_role IN ('owner', 'super_admin')
  FROM public.memberships m
  JOIN auth.users u ON u.id = m.user_id
  WHERE m.org_id = v_org_id
  ORDER BY m.created_at, lower(u.email);
END;
$$;

CREATE OR REPLACE FUNCTION public.manage_current_org_member(
  p_target_user_id UUID,
  p_new_role TEXT DEFAULT NULL,
  p_remove BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
SET row_security = off
AS $$
DECLARE
  v_org_id UUID;
  v_actor_role TEXT;
  v_target_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT m.org_id, m.role INTO v_org_id, v_actor_role
  FROM public.memberships m
  WHERE m.user_id = auth.uid()
  ORDER BY m.created_at
  LIMIT 1;

  IF v_org_id IS NULL OR v_actor_role NOT IN ('owner', 'super_admin', 'admin') THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT m.role INTO v_target_role
  FROM public.memberships m
  WHERE m.org_id = v_org_id AND m.user_id = p_target_user_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'member not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_target_role IN ('owner', 'super_admin') THEN
    RAISE EXCEPTION 'owner and super admin access cannot be changed here' USING ERRCODE = '42501';
  END IF;
  IF v_target_role = 'admin' AND v_actor_role NOT IN ('owner', 'super_admin') THEN
    RAISE EXCEPTION 'only an owner or super admin can change admin access' USING ERRCODE = '42501';
  END IF;
  IF p_target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot change your own membership' USING ERRCODE = '42501';
  END IF;

  IF p_remove THEN
    DELETE FROM public.memberships m
    WHERE m.org_id = v_org_id AND m.user_id = p_target_user_id;
    INSERT INTO public.audit_logs (org_id, user_id, action, target_type, target_id, before_state, result)
    VALUES (v_org_id, auth.uid(), 'membership.removed', 'membership', p_target_user_id::TEXT,
      jsonb_build_object('role', v_target_role), 'success');
    RETURN;
  END IF;

  IF p_new_role IS NULL OR p_new_role NOT IN ('admin', 'it_manager', 'technician', 'help_desk', 'auditor', 'viewer', 'member') THEN
    RAISE EXCEPTION 'invalid role' USING ERRCODE = '22023';
  END IF;
  IF p_new_role = 'admin' AND v_actor_role NOT IN ('owner', 'super_admin') THEN
    RAISE EXCEPTION 'only an owner or super admin can grant admin access' USING ERRCODE = '42501';
  END IF;

  UPDATE public.memberships m
  SET role = p_new_role
  WHERE m.org_id = v_org_id AND m.user_id = p_target_user_id;

  INSERT INTO public.audit_logs (org_id, user_id, action, target_type, target_id, before_state, after_state, result)
  VALUES (v_org_id, auth.uid(), 'membership.role_changed', 'membership', p_target_user_id::TEXT,
    jsonb_build_object('role', v_target_role), jsonb_build_object('role', p_new_role), 'success');
END;
$$;

REVOKE ALL ON FUNCTION public.list_current_org_members() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.manage_current_org_member(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_current_org_members() TO authenticated;
GRANT EXECUTE ON FUNCTION public.manage_current_org_member(UUID, TEXT, BOOLEAN) TO authenticated;

NOTIFY pgrst, 'reload schema';
