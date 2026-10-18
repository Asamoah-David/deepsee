-- 009_org_creation_rpc.sql
-- RPC function to create organization and membership atomically, bypassing RLS
--
-- This function is needed because the RLS policies create a circular dependency:
-- - Organizations table checks memberships for tenant isolation
-- - But when creating the first organization, no memberships exist yet
-- This function uses SECURITY DEFINER to bypass RLS and create both in one transaction

CREATE OR REPLACE FUNCTION create_organization_with_membership(
  p_org_name TEXT,
  p_slug TEXT,
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  plan TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Create organization (bypasses RLS due to SECURITY DEFINER)
  INSERT INTO organizations (name, slug, plan, created_by)
  VALUES (p_org_name, p_slug, 'free', p_user_id)
  RETURNING id INTO v_org_id;

  -- Create membership for the user (bypasses RLS due to SECURITY DEFINER)
  INSERT INTO memberships (org_id, user_id, role)
  VALUES (v_org_id, p_user_id, 'owner');

  -- Return the created organization
  RETURN QUERY
    SELECT id, name, slug, plan, created_by, created_at
    FROM organizations
    WHERE id = v_org_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_organization_with_membership(TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_organization_with_membership(TEXT, TEXT, UUID) TO service_role;

