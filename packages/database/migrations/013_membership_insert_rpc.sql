-- 013_membership_insert_rpc.sql
-- RPC function to insert membership bypassing RLS
--
-- This function uses SECURITY DEFINER to bypass RLS and create a membership

CREATE OR REPLACE FUNCTION insert_membership_service_role(
  p_org_id UUID,
  p_user_id UUID,
  p_role TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO memberships (org_id, user_id, role)
  VALUES (p_org_id, p_user_id, p_role);
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION insert_membership_service_role(UUID, UUID, TEXT) TO service_role;
