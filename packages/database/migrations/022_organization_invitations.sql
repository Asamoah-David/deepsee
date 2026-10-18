-- Expiring, one-time organization invitations. Raw invitation tokens are never
-- stored; the web application stores only SHA-256 digests.
CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'it_manager', 'technician', 'help_desk', 'auditor', 'viewer', 'member')),
  token_hash TEXT NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (email = lower(email)),
  CHECK (expires_at > created_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS organization_invitations_pending_email
  ON public.organization_invitations(org_id, email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS organization_invitations_org_created
  ON public.organization_invitations(org_id, created_at DESC);
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.organization_invitations FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_current_org_invitation(
  p_email TEXT,
  p_role TEXT,
  p_token_hash TEXT
)
RETURNS TABLE (id UUID, email TEXT, role TEXT, org_name TEXT, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
SET row_security = off
AS $$
DECLARE
  v_org_id UUID;
  v_actor UUID := auth.uid();
  v_actor_role TEXT;
  v_email TEXT := lower(trim(p_email));
  v_invite public.organization_invitations%ROWTYPE;
  v_org_name TEXT;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  SELECT m.org_id, m.role INTO v_org_id, v_actor_role
    FROM public.memberships m WHERE m.user_id = v_actor ORDER BY m.created_at LIMIT 1;
  IF v_org_id IS NULL OR v_actor_role NOT IN ('owner', 'super_admin', 'admin') THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF v_email IS NULL OR v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     OR length(v_email) > 254
     OR p_role IS NULL OR p_role NOT IN ('admin', 'it_manager', 'technician', 'help_desk', 'auditor', 'viewer', 'member')
     OR p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'invalid invitation' USING ERRCODE = '22023';
  END IF;
  IF p_role = 'admin' AND v_actor_role NOT IN ('owner', 'super_admin') THEN
    RAISE EXCEPTION 'only an owner or super admin can invite administrators' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users u JOIN public.memberships m ON m.user_id = u.id
             WHERE m.org_id = v_org_id AND lower(u.email) = v_email) THEN
    RAISE EXCEPTION 'already a member' USING ERRCODE = '23505';
  END IF;

  UPDATE public.organization_invitations i
    SET revoked_at = now()
    WHERE i.org_id = v_org_id AND i.email = v_email
      AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at <= now();
  INSERT INTO public.organization_invitations(org_id, email, role, token_hash, created_by, expires_at)
    VALUES (v_org_id, v_email, p_role, p_token_hash, v_actor, now() + interval '7 days')
    RETURNING * INTO v_invite;
  SELECT o.name INTO v_org_name FROM public.organizations o WHERE o.id = v_org_id;
  INSERT INTO public.audit_logs(org_id, user_id, action, target_type, target_id, after_state, result)
    VALUES (v_org_id, v_actor, 'invitation.created', 'organization_invitation', v_invite.id::TEXT,
      jsonb_build_object('email', v_email, 'role', p_role, 'expires_at', v_invite.expires_at), 'success');
  RETURN QUERY SELECT v_invite.id, v_invite.email, v_invite.role, v_org_name, v_invite.expires_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_current_org_invitations()
RETURNS TABLE (id UUID, email TEXT, role TEXT, created_at TIMESTAMPTZ, expires_at TIMESTAMPTZ)
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
  RETURN QUERY SELECT i.id, i.email, i.role, i.created_at, i.expires_at
    FROM public.organization_invitations i
    WHERE i.org_id = v_org_id AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > now()
    ORDER BY i.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_current_org_invitation(p_invitation_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
DECLARE v_org_id UUID; v_actor_role TEXT; v_invite public.organization_invitations%ROWTYPE;
BEGIN
  SELECT m.org_id, m.role INTO v_org_id, v_actor_role FROM public.memberships m
    WHERE m.user_id = auth.uid() ORDER BY m.created_at LIMIT 1;
  IF v_org_id IS NULL OR v_actor_role NOT IN ('owner', 'super_admin', 'admin') THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_invite FROM public.organization_invitations i
    WHERE i.id = p_invitation_id AND i.org_id = v_org_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invitation not found' USING ERRCODE = 'P0002'; END IF;
  IF v_invite.role = 'admin' AND v_actor_role NOT IN ('owner', 'super_admin') THEN
    RAISE EXCEPTION 'only an owner or super admin can revoke an administrator invitation' USING ERRCODE = '42501';
  END IF;
  IF v_invite.accepted_at IS NOT NULL THEN RAISE EXCEPTION 'invitation already accepted' USING ERRCODE = '22023'; END IF;
  UPDATE public.organization_invitations SET revoked_at = now()
    WHERE id = p_invitation_id AND revoked_at IS NULL;
  INSERT INTO public.audit_logs(org_id, user_id, action, target_type, target_id, before_state, result)
    VALUES (v_org_id, auth.uid(), 'invitation.revoked', 'organization_invitation', p_invitation_id::TEXT,
      jsonb_build_object('email', v_invite.email, 'role', v_invite.role), 'success');
END;
$$;

-- A token reveals only the minimum invitation details. It is unguessable and
-- expires; acceptance still requires a signed-in account with the matching email.
CREATE OR REPLACE FUNCTION public.get_org_invitation_by_token(p_token_hash TEXT)
RETURNS TABLE (email TEXT, role TEXT, org_name TEXT, expires_at TIMESTAMPTZ)
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
  SELECT i.email, i.role, o.name, i.expires_at
  FROM public.organization_invitations i
  JOIN public.organizations o ON o.id = i.org_id
  WHERE i.token_hash = p_token_hash AND i.accepted_at IS NULL
    AND i.revoked_at IS NULL AND i.expires_at > now()
    AND p_token_hash ~ '^[a-f0-9]{64}$'
$$;

CREATE OR REPLACE FUNCTION public.accept_org_invitation(p_token_hash TEXT)
RETURNS TABLE (org_id UUID, org_name TEXT, role TEXT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
SET row_security = off
AS $$
DECLARE v_actor UUID := auth.uid(); v_email TEXT; v_invite public.organization_invitations%ROWTYPE; v_org_name TEXT;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  SELECT lower(u.email) INTO v_email FROM auth.users u WHERE u.id = v_actor;
  SELECT * INTO v_invite FROM public.organization_invitations i
    WHERE i.token_hash = p_token_hash AND i.accepted_at IS NULL
      AND i.revoked_at IS NULL AND i.expires_at > now() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invitation invalid or expired' USING ERRCODE = 'P0002'; END IF;
  IF v_email IS NULL OR v_email <> v_invite.email THEN
    RAISE EXCEPTION 'invitation email does not match signed-in account' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.memberships m WHERE m.org_id = v_invite.org_id AND m.user_id = v_actor) THEN
    RAISE EXCEPTION 'already a member' USING ERRCODE = '23505';
  END IF;
  INSERT INTO public.memberships(org_id, user_id, role) VALUES (v_invite.org_id, v_actor, v_invite.role);
  UPDATE public.organization_invitations SET accepted_at = now() WHERE id = v_invite.id;
  SELECT o.name INTO v_org_name FROM public.organizations o WHERE o.id = v_invite.org_id;
  INSERT INTO public.audit_logs(org_id, user_id, action, target_type, target_id, after_state, result)
    VALUES (v_invite.org_id, v_actor, 'invitation.accepted', 'organization_invitation', v_invite.id::TEXT,
      jsonb_build_object('email', v_email, 'role', v_invite.role), 'success');
  RETURN QUERY SELECT v_invite.org_id, v_org_name, v_invite.role;
END;
$$;

REVOKE ALL ON FUNCTION public.create_current_org_invitation(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_current_org_invitations() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_current_org_invitation(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_org_invitation_by_token(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_org_invitation(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_current_org_invitation(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_current_org_invitations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_current_org_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_invitation_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_org_invitation(TEXT) TO authenticated;
NOTIFY pgrst, 'reload schema';
