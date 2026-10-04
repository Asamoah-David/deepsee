-- 004_realtime.sql

-- Enable Realtime for relevant tables
BEGIN;

-- Drop publication if it exists to recreate it cleanly, or just create it
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;

-- Add the specified tables to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE devices;
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE commands;
ALTER PUBLICATION supabase_realtime ADD TABLE incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE remote_sessions;

COMMIT;
