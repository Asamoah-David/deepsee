-- 006_enrollment_improvements.sql
-- Add improvements to enrollment sessions and device registration.
--
-- §72 (enrollment link): Administrator generates enrollment link, user clicks and downloads agent.
-- §73 (USB enrollment): Administrator creates USB package with enrollment code.
-- §74 (enrollment security): Enrollment code is temporary, device receives permanent identity.

-- Add index for faster enrollment session lookups by code
CREATE INDEX IF NOT EXISTS idx_enrollment_sessions_code ON enrollment_sessions(code);
CREATE INDEX IF NOT EXISTS idx_enrollment_sessions_org_id ON enrollment_sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_sessions_expires_at ON enrollment_sessions(expires_at);

-- Add index for device lookups
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);
CREATE INDEX IF NOT EXISTS idx_devices_org_id_status ON devices(org_id, status);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen DESC);

-- Function to generate enrollment code
CREATE OR REPLACE FUNCTION generate_enrollment_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        -- Generate 8-character alphanumeric code
        code := upper(substring(encode(gen_random_bytes(6), 'base64'), 1, 8));
        -- Replace URL-unsafe characters
        code := regexp_replace(code, '[+/]', 'X', 'g');

        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM enrollment_sessions WHERE code = code) INTO exists;

        IF NOT exists THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create enrollment session
CREATE OR REPLACE FUNCTION create_enrollment_session(p_org_id UUID, p_created_by UUID, p_expires_in_hours INTEGER DEFAULT 24)
RETURNS enrollment_sessions AS $$
DECLARE
    v_session enrollment_sessions;
BEGIN
    INSERT INTO enrollment_sessions (org_id, code, created_by, expires_at)
    VALUES (
        p_org_id,
        generate_enrollment_code(),
        p_created_by,
        NOW() + (p_expires_in_hours || ' hours')::INTERVAL
    )
    RETURNING * INTO v_session;

    RETURN v_session;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION generate_enrollment_code() TO authenticated;
GRANT EXECUTE ON FUNCTION create_enrollment_session(UUID, UUID, INTEGER) TO authenticated;
