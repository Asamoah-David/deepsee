-- Relay handshake authorization is shared across replicas and checks both
-- nonce replay and the current tenant/credential/revocation state.
CREATE OR REPLACE FUNCTION public.authorize_device_relay_handshake(
  p_org_id UUID,
  p_device_id TEXT,
  p_credential_version INTEGER,
  p_nonce TEXT,
  p_request_time TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
DECLARE v_internal_id UUID;
BEGIN
  IF auth.uid() IS NOT NULL OR p_credential_version < 1
     OR p_nonce !~ '^[a-f0-9]{32}$'
     OR p_request_time < now() - interval '5 minutes'
     OR p_request_time > now() + interval '5 minutes' THEN
    RETURN FALSE;
  END IF;
  SELECT d.id INTO v_internal_id FROM public.devices d
    WHERE d.org_id=p_org_id AND d.device_id=p_device_id
      AND d.credential_version=p_credential_version AND d.revoked_at IS NULL;
  IF v_internal_id IS NULL THEN RETURN FALSE; END IF;
  DELETE FROM public.device_credential_requests WHERE created_at < now()-interval '10 minutes';
  INSERT INTO public.device_credential_requests(device_id,nonce)
    VALUES(v_internal_id,p_nonce) ON CONFLICT(device_id,nonce) DO NOTHING;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.authorize_device_relay_handshake(UUID,TEXT,INTEGER,TEXT,TIMESTAMPTZ) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.authorize_device_relay_handshake(UUID,TEXT,INTEGER,TEXT,TIMESTAMPTZ) TO service_role;
NOTIFY pgrst,'reload schema';
