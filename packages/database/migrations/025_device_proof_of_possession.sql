-- Phase 4: bind device credentials to the enrolled Windows key and allow
-- short-lived credentials to rotate with replay protection.
ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS credential_version INTEGER NOT NULL DEFAULT 1
    CHECK (credential_version > 0);

-- Agent-initiated security events have a device actor rather than a human user.
ALTER TABLE public.audit_logs ALTER COLUMN user_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.device_credential_requests (
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  nonce TEXT NOT NULL CHECK (nonce ~ '^[a-f0-9]{32}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(device_id, nonce)
);
ALTER TABLE public.device_credential_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.device_credential_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.device_credential_requests TO service_role;

CREATE OR REPLACE FUNCTION public.rotate_device_credential(
  p_org_id UUID,
  p_device_id TEXT,
  p_expected_version INTEGER,
  p_nonce TEXT,
  p_request_time TIMESTAMPTZ
)
RETURNS TABLE(credential_version INTEGER, public_key TEXT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
DECLARE v_internal_id UUID; v_version INTEGER; v_key TEXT;
BEGIN
  IF auth.uid() IS NOT NULL OR p_expected_version < 1
     OR p_nonce !~ '^[a-f0-9]{32}$'
     OR p_request_time < now() - interval '5 minutes'
     OR p_request_time > now() + interval '5 minutes' THEN
    RAISE EXCEPTION 'invalid device rotation request' USING ERRCODE='42501';
  END IF;
  SELECT d.id,d.credential_version,d.public_key INTO v_internal_id,v_version,v_key
    FROM public.devices d
    WHERE d.org_id=p_org_id AND d.device_id=p_device_id AND d.revoked_at IS NULL
    FOR UPDATE;
  IF v_internal_id IS NULL THEN RAISE EXCEPTION 'device unavailable' USING ERRCODE='P0002'; END IF;
  DELETE FROM public.device_credential_requests WHERE created_at < now()-interval '10 minutes';
  INSERT INTO public.device_credential_requests(device_id,nonce) VALUES(v_internal_id,p_nonce);
  IF p_expected_version = v_version THEN
    UPDATE public.devices SET credential_version=credential_version+1,updated_at=now()
      WHERE id=v_internal_id RETURNING devices.credential_version INTO v_version;
    INSERT INTO public.audit_logs(org_id,device_id,action,target_type,target_id,before_state,after_state,result)
      VALUES(p_org_id,v_internal_id,'device.credential_rotated','device',p_device_id,
        jsonb_build_object('credential_version',p_expected_version),
        jsonb_build_object('credential_version',v_version),'success');
  ELSIF p_expected_version <> v_version-1 THEN
    RAISE EXCEPTION 'stale device credential' USING ERRCODE='40001';
  END IF;
  RETURN QUERY SELECT v_version,v_key;
END;
$$;

REVOKE ALL ON FUNCTION public.rotate_device_credential(UUID,TEXT,INTEGER,TEXT,TIMESTAMPTZ) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_device_credential(UUID,TEXT,INTEGER,TEXT,TIMESTAMPTZ) TO service_role;
NOTIFY pgrst,'reload schema';
