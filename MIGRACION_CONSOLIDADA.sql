-- ==============================================================================
-- 🎾 ESQUEMA CONSOLIDADO COMPLETO: SMASH TENNIS
-- Execute this in the SQL Editor of your new Supabase project
-- Go to: https://supabase.com/dashboard > Your Project > SQL Editor
-- Click "New Query", paste this entire script and click "Run".
-- ==============================================================================

-- 1. INSTITUTIONS TABLE
CREATE TABLE IF NOT EXISTS institutions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    phone TEXT,
    logo_url TEXT,
    cover_url TEXT,
    maps_url TEXT,
    courts_clay INTEGER DEFAULT 0,
    courts_hard INTEGER DEFAULT 0,
    courts_indoor INTEGER DEFAULT 0,
    price_day DECIMAL(10,2) DEFAULT 0,
    price_night DECIMAL(10,2) DEFAULT 0,
    schedule_night_start TIME DEFAULT '18:00',
    courts_with_light INTEGER DEFAULT 0,
    courts_without_light INTEGER DEFAULT 0,
    hours_with_light TEXT,
    hours_without_light TEXT,
    description TEXT,
    email TEXT,
    instagram TEXT,
    weekly_schedule JSONB DEFAULT '[]',
    date_overrides JSONB DEFAULT '[]',
    amenities JSONB DEFAULT '[]',
    allow_racket_rental BOOLEAN DEFAULT FALSE,
    price_racket DECIMAL(10,2) DEFAULT 0,
    allow_ball_rental BOOLEAN DEFAULT FALSE,
    price_ball DECIMAL(10,2) DEFAULT 0,
    config_match_duration_3_sets INTEGER DEFAULT 90,
    config_match_duration_5_sets INTEGER DEFAULT 120,
    config_booking_min_duration INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT TRUE,
    city TEXT,
    province TEXT,
    country TEXT,
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    mp_access_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PROFILES TABLE (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    lastname TEXT,
    email TEXT,
    role TEXT CHECK (role IN ('superadmin', 'admin', 'player')) DEFAULT 'player',
    category TEXT CHECK (category IN ('A', 'B', 'C', 'OPEN')) DEFAULT 'C',
    institution_id UUID REFERENCES institutions(id),
    phone TEXT,
    dni TEXT,
    avatar_url TEXT,
    profile_picture_url TEXT,
    matches_won INTEGER DEFAULT 0,
    tournaments_won INTEGER DEFAULT 0,
    is_approved BOOLEAN DEFAULT FALSE,
    gender TEXT,
    city TEXT,
    province TEXT,
    country TEXT,
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TOURNAMENTS TABLE
CREATE TABLE IF NOT EXISTS tournaments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    start_date DATE,
    type TEXT CHECK (type IN ('singles', 'doubles')) DEFAULT 'singles',
    category TEXT CHECK (category IN ('A', 'B', 'C', 'OPEN')) DEFAULT 'OPEN',
    duration TEXT,
    registration_deadline TIMESTAMPTZ,
    registration_price DECIMAL(10,2) DEFAULT 0,
    institution_id UUID REFERENCES institutions(id),
    observations TEXT,
    rules JSONB DEFAULT '{}',
    groups JSONB DEFAULT '[]',
    bracket JSONB DEFAULT '[]',
    status TEXT CHECK (status IN ('draft', 'active', 'finished')) DEFAULT 'draft',
    competitions JSONB DEFAULT '[]', -- For multi-category support
    payment_link TEXT,
    tournament_gender TEXT DEFAULT 'mixto',
    image_url TEXT,
    champion_name TEXT,
    previous_edition_id UUID REFERENCES tournaments(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TOURNAMENT PLAYERS TABLE
CREATE TABLE IF NOT EXISTS tournament_players (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    player_id UUID REFERENCES auth.users(id),
    player_name TEXT NOT NULL,
    category TEXT,
    group_number INTEGER,
    paid BOOLEAN DEFAULT FALSE,
    payment_status TEXT DEFAULT 'pending',
    matches_played INTEGER DEFAULT 0,
    matches_won INTEGER DEFAULT 0,
    sets_won INTEGER DEFAULT 0,
    fee_amount DECIMAL(10,2),
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tournament_id, player_id)
);

-- 5. MATCHES TABLE
CREATE TABLE IF NOT EXISTS matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    group_number INTEGER,
    round TEXT,
    player1_id UUID,
    player1_name TEXT,
    player2_id UUID,
    player2_name TEXT,
    score JSONB,
    winner_id UUID,
    winner_name TEXT,
    played_at TIMESTAMPTZ,
    scheduling_status TEXT CHECK (scheduling_status IN ('proposed', 'confirmed', 'rejected', 'cancelled')),
    proposal_data JSONB, -- For negotiation details
    court_slot_id UUID, -- References court_slots table
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. DOUBLES TEAMS TABLE
CREATE TABLE IF NOT EXISTS doubles_teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    player1_id UUID REFERENCES auth.users(id),
    player1_name TEXT NOT NULL,
    player2_id UUID REFERENCES auth.users(id),
    player2_name TEXT,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. COURT SLOTS (For fixed schedules)
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

-- 8. BOOKINGS (Reservas)
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

-- 9. MESSAGES (Internal Messaging)
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES auth.users(id),
    receiver_id UUID REFERENCES auth.users(id),
    institution_id UUID REFERENCES institutions(id), -- Optional: context
    type TEXT CHECK (type IN ('direct', 'broadcast_admins', 'broadcast_institution')) DEFAULT 'direct',
    subject TEXT,
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    is_deleted_by_sender BOOLEAN DEFAULT FALSE,
    is_deleted_by_receiver BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TRANSACTIONS (Caja)
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

-- 11. RANKING HISTORY
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

-- 12. SYSTEM CONFIGURATION TABLE
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

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE doubles_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_history ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "Institutions viewable by everyone" ON institutions FOR SELECT USING (true);
CREATE POLICY "Institutions insertable by authenticated" ON institutions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Institutions updatable by authenticated" ON institutions FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Institutions deletable by authenticated" ON institutions FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Profiles viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Tournaments viewable by everyone" ON tournaments FOR SELECT USING (true);
CREATE POLICY "Tournaments insertable by authenticated" ON tournaments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Tournaments updatable by authenticated" ON tournaments FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Tournaments deletable by authenticated" ON tournaments FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Tournament players viewable by everyone" ON tournament_players FOR SELECT USING (true);
CREATE POLICY "Players can enroll themselves" ON tournament_players FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Players can update own enrollment" ON tournament_players FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can delete enrollments" ON tournament_players FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Matches viewable by everyone" ON matches FOR SELECT USING (true);
CREATE POLICY "Matches insertable by authenticated" ON matches FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Matches updatable by authenticated" ON matches FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Matches deletable by authenticated" ON matches FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Doubles teams viewable by everyone" ON doubles_teams FOR SELECT USING (true);
CREATE POLICY "Doubles teams insertable by authenticated" ON doubles_teams FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Doubles teams updatable by authenticated" ON doubles_teams FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Public read slots" ON court_slots FOR SELECT USING (true);
CREATE POLICY "Admin manage slots" ON court_slots FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Users view own bookings" ON bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all bookings" ON bookings FOR SELECT USING (true);
CREATE POLICY "Users create bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own inbox" ON messages FOR SELECT USING (auth.uid() = receiver_id OR auth.uid() = sender_id);
CREATE POLICY "Users send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Admins view transactions" ON transactions FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Public view ranking history" ON ranking_history FOR SELECT USING (true);

-- =====================================================
-- TRIGGER: Auto-create profile on user signup
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'player')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- RPC FUNCTIONS
-- =====================================================

-- 1. Increment matches_won
CREATE OR REPLACE FUNCTION increment_matches_won(userid UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET matches_won = matches_won + 1
  WHERE id = userid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Increment tournaments_won
CREATE OR REPLACE FUNCTION increment_tournaments_won(userid UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET tournaments_won = tournaments_won + 1
  WHERE id = userid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Financial Summary Aggregation
CREATE OR REPLACE FUNCTION get_financial_summary(
    institution_id UUID DEFAULT NULL,
    period_type TEXT DEFAULT 'month'
)
RETURNS JSON AS $$
DECLARE
    start_date TIMESTAMP;
    total_inc NUMERIC := 0;
    total_exp NUMERIC := 0;
    net_inc NUMERIC := 0;
    margin NUMERIC := 0;
    inc_bookings NUMERIC := 0;
    inc_tournaments NUMERIC := 0;
    inc_shop NUMERIC := 0;
    json_payment_methods JSON;
    json_revenue_sources JSON;
    json_chart_data JSON;
BEGIN
    IF period_type = 'day' THEN
        start_date := NOW() - INTERVAL '1 day';
    ELSIF period_type = 'week' THEN
        start_date := NOW() - INTERVAL '1 week';
    ELSE
        start_date := NOW() - INTERVAL '1 month';
    END IF;

    SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'income' AND category = 'booking' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'income' AND category = 'tournament_fee' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'income' AND category = 'shop' THEN amount ELSE 0 END), 0)
    INTO 
        total_inc, total_exp, inc_bookings, inc_tournaments, inc_shop
    FROM transactions
    WHERE date >= start_date
    AND (institution_id IS NULL OR transactions.institution_id = get_financial_summary.institution_id);

    net_inc := total_inc - total_exp;
    IF total_inc > 0 THEN
        margin := ROUND(((total_inc - total_exp) / total_inc) * 100);
    ELSE
        margin := 0;
    END IF;

    SELECT json_agg(t) INTO json_payment_methods FROM (
        SELECT 
            payment_method as name, 
            COALESCE(SUM(amount), 0) as value,
            CASE 
                WHEN payment_method = 'cash' THEN '#22c55e'
                WHEN payment_method = 'transfer' THEN '#3b82f6'
                WHEN payment_method = 'mercadopago' THEN '#009ee3'
                ELSE '#94a3b8'
            END as color
        FROM transactions
        WHERE date >= start_date
        AND type = 'income'
        AND (institution_id IS NULL OR transactions.institution_id = get_financial_summary.institution_id)
        GROUP BY payment_method
    ) t;

    json_revenue_sources := json_build_array(
        json_build_object('name', 'Alquiler Canchas', 'value', inc_bookings, 'color', '#38bdf8'),
        json_build_object('name', 'Inscripción Torneos', 'value', inc_tournaments, 'color', '#f59e0b'),
        json_build_object('name', 'Tienda', 'value', inc_shop, 'color', '#10b981')
    );
    
    SELECT json_agg(d) INTO json_chart_data FROM (
        SELECT 
            to_char(date, 'Dy') as day,
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
        FROM transactions
        WHERE date >= start_date
        AND (institution_id IS NULL OR transactions.institution_id = get_financial_summary.institution_id)
        GROUP BY to_char(date, 'Dy'), date::date
        ORDER BY date::date ASC
    ) d;

    RETURN json_build_object(
        'total_income', total_inc,
        'total_expenses', total_exp,
        'net_income', net_inc,
        'profit_margin', margin,
        'income_bookings', inc_bookings,
        'income_tournaments', inc_tournaments,
        'income_shop', inc_shop,
        'pending_income', 0,
        'occupancy_rate', 0,
        'payment_methods', COALESCE(json_payment_methods, '[]'::json),
        'revenue_sources', json_revenue_sources,
        'chart_data', COALESCE(json_chart_data, '[]'::json),
        'peak_hours', '[]'::json,
        'top_bookers', '[]'::json
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 13. ADDITIONAL SYSTEM TABLES
-- =====================================================

-- Table categories
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    level INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories viewable by everyone" ON categories FOR SELECT USING (true);
CREATE POLICY "Categories manageable by superadmin" ON categories FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'superadmin'
    )
);

-- Table match_messages
CREATE TABLE IF NOT EXISTS match_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id),
    recipient_id UUID REFERENCES auth.users(id),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE match_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own match messages" ON match_messages FOR SELECT USING (auth.uid() = recipient_id OR auth.uid() = sender_id);
CREATE POLICY "Users send match messages" ON match_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Insert default categories
INSERT INTO categories (name, level) VALUES
('1ra', 1),
('2da', 2),
('3ra', 3),
('4ta', 4),
('5ta', 5),
('6ta', 6),
('Seniors', 7),
('Damas', 8)
ON CONFLICT (name) DO NOTHING;

-- Reload config
NOTIFY pgrst, 'reload config';
