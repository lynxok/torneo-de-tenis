-- ========================================================================
-- MIGRACIÓN INTEGRAL DE SINCRONIZACIÓN DE ESQUEMA - SMASH TENNIS MANAGER
-- Fecha: 2026-08-25
-- Descripción: Agrega todas las columnas requeridas por las nuevas funcionalidades
--              (confirmación 24h de marcadores, dobles, participantes de reservas,
--              historial de ranking y muro de matchmaking).
-- ========================================================================

-- 1. TABLA MATCHES (Marcadores, Confirmación 24h, Disputas, Dobles, Check Constraints)
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS score_status TEXT DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS score_submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS score_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS score_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS score_dispute_reason TEXT,
  ADD COLUMN IF NOT EXISTS winner_partner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS player1_partner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS player2_partner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS player1_partner_name TEXT,
  ADD COLUMN IF NOT EXISTS player2_partner_name TEXT;

-- Flexibilizar restricción de estados de agendamiento en matches
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_scheduling_status_check;
ALTER TABLE public.matches ADD CONSTRAINT matches_scheduling_status_check 
  CHECK (scheduling_status IN ('proposed', 'confirmed', 'cancelled', 'finished', 'completed', 'played') OR scheduling_status IS NULL);

-- 2. TABLA BOOKINGS (Participantes de reservas y borrado lógico)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS deleted_by_user BOOLEAN DEFAULT FALSE;

-- 3. TABLA RANKING_HISTORY (Motivo y referencia a torneo)
ALTER TABLE public.ranking_history
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL;

-- 4. TABLA TOURNAMENT_PLAYERS (Duplas de dobles y sustituciones)
ALTER TABLE public.tournament_players
  ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS partner_name TEXT,
  ADD COLUMN IF NOT EXISTS team_name TEXT,
  ADD COLUMN IF NOT EXISTS is_doubles_pair BOOLEAN DEFAULT FALSE;

-- 5. TABLA PROFILES (Fecha de nacimiento, WhatsApp, membresías)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS show_whatsapp BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_member BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS member_number TEXT,
  ADD COLUMN IF NOT EXISTS member_status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS memberships JSONB DEFAULT '[]'::jsonb;

-- 6. TABLA MATCHMAKING_POSTS (Muro de rivales y desafíos)
CREATE TABLE IF NOT EXISTS public.matchmaking_posts (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_lastname TEXT,
  user_phone TEXT,
  user_avatar TEXT,
  user_category TEXT,
  type TEXT DEFAULT 'singles',
  category TEXT DEFAULT '4ta',
  institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
  institution_name TEXT,
  date TEXT,
  time_slot TEXT,
  has_court_booked BOOLEAN DEFAULT FALSE,
  court_name TEXT,
  description TEXT,
  status TEXT DEFAULT 'open',
  matched_with_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  matched_with_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS en matchmaking_posts
ALTER TABLE public.matchmaking_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Matchmaking select policy" ON public.matchmaking_posts;
DROP POLICY IF EXISTS "Matchmaking insert policy" ON public.matchmaking_posts;
DROP POLICY IF EXISTS "Matchmaking update policy" ON public.matchmaking_posts;
DROP POLICY IF EXISTS "Matchmaking delete policy" ON public.matchmaking_posts;

CREATE POLICY "Matchmaking select policy" ON public.matchmaking_posts FOR SELECT USING (true);
CREATE POLICY "Matchmaking insert policy" ON public.matchmaking_posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Matchmaking update policy" ON public.matchmaking_posts FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Matchmaking delete policy" ON public.matchmaking_posts FOR DELETE USING (auth.role() = 'authenticated');

-- 7. RECARGAR CACHÉ DE POSTGREST
NOTIFY pgrst, 'reload config';
