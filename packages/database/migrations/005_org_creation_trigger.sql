-- 005_org_creation_trigger.sql
-- Add trigger to automatically create owner membership when organization is created.
--
-- This allows the service role to create an organization and automatically grant
-- the creating user owner access, without exposing membership insertion to regular users.
--
-- §9 (multiple administrators): Organization can have many administrators.
-- §193 (admin invitations): Invite administrators by email, organization invitation, role assignment.

-- Function to create owner membership after organization creation
CREATE OR REPLACE FUNCTION create_owner_membership()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO memberships (org_id, user_id, role, department, device_group_scope)
    VALUES (
        NEW.id,
        NEW.created_by,
        'owner',
        NULL,
        '{}'::UUID[]
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create membership on organization insert
DROP TRIGGER IF EXISTS on_organization_created ON organizations;
CREATE TRIGGER on_organization_created
    AFTER INSERT ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION create_owner_membership();

-- Grant execute on function to service role
GRANT EXECUTE ON FUNCTION create_owner_membership() TO service_role;
