
-- Fix for Institutions Table
-- Add courts_total if missing

ALTER TABLE institutions 
ADD COLUMN IF NOT EXISTS courts_total INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS schedule_open TEXT DEFAULT '08:00',
ADD COLUMN IF NOT EXISTS schedule_close TEXT DEFAULT '22:00';

NOTIFY pgrst, 'reload config';
