-- ==============================================================================
-- MIGRATION V2: SMASH TENNIS MANAGER UPGRADE
-- Description: Adapts existing database to support the new React/Vite application.
-- Includes:
-- 1. New Tables: bookings, messages, court_slots, transactions, ranking_history
-- 2. Alter Tables: profiles, institutions, tournaments, matches
-- 3. RLS Policies for new tables
-- ==============================================================================

-- 1. UPGRADE PROFILES TABLE
-- =========================
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS matches_won INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tournaments_won INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS dni TEXT,
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Sync avatar_url to profile_picture_url if empty
UPDATE profiles 
SET profile_picture_url = avatar_url 
WHERE profile_picture_url IS NULL AND avatar_url IS NOT NULL;

-- 2. UPGRADE INSTITUTIONS TABLE
-- =============================
ALTER TABLE institutions 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS instagram TEXT,
ADD COLUMN IF NOT EXISTS weekly_schedule JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS date_overrides JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS allow_racket_rental BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS price_racket DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS allow_ball_rental BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS price_ball DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS config_match_duration_3_sets INTEGER DEFAULT 90,
ADD COLUMN IF NOT EXISTS config_match_duration_5_sets INTEGER DEFAULT 120,
ADD COLUMN IF NOT EXISTS config_booking_min_duration INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 3. UPGRADE TOURNAMENTS TABLE
-- ============================
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS competitions JSONB DEFAULT '[]', -- For multi-category support
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS champion_name TEXT,
ADD COLUMN IF NOT EXISTS previous_edition_id UUID REFERENCES tournaments(id);

-- 4. UPGRADE MATCHES TABLE
-- ========================
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS scheduling_status TEXT CHECK (scheduling_status IN ('proposed', 'confirmed', 'rejected', 'cancelled')),
ADD COLUMN IF NOT EXISTS proposal_data JSONB, -- For negotiation details
ADD COLUMN IF NOT EXISTS court_slot_id UUID; -- Will reference court_slots table

-- 5. UPGRADE TOURNAMENT PLAYERS
-- =============================
ALTER TABLE tournament_players
ADD COLUMN IF NOT EXISTS matches_played INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS matches_won INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sets_won INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fee_amount DECIMAL(10,2);

-- ==============================================================================
-- NEW TABLES
-- ==============================================================================

-- 6. COURT SLOTS (For fixed schedules)
CREATE TABLE IF NOT EXISTS court_slots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    court_name TEXT NOT NULL,
    day_of_week INTEGER NOT NULL, -- 0-6 (Sun-Sat)
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE court_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read slots" ON court_slots FOR SELECT USING (true);
CREATE POLICY "Admin manage slots" ON court_slots FOR ALL USING (auth.role() = 'authenticated'); -- Refine for admin only later

-- 7. BOOKINGS (Reservas)
CREATE TABLE IF NOT EXISTS bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    institution_id UUID REFERENCES institutions(id),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    court_name TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled', 'blocked')) DEFAULT 'pending',
    booking_type TEXT CHECK (booking_type IN ('guest', 'tournament', 'maintenance', 'class')) DEFAULT 'guest',
    title TEXT,
    description TEXT,
    total_price DECIMAL(10,2) DEFAULT 0,
    extras JSONB DEFAULT '{}',
    payment_status TEXT DEFAULT 'pending',
    match_id UUID REFERENCES matches(id), -- If linked to a tournament match
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own bookings" ON bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all bookings" ON bookings FOR SELECT USING (true); -- Needs role check refinement
CREATE POLICY "Users create bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 8. MESSAGES (Internal Messaging)
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES auth.users(id),
    receiver_id UUID REFERENCES auth.users(id),
    institution_id UUID REFERENCES institutions(id), -- Optional: context
    type TEXT CHECK (type IN ('direct', 'broadcast_admins', 'broadcast_institution')) DEFAULT 'direct',
    subject TEXT,
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own inbox" ON messages FOR SELECT USING (auth.uid() = receiver_id OR auth.uid() = sender_id);
CREATE POLICY "Users send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- 9. TRANSACTIONS (Caja)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id UUID REFERENCES institutions(id),
    date TIMESTAMPTZ DEFAULT NOW(),
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    type TEXT CHECK (type IN ('income', 'expense')),
    category TEXT,
    status TEXT DEFAULT 'completed',
    payment_method TEXT,
    user_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view transactions" ON transactions FOR SELECT USING (auth.role() = 'authenticated'); -- Needs role check

-- 10. RANKING HISTORY
CREATE TABLE IF NOT EXISTS ranking_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID REFERENCES auth.users(id),
    tournament_name TEXT,
    points INTEGER DEFAULT 0,
    date_obtained DATE DEFAULT CURRENT_DATE,
    category TEXT,
    year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE ranking_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view ranking history" ON ranking_history FOR SELECT USING (true);
