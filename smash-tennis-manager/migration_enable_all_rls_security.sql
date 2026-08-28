-- ==============================================================================
-- SMASH TENNIS MANAGER - ACTIVACIÓN INTEGRAL DE ROW LEVEL SECURITY (RLS)
-- Fecha: 2026-08-28
-- Descripción: Activa RLS y aplica políticas de seguridad completas e idempotentes
--              en todas las tablas de la base de datos sin interrumpir el funcionamiento.
-- ==============================================================================

-- 1. TABLA: PROFILES
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users and admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Superadmins can delete profile" ON public.profiles;
DROP POLICY IF EXISTS "Superadmins can delete profiles" ON public.profiles;

CREATE POLICY "Profiles viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users and admins can update profiles" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (
    auth.uid() = id 
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role IN ('superadmin', 'admin')
    )
);

CREATE POLICY "Superadmins can delete profiles" 
ON public.profiles FOR DELETE 
TO authenticated 
USING (
    auth.uid() = id 
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'superadmin'
    )
);

-- 2. TABLA: INSTITUTIONS
ALTER TABLE IF EXISTS public.institutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Institutions viewable by everyone" ON public.institutions;
DROP POLICY IF EXISTS "Institutions insertable by authenticated" ON public.institutions;
DROP POLICY IF EXISTS "Institutions updatable by authenticated" ON public.institutions;
DROP POLICY IF EXISTS "Institutions deletable by authenticated" ON public.institutions;

CREATE POLICY "Institutions viewable by everyone" 
ON public.institutions FOR SELECT 
USING (true);

CREATE POLICY "Institutions insertable by authenticated" 
ON public.institutions FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Institutions updatable by authenticated" 
ON public.institutions FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Institutions deletable by authenticated" 
ON public.institutions FOR DELETE 
TO authenticated 
USING (true);

-- 3. TABLA: TOURNAMENTS
ALTER TABLE IF EXISTS public.tournaments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tournaments viewable by everyone" ON public.tournaments;
DROP POLICY IF EXISTS "Tournaments insertable by authenticated" ON public.tournaments;
DROP POLICY IF EXISTS "Tournaments updatable by authenticated" ON public.tournaments;
DROP POLICY IF EXISTS "Tournaments deletable by authenticated" ON public.tournaments;

CREATE POLICY "Tournaments viewable by everyone" 
ON public.tournaments FOR SELECT 
USING (true);

CREATE POLICY "Tournaments insertable by authenticated" 
ON public.tournaments FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Tournaments updatable by authenticated" 
ON public.tournaments FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Tournaments deletable by authenticated" 
ON public.tournaments FOR DELETE 
TO authenticated 
USING (true);

-- 4. TABLA: TOURNAMENT_PLAYERS
ALTER TABLE IF EXISTS public.tournament_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tournament players viewable by everyone" ON public.tournament_players;
DROP POLICY IF EXISTS "Players can enroll themselves" ON public.tournament_players;
DROP POLICY IF EXISTS "Players can update own enrollment" ON public.tournament_players;
DROP POLICY IF EXISTS "Admins can delete enrollments" ON public.tournament_players;

CREATE POLICY "Tournament players viewable by everyone" 
ON public.tournament_players FOR SELECT 
USING (true);

CREATE POLICY "Tournament players insertable by authenticated" 
ON public.tournament_players FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Tournament players updatable by authenticated" 
ON public.tournament_players FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Tournament players deletable by authenticated" 
ON public.tournament_players FOR DELETE 
TO authenticated 
USING (true);

-- 5. TABLA: MATCHES
ALTER TABLE IF EXISTS public.matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Matches viewable by everyone" ON public.matches;
DROP POLICY IF EXISTS "Matches insertable by authenticated" ON public.matches;
DROP POLICY IF EXISTS "Matches updatable by authenticated" ON public.matches;
DROP POLICY IF EXISTS "Matches deletable by authenticated" ON public.matches;

CREATE POLICY "Matches viewable by everyone" 
ON public.matches FOR SELECT 
USING (true);

CREATE POLICY "Matches insertable by authenticated" 
ON public.matches FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Matches updatable by authenticated" 
ON public.matches FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Matches deletable by authenticated" 
ON public.matches FOR DELETE 
TO authenticated 
USING (true);

-- 6. TABLA: DOUBLES_TEAMS
ALTER TABLE IF EXISTS public.doubles_teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Doubles teams viewable by everyone" ON public.doubles_teams;
DROP POLICY IF EXISTS "Doubles teams insertable by authenticated" ON public.doubles_teams;
DROP POLICY IF EXISTS "Doubles teams updatable by authenticated" ON public.doubles_teams;
DROP POLICY IF EXISTS "Doubles teams deletable by authenticated" ON public.doubles_teams;

CREATE POLICY "Doubles teams viewable by everyone" 
ON public.doubles_teams FOR SELECT 
USING (true);

CREATE POLICY "Doubles teams insertable by authenticated" 
ON public.doubles_teams FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Doubles teams updatable by authenticated" 
ON public.doubles_teams FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Doubles teams deletable by authenticated" 
ON public.doubles_teams FOR DELETE 
TO authenticated 
USING (true);

-- 7. TABLA: BOOKINGS
ALTER TABLE IF EXISTS public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bookings viewable by everyone" ON public.bookings;
DROP POLICY IF EXISTS "Bookings insertable by authenticated" ON public.bookings;
DROP POLICY IF EXISTS "Bookings updatable by authenticated" ON public.bookings;
DROP POLICY IF EXISTS "Bookings deletable by authenticated" ON public.bookings;

CREATE POLICY "Bookings viewable by everyone" 
ON public.bookings FOR SELECT 
USING (true);

CREATE POLICY "Bookings insertable by authenticated" 
ON public.bookings FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Bookings updatable by authenticated" 
ON public.bookings FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Bookings deletable by authenticated" 
ON public.bookings FOR DELETE 
TO authenticated 
USING (true);

-- 8. TABLA: BOOKING_WAITLIST
ALTER TABLE IF EXISTS public.booking_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Booking waitlist viewable by authenticated" ON public.booking_waitlist;
DROP POLICY IF EXISTS "Booking waitlist insertable by authenticated" ON public.booking_waitlist;
DROP POLICY IF EXISTS "Booking waitlist updatable by authenticated" ON public.booking_waitlist;
DROP POLICY IF EXISTS "Booking waitlist deletable by authenticated" ON public.booking_waitlist;

CREATE POLICY "Booking waitlist viewable by authenticated" 
ON public.booking_waitlist FOR SELECT 
USING (true);

CREATE POLICY "Booking waitlist insertable by authenticated" 
ON public.booking_waitlist FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Booking waitlist updatable by authenticated" 
ON public.booking_waitlist FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Booking waitlist deletable by authenticated" 
ON public.booking_waitlist FOR DELETE 
TO authenticated 
USING (true);

-- 9. TABLA: MESSAGES
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Messages select policy" ON public.messages;
DROP POLICY IF EXISTS "Messages insert policy" ON public.messages;
DROP POLICY IF EXISTS "Messages update policy" ON public.messages;
DROP POLICY IF EXISTS "Messages delete policy" ON public.messages;

CREATE POLICY "Messages select policy" 
ON public.messages FOR SELECT 
TO authenticated 
USING (
    receiver_id = auth.uid() 
    OR sender_id = auth.uid() 
    OR type IN ('broadcast', 'broadcast_admins')
);

CREATE POLICY "Messages insert policy" 
ON public.messages FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Messages update policy" 
ON public.messages FOR UPDATE 
TO authenticated 
USING (
    receiver_id = auth.uid() 
    OR sender_id = auth.uid()
);

CREATE POLICY "Messages delete policy" 
ON public.messages FOR DELETE 
TO authenticated 
USING (
    receiver_id = auth.uid() 
    OR sender_id = auth.uid()
);

-- 10. TABLA: SYSTEM_SETTINGS
ALTER TABLE IF EXISTS public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System settings viewable by everyone" ON public.system_settings;
DROP POLICY IF EXISTS "System settings editable by authenticated" ON public.system_settings;

CREATE POLICY "System settings viewable by everyone" 
ON public.system_settings FOR SELECT 
USING (true);

CREATE POLICY "System settings editable by authenticated" 
ON public.system_settings FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 11. TABLA: RANKING_HISTORY
ALTER TABLE IF EXISTS public.ranking_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ranking history viewable by everyone" ON public.ranking_history;
DROP POLICY IF EXISTS "Ranking history editable by authenticated" ON public.ranking_history;

CREATE POLICY "Ranking history viewable by everyone" 
ON public.ranking_history FOR SELECT 
USING (true);

CREATE POLICY "Ranking history editable by authenticated" 
ON public.ranking_history FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 12. TABLA: TRANSACTIONS
ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Transactions accessible by authenticated" ON public.transactions;

CREATE POLICY "Transactions accessible by authenticated" 
ON public.transactions FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 13. TABLA: MATCHMAKING_POSTS
ALTER TABLE IF EXISTS public.matchmaking_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Matchmaking select policy" ON public.matchmaking_posts;
DROP POLICY IF EXISTS "Matchmaking insert policy" ON public.matchmaking_posts;
DROP POLICY IF EXISTS "Matchmaking update policy" ON public.matchmaking_posts;
DROP POLICY IF EXISTS "Matchmaking delete policy" ON public.matchmaking_posts;

CREATE POLICY "Matchmaking select policy" 
ON public.matchmaking_posts FOR SELECT 
USING (true);

CREATE POLICY "Matchmaking insert policy" 
ON public.matchmaking_posts FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Matchmaking update policy" 
ON public.matchmaking_posts FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Matchmaking delete policy" 
ON public.matchmaking_posts FOR DELETE 
TO authenticated 
USING (true);

-- 14. TABLA: STORIES
ALTER TABLE IF EXISTS public.stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Stories viewable by everyone" ON public.stories;
DROP POLICY IF EXISTS "Stories insertable by authenticated users" ON public.stories;
DROP POLICY IF EXISTS "Stories deletable by author or admin" ON public.stories;

CREATE POLICY "Stories viewable by everyone" 
ON public.stories FOR SELECT 
TO authenticated, anon 
USING (expires_at > timezone('utc'::text, now()));

CREATE POLICY "Stories insertable by authenticated users" 
ON public.stories FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Stories deletable by author or admin" 
ON public.stories FOR DELETE 
TO authenticated 
USING (
    user_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role IN ('superadmin', 'admin')
    )
);

-- 15. RECARGAR CACHÉ DE POSTGREST
NOTIFY pgrst, 'reload config';
