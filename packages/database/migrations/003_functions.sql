-- 003_functions.sql

-- Trigger function to update updated_at columns automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Attach trigger to tables with updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- get_device_health_score
CREATE OR REPLACE FUNCTION get_device_health_score(target_device_id UUID)
RETURNS TEXT AS $$
DECLARE
    latest_cpu REAL;
    latest_ram REAL;
    latest_disk REAL;
BEGIN
    SELECT cpu_percent, ram_percent, disk_percent 
    INTO latest_cpu, latest_ram, latest_disk
    FROM device_metrics 
    WHERE device_id = target_device_id 
    ORDER BY recorded_at DESC LIMIT 1;

    IF latest_cpu IS NULL THEN
        RETURN 'unknown';
    END IF;

    IF latest_cpu > 95 OR latest_ram > 95 OR latest_disk > 95 THEN
        RETURN 'critical';
    ELSIF latest_cpu > 80 OR latest_ram > 80 OR latest_disk > 80 THEN
        RETURN 'warning';
    ELSE
        RETURN 'healthy';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- get_org_device_stats
CREATE OR REPLACE FUNCTION get_org_device_stats(target_org_id UUID)
RETURNS JSONB AS $$
DECLARE
    total_count INT;
    online_count INT;
    offline_count INT;
    critical_count INT;
BEGIN
    SELECT COUNT(*) INTO total_count FROM devices WHERE org_id = target_org_id;
    SELECT COUNT(*) INTO online_count FROM devices WHERE org_id = target_org_id AND status = 'online';
    SELECT COUNT(*) INTO offline_count FROM devices WHERE org_id = target_org_id AND status = 'offline';
    
    -- Count devices with critical health
    SELECT COUNT(*) INTO critical_count 
    FROM devices d
    WHERE org_id = target_org_id 
    AND get_device_health_score(d.id) = 'critical';

    RETURN jsonb_build_object(
        'total', total_count,
        'online', online_count,
        'offline', offline_count,
        'critical', critical_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- cleanup_expired_enrollment_sessions
CREATE OR REPLACE FUNCTION cleanup_expired_enrollment_sessions()
RETURNS VOID AS $$
BEGIN
    DELETE FROM enrollment_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
