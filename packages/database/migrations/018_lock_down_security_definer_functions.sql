-- SECURITY DEFINER functions need explicit tenant checks and non-public grants.
CREATE OR REPLACE FUNCTION public.get_device_health_score(target_device_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  target_org UUID;
  latest_cpu REAL;
  latest_ram REAL;
  latest_disk REAL;
BEGIN
  SELECT d.org_id INTO target_org
    FROM public.devices d
   WHERE d.id = target_device_id;
  IF target_org IS NULL OR NOT public.has_org_membership(target_org) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  SELECT m.cpu_percent, m.ram_percent, m.disk_percent
    INTO latest_cpu, latest_ram, latest_disk
    FROM public.device_metrics m
   WHERE m.device_id = target_device_id
   ORDER BY m.recorded_at DESC
   LIMIT 1;

  IF latest_cpu IS NULL THEN RETURN 'unknown'; END IF;
  IF latest_cpu > 95 OR latest_ram > 95 OR latest_disk > 95 THEN RETURN 'critical'; END IF;
  IF latest_cpu > 80 OR latest_ram > 80 OR latest_disk > 80 THEN RETURN 'warning'; END IF;
  RETURN 'healthy';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_org_device_stats(target_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  total_count INTEGER;
  online_count INTEGER;
  offline_count INTEGER;
  critical_count INTEGER;
BEGIN
  IF NOT public.has_org_membership(target_org_id) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  SELECT count(*)::INTEGER INTO total_count FROM public.devices WHERE org_id = target_org_id;
  SELECT count(*)::INTEGER INTO online_count FROM public.devices WHERE org_id = target_org_id AND status = 'online';
  SELECT count(*)::INTEGER INTO offline_count FROM public.devices WHERE org_id = target_org_id AND status = 'offline';
  SELECT count(*)::INTEGER INTO critical_count
    FROM public.devices d
   WHERE d.org_id = target_org_id
     AND public.get_device_health_score(d.id) = 'critical';

  RETURN jsonb_build_object(
    'total', total_count,
    'online', online_count,
    'offline', offline_count,
    'critical', critical_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_device_health_score(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_org_device_stats(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_device_health_score(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_org_device_stats(UUID) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.cleanup_expired_enrollment_sessions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_enrollment_sessions() TO service_role;
REVOKE ALL ON FUNCTION public.get_user_orgs(UUID) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.user_has_role(UUID, UUID, TEXT) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.get_user_permissions(UUID, UUID) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_orgs(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.user_has_role(UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_permissions(UUID, UUID) TO service_role;
REVOKE ALL ON FUNCTION public.insert_membership_service_role(UUID, UUID, TEXT) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.insert_membership_service_role(UUID, UUID, TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.generate_enrollment_code() FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_enrollment_code() TO service_role;
REVOKE ALL ON FUNCTION public.create_enrollment_session(UUID, UUID, INTEGER) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.create_enrollment_session(UUID, UUID, INTEGER) TO service_role;
REVOKE ALL ON FUNCTION public.update_device_heartbeat(UUID, UUID, TEXT) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.update_device_heartbeat(UUID, UUID, TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.mark_offline_devices(INTEGER) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_offline_devices(INTEGER) TO service_role;
