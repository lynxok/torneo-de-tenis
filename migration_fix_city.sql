
-- SCHEMA FIX: Add missing city column to institutions
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS city TEXT;

-- Update PostgRest
NOTIFY pgrst, 'reload config';
