
-- PERFORMANCE OPTIMIZATION: SMASH TENNIS MANAGER
-- This script adds indexes to columns frequently used in WHERE, JOIN, and ORDER BY clauses.

-- 1. PROFILES
CREATE INDEX IF NOT EXISTS idx_profiles_institution_id ON profiles(institution_id);
CREATE INDEX IF NOT EXISTS idx_profiles_dni ON profiles(dni);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);

-- 2. TOURNAMENTS
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_institution_id ON tournaments(institution_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_start_date ON tournaments(start_date DESC);

-- 3. TOURNAMENT PLAYERS
CREATE INDEX IF NOT EXISTS idx_tournament_players_tournament_id ON tournament_players(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_players_player_id ON tournament_players(player_id);

-- 4. MATCHES
CREATE INDEX IF NOT EXISTS idx_matches_tournament_id ON matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_player1_id ON matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_matches_player2_id ON matches(player2_id);
CREATE INDEX IF NOT EXISTS idx_matches_winner_id ON matches(winner_id);
CREATE INDEX IF NOT EXISTS idx_matches_group_number ON matches(group_number);

-- 5. BOOKINGS
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_institution_id ON bookings(institution_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_court_name ON bookings(court_name);

-- 6. MESSAGES
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- 7. TRANSACTIONS
CREATE INDEX IF NOT EXISTS idx_transactions_institution_id ON transactions(institution_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- 8. RANKING HISTORY
CREATE INDEX IF NOT EXISTS idx_ranking_history_player_id ON ranking_history(player_id);
CREATE INDEX IF NOT EXISTS idx_ranking_history_date_obtained ON ranking_history(date_obtained DESC);

-- REFRESH POSTGREST CONFIG
NOTIFY pgrst, 'reload config';
