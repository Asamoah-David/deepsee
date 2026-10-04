-- 008_device_heartbeat.sql
-- Add device heartbeat tracking and status management.
--
-- §76 (persistent connection): Windows starts, Agent starts, Agent authenticates,
-- Server recognizes device, Device becomes ONLINE.
-- §104 (device status): ONLINE, OFFLINE, CONNECTING, DEGRADED, ENROLLING, UPDATING, ERROR.
-- §107 (device notifications): Agent can report device online, offline, etc.

-- Add function to update device heartbeat and status
CREATE OR REPLACE FUNCTION update_device_heartbeat(p_device_id UUID, p_org_id UUID, p_status TEXT DEFAULT 'online')
RETURNS VOID AS $$
BEGIN
    UPDATE devices
    SET
        last_seen = NOW(),
        status = p_status,
        updated_at = NOW()
    WHERE id = p_device_id AND org_id = p_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to mark devices as offline if they haven't checked in
CREATE OR REPLACE FUNCTION mark_offline_devices(p_timeout_minutes INTEGER DEFAULT 5)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE devices
    SET
        status = 'offline',
        updated_at = NOW()
    WHERE
        status = 'online'
        AND last_seen < NOW() - (p_timeout_minutes || ' minutes')::INTERVAL;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add index for heartbeat queries
CREATE INDEX IF NOT EXISTS idx_devices_status_last_seen ON devices(status, last_seen);

-- Grant execute on functions to authenticated users and service role
GRANT EXECUTE ON FUNCTION update_device_heartbeat(UUID, UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mark_offline_devices(INTEGER) TO service_role;

-- Create a pg_cron extension for scheduled heartbeat checks (if available)
-- This will be used by the backend to periodically check for offline devices
-- Note: pg_cron may not be available in all Supabase plans, so we'll also
-- implement this as a scheduled job in the application layer
