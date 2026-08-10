
-- Fix for Bookings Table
-- Add columns that might be missing if the table already existed

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS booking_type TEXT CHECK (booking_type IN ('guest', 'tournament', 'maintenance', 'class')) DEFAULT 'guest',
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS total_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS extras JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS match_id UUID REFERENCES matches(id);

-- Reload Schema Cache (Notify PostgREST)
NOTIFY pgrst, 'reload config';
