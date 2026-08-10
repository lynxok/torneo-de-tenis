-- =====================================================
-- SUPABASE DATABASE SCHEMA FOR TENNIS TOURNAMENT MANAGER
-- =====================================================
-- Execute this in the SQL Editor of your Supabase project
-- Go to: https://supabase.com/dashboard > Your Project > SQL Editor
-- =====================================================

-- 1. INSTITUTIONS TABLE
CREATE TABLE IF NOT EXISTS institutions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    phone TEXT,
    maps_url TEXT,
    logo TEXT,
    payment_link TEXT,
    courts_with_light INTEGER DEFAULT 0,
    courts_without_light INTEGER DEFAULT 0,
    hours_with_light TEXT,
    hours_without_light TEXT,
    price_day DECIMAL(10,2) DEFAULT 0,
    price_night DECIMAL(10,2) DEFAULT 0,
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
    avatar_url TEXT,
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

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE doubles_teams ENABLE ROW LEVEL SECURITY;

-- INSTITUTIONS POLICIES
CREATE POLICY "Institutions viewable by everyone" ON institutions FOR SELECT USING (true);
CREATE POLICY "Institutions insertable by authenticated" ON institutions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Institutions updatable by authenticated" ON institutions FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Institutions deletable by authenticated" ON institutions FOR DELETE USING (auth.role() = 'authenticated');

-- PROFILES POLICIES
CREATE POLICY "Profiles viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- TOURNAMENTS POLICIES
CREATE POLICY "Tournaments viewable by everyone" ON tournaments FOR SELECT USING (true);
CREATE POLICY "Tournaments insertable by authenticated" ON tournaments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Tournaments updatable by authenticated" ON tournaments FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Tournaments deletable by authenticated" ON tournaments FOR DELETE USING (auth.role() = 'authenticated');

-- TOURNAMENT PLAYERS POLICIES
CREATE POLICY "Tournament players viewable by everyone" ON tournament_players FOR SELECT USING (true);
CREATE POLICY "Players can enroll themselves" ON tournament_players FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Players can update own enrollment" ON tournament_players FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can delete enrollments" ON tournament_players FOR DELETE USING (auth.role() = 'authenticated');

-- MATCHES POLICIES
CREATE POLICY "Matches viewable by everyone" ON matches FOR SELECT USING (true);
CREATE POLICY "Matches insertable by authenticated" ON matches FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Matches updatable by authenticated" ON matches FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Matches deletable by authenticated" ON matches FOR DELETE USING (auth.role() = 'authenticated');

-- DOUBLES TEAMS POLICIES
CREATE POLICY "Doubles teams viewable by everyone" ON doubles_teams FOR SELECT USING (true);
CREATE POLICY "Doubles teams insertable by authenticated" ON doubles_teams FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Doubles teams updatable by authenticated" ON doubles_teams FOR UPDATE USING (auth.role() = 'authenticated');

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

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- CREATE INITIAL SUPERADMIN
-- =====================================================
-- Note: You'll need to first sign up with email "admin@smash.com" 
-- through the app, then run this to make them superadmin:

-- UPDATE profiles SET role = 'superadmin' WHERE email = 'admin@smash.com';

-- =====================================================
-- DONE! Your database is ready.
-- =====================================================
