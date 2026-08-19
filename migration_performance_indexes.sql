-- ==============================================================================
-- OPTIMIZACIÓN DE RENDIMIENTO: ÍNDICES POSTGRESQL PARA SMASH TENNIS MANAGER
-- ==============================================================================
-- Este script crea índices optimizados para acelerar las consultas de torneos,
-- partidos, reservas, rankings y perfiles, reduciendo latencias en producción.

-- 1. MATCHES (Partidos, H2H y Fixtures)
CREATE INDEX IF NOT EXISTS idx_matches_tournament_group ON matches(tournament_id, group_number);
CREATE INDEX IF NOT EXISTS idx_matches_tournament_round ON matches(tournament_id, round);
CREATE INDEX IF NOT EXISTS idx_matches_player1_created ON matches(player1_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_player2_created ON matches(player2_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_winner_id ON matches(winner_id);
CREATE INDEX IF NOT EXISTS idx_matches_score_status ON matches(score_status);

-- 2. BOOKINGS (Reservas de Canchas y Cierre por Lluvia)
CREATE INDEX IF NOT EXISTS idx_bookings_inst_date ON bookings(institution_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_user_date ON bookings(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_court_lookup ON bookings(institution_id, date, court_name);

-- 3. TOURNAMENTS & INSCRIOTOS
CREATE INDEX IF NOT EXISTS idx_tournaments_status_start ON tournaments(status, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_tournaments_institution ON tournaments(institution_id);
CREATE INDEX IF NOT EXISTS idx_tournament_players_tourney ON tournament_players(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_players_player ON tournament_players(player_id);
CREATE INDEX IF NOT EXISTS idx_tournament_players_partner ON tournament_players(partner_id);

-- 4. PROFILES & RANKINGS
CREATE INDEX IF NOT EXISTS idx_profiles_institution_cat ON profiles(institution_id, category);
CREATE INDEX IF NOT EXISTS idx_profiles_approved ON profiles(is_approved);
CREATE INDEX IF NOT EXISTS idx_ranking_history_player_date ON ranking_history(player_id, date_obtained DESC);
CREATE INDEX IF NOT EXISTS idx_ranking_history_tourney ON ranking_history(tournament_id);

-- 5. MESSAGES & TRANSACTIONS
CREATE INDEX IF NOT EXISTS idx_messages_receiver_read ON messages(receiver_id, is_read);
CREATE INDEX IF NOT EXISTS idx_transactions_inst_date ON transactions(institution_id, date DESC);

-- Notificar recarga de schema cache
NOTIFY pgrst, 'reload config';
