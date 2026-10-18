-- 012_remove_org_trigger.sql
-- Remove the organization creation trigger since it references a non-existent column
-- and we handle membership creation in the API instead

DROP TRIGGER IF EXISTS on_organization_created ON organizations;
DROP FUNCTION IF EXISTS create_owner_membership();
