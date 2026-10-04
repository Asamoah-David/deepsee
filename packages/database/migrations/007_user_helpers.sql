-- 007_user_helpers.sql
-- Helper functions for user and organization management.
--
-- §8 (multi-tenancy): A tenant represents an independent organization/customer.
-- §9 (multiple administrators): A tenant can have many administrators.

-- Function to get current user's organizations
CREATE OR REPLACE FUNCTION get_user_orgs(p_user_id UUID)
RETURNS TABLE (org_id UUID, org_name TEXT, role TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id,
        o.name,
        m.role
    FROM memberships m
    JOIN organizations o ON m.org_id = o.id
    WHERE m.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has specific role in organization
CREATE OR REPLACE FUNCTION user_has_role(p_user_id UUID, p_org_id UUID, p_required_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role
    FROM memberships
    WHERE user_id = p_user_id AND org_id = p_org_id;

    -- Owner has all permissions
    IF v_role = 'owner' THEN
        RETURN true;
    END IF;

    -- Super admin has all permissions
    IF v_role = 'super_admin' THEN
        RETURN true;
    END IF;

    -- Check specific role
    RETURN v_role = p_required_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's permissions in organization
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID, p_org_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_role TEXT;
    v_permissions JSONB;
BEGIN
    SELECT role INTO v_role
    FROM memberships
    WHERE user_id = p_user_id AND org_id = p_org_id;

    -- Define role-based permissions
    CASE v_role
        WHEN 'owner' THEN
            v_permissions := '{
                "view_devices": true,
                "remote_screen": true,
                "remote_control": true,
                "files": true,
                "terminal": true,
                "deploy_apps": true,
                "policies": true,
                "users": true,
                "billing": true,
                "administrators": true,
                "audit": true,
                "delete_organization": true
            }'::jsonb;
        WHEN 'super_admin' THEN
            v_permissions := '{
                "view_devices": true,
                "remote_screen": true,
                "remote_control": true,
                "files": true,
                "terminal": true,
                "deploy_apps": true,
                "policies": true,
                "users": true,
                "billing": true,
                "administrators": true,
                "audit": true,
                "delete_organization": false
            }'::jsonb;
        WHEN 'admin' THEN
            v_permissions := '{
                "view_devices": true,
                "remote_screen": true,
                "remote_control": true,
                "files": true,
                "terminal": true,
                "deploy_apps": true,
                "policies": true,
                "users": true,
                "billing": false,
                "administrators": false,
                "audit": true,
                "delete_organization": false
            }'::jsonb;
        WHEN 'technician' THEN
            v_permissions := '{
                "view_devices": true,
                "remote_screen": true,
                "remote_control": true,
                "files": true,
                "terminal": false,
                "deploy_apps": false,
                "policies": false,
                "users": false,
                "billing": false,
                "administrators": false,
                "audit": false,
                "delete_organization": false
            }'::jsonb;
        WHEN 'viewer' THEN
            v_permissions := '{
                "view_devices": true,
                "remote_screen": false,
                "remote_control": false,
                "files": false,
                "terminal": false,
                "deploy_apps": false,
                "policies": false,
                "users": false,
                "billing": false,
                "administrators": false,
                "audit": true,
                "delete_organization": false
            }'::jsonb;
        ELSE
            v_permissions := '{}'::jsonb;
    END CASE;

    RETURN v_permissions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_orgs(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_role(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_permissions(UUID, UUID) TO authenticated;
