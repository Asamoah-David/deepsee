-- 001_dev_seed.sql

-- Create a dummy auth user (in a real scenario, this matches a row in auth.users)
-- Assuming auth.users is populated, or just leave user_id as a random UUID for dev testing.

DO $$
DECLARE
    org_id UUID := gen_random_uuid();
    dev1_id UUID := gen_random_uuid();
    dev2_id UUID := gen_random_uuid();
    dev3_id UUID := gen_random_uuid();
    dummy_user_id UUID := gen_random_uuid();
BEGIN
    -- Organization
    INSERT INTO organizations (id, name, slug, plan) 
    VALUES (org_id, 'Test Organization', 'test-org', 'pro');

    -- Membership
    INSERT INTO memberships (org_id, user_id, role) 
    VALUES (org_id, dummy_user_id, 'admin');

    -- Devices
    INSERT INTO devices (id, org_id, device_id, name, hostname, status, os_version, agent_version) VALUES 
    (dev1_id, org_id, 'DEV-001', 'Primary Server', 'win-srv-01', 'online', 'Windows Server 2022', '1.0.0'),
    (dev2_id, org_id, 'DEV-002', 'Web Kiosk', 'win-kiosk-02', 'offline', 'Windows 11', '1.0.0'),
    (dev3_id, org_id, 'DEV-003', 'Database Node', 'win-db-03', 'online', 'Windows Server 2019', '0.9.8');

    -- Metrics
    INSERT INTO device_metrics (device_id, org_id, cpu_percent, ram_percent, disk_percent, uptime_seconds) VALUES 
    (dev1_id, org_id, 45.2, 60.1, 80.0, 360000),
    (dev2_id, org_id, 0.0, 0.0, 0.0, 0),
    (dev3_id, org_id, 98.5, 96.0, 40.0, 1200000);

    -- Alert
    INSERT INTO alerts (org_id, device_id, type, severity, title, detail) 
    VALUES (org_id, dev3_id, 'high_cpu', 'critical', 'High CPU Usage Detected', '{"cpu": 98.5}');

    -- Incident
    INSERT INTO incidents (org_id, title, status, severity, device_ids) 
    VALUES (org_id, 'Database Performance Degradation', 'open', 'high', ARRAY[dev3_id]);

END $$;
