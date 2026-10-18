-- The initial organization helper accepted any user id from its caller and
-- referenced a non-existent column. Replace it with a caller-bound operation.
REVOKE ALL ON FUNCTION public.create_organization_with_membership(TEXT, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_organization_with_membership(TEXT, TEXT, UUID) FROM authenticated;
REVOKE ALL ON FUNCTION public.create_organization_with_membership(TEXT, TEXT, UUID) FROM service_role;

CREATE OR REPLACE FUNCTION public.create_organization_for_current_user(
  p_org_name TEXT,
  p_slug TEXT
)
RETURNS TABLE (id UUID, name TEXT, slug TEXT, plan TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  created_org_id UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;
  IF length(trim(p_org_name)) < 2 OR length(p_org_name) > 100
     OR p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'invalid_organization_details' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.organizations (name, slug, plan)
  VALUES (trim(p_org_name), p_slug, 'free')
  RETURNING organizations.id INTO created_org_id;

  INSERT INTO public.memberships (org_id, user_id, role)
  VALUES (created_org_id, current_user_id, 'owner');

  RETURN QUERY
  SELECT o.id, o.name, o.slug, o.plan, o.created_at
  FROM public.organizations o
  WHERE o.id = created_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_organization_for_current_user(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_organization_for_current_user(TEXT, TEXT) TO authenticated;
