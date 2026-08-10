
-- FINAL SCHEMA ALIGNMENT: SMASH TENNIS MANAGER
-- This script ensures all tables have the necessary columns identified during the audit.

-- 1. SYSTEM CONFIGURATION TABLE
CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_drive_enabled BOOLEAN DEFAULT FALSE,
    google_client_id TEXT,
    google_api_key TEXT,
    target_folder_id TEXT,
    service_account_email TEXT,
    welcome_message TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial config if empty
INSERT INTO system_config (google_drive_enabled, welcome_message)
SELECT FALSE, '¡Bienvenido a la comunidad de Smash Tennis!'
WHERE NOT EXISTS (SELECT 1 FROM system_config);

-- 2. INSTITUTIONS ALIGNMENT
ALTER TABLE institutions
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS cover_url TEXT,
ADD COLUMN IF NOT EXISTS maps_url TEXT,
ADD COLUMN IF NOT EXISTS courts_clay INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS courts_hard INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS courts_indoor INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_day DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_night DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS schedule_night_start TIME DEFAULT '18:00',
ADD COLUMN IF NOT EXISTS mp_access_token TEXT;

-- 3. PROFILES ALIGNMENT
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS dni TEXT;

-- 4. REFRESH POSTGREST CONFIG
NOTIFY pgrst, 'reload config';
