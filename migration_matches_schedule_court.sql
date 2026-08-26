-- ========================================================================
-- MIGRACIÓN: PROGRAMACIÓN DE FECHA, HORARIO Y CANCHA EN MATCHES
-- Fecha: 2026-08-26
-- Descripción: Agrega y asegura las columnas scheduled_at y court_name en
--              la tabla public.matches para la programación de partidos por
--              el organizador del torneo.
-- ========================================================================

-- 1. Asegurar columnas de agendamiento en public.matches
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS court_name TEXT,
  ADD COLUMN IF NOT EXISTS court_slot_id TEXT;

-- 2. Índice para acelerar búsquedas de partidos programados por torneo y fecha
CREATE INDEX IF NOT EXISTS idx_matches_tournament_scheduled 
  ON public.matches (tournament_id, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_matches_player_scheduled
  ON public.matches (player1_id, player2_id, scheduled_at);

-- 3. Asegurar columnas de vinculación de torneos en public.bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS match_id UUID,
  ADD COLUMN IF NOT EXISTS booking_type TEXT;

CREATE INDEX IF NOT EXISTS idx_bookings_match_id 
  ON public.bookings (match_id);

CREATE INDEX IF NOT EXISTS idx_bookings_institution_date_court 
  ON public.bookings (institution_id, date, court_name);

-- 4. Recargar caché de PostgREST
NOTIFY pgrst, 'reload config';
