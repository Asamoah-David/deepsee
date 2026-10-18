-- Claim an enrollment link and create its device in one transaction. Locking
-- the enrollment row makes the one-time-use guarantee hold under concurrency.
ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.claim_enrollment_session(
  p_code TEXT,
  p_device_id TEXT,
  p_hostname TEXT,
  p_public_key TEXT,
  p_os_version TEXT,
  p_hardware JSONB,
  p_network JSONB,
  p_agent_version TEXT
)
RETURNS TABLE (id UUID, org_id UUID, device_id TEXT, name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  enrollment_id UUID;
  tenant_id UUID;
  created_device public.devices%ROWTYPE;
BEGIN
  SELECT es.id, es.org_id
    INTO enrollment_id, tenant_id
    FROM public.enrollment_sessions es
   WHERE es.code = p_code
     AND es.used_at IS NULL
     AND es.expires_at > now()
   FOR UPDATE;

  IF enrollment_id IS NULL THEN
    RAISE EXCEPTION 'invalid_or_expired_enrollment' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.devices (
    org_id, device_id, name, hostname, public_key, status, os_version,
    agent_version, last_seen, hardware, network
  ) VALUES (
    tenant_id, p_device_id, p_hostname, p_hostname, p_public_key, 'offline',
    p_os_version, p_agent_version, now(), coalesce(p_hardware, '{}'::jsonb),
    coalesce(p_network, '{}'::jsonb)
  ) RETURNING * INTO created_device;

  UPDATE public.enrollment_sessions
     SET used_at = now(), device_id = created_device.id
   WHERE enrollment_sessions.id = enrollment_id;

  RETURN QUERY SELECT created_device.id, created_device.org_id,
                      created_device.device_id, created_device.name;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_enrollment_session(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_enrollment_session(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, TEXT) TO service_role;
