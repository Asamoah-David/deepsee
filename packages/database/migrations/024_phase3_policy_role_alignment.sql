-- Keep the database policy consistent with the owner/super-admin controls.
-- Organization policy changes are impactful and require both an elevated role
-- and a fresh second-factor assurance claim.
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
  IF v_org IS NULL OR v_role NOT IN ('owner','super_admin') THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE='42501';
  END IF;
  IF auth.jwt()->>'aal' IS DISTINCT FROM 'aal2' THEN
    RAISE EXCEPTION 'MFA required to change organization security policy' USING ERRCODE='42501';
  END IF;
  UPDATE public.organizations SET require_mfa=p_required,updated_at=now() WHERE id=v_org;
  INSERT INTO public.audit_logs(org_id,user_id,action,target_type,target_id,before_state,after_state,result)
    VALUES(v_org,auth.uid(),'organization.mfa_policy_changed','organization',v_org::TEXT,
      jsonb_build_object('require_mfa',v_before),jsonb_build_object('require_mfa',p_required),'success');
END;
$$;
