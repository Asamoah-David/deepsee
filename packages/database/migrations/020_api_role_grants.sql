-- Supabase defaults these grants; make the standalone PostgreSQL setup match.
-- RLS policies remain the tenant and capability boundary.
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Avoid exposing subscription and identity fields through broad table grants.
REVOKE UPDATE ON public.organizations FROM authenticated;
GRANT UPDATE (name) ON public.organizations TO authenticated;

REVOKE UPDATE ON public.devices FROM authenticated;
GRANT UPDATE (name, hostname, assigned_user_id, group_ids, tags, asset_info, metadata)
  ON public.devices TO authenticated;

-- Device identity is immutable through the ordinary authenticated API. Trusted
-- enrollment, agent and revocation services use service_role.
