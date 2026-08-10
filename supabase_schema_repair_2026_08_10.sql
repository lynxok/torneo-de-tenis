-- Smash Tennis schema repair - 2026-08-10
-- Non-destructive patch: only creates missing tables/functions and adds missing columns.
-- Run this in Supabase Dashboard > SQL Editor for project xlipzxmjpliwifckwkvh.

-- Institutions: columns referenced by the vanilla and React apps.
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS courts_total INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS config_max_booking_slots INTEGER DEFAULT 4,
  ADD COLUMN IF NOT EXISTS schedule_open TEXT,
  ADD COLUMN IF NOT EXISTS schedule_close TEXT,
  ADD COLUMN IF NOT EXISTS payment_link TEXT,
  ADD COLUMN IF NOT EXISTS config_booking JSONB DEFAULT '{}'::jsonb;

-- Tournaments.
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'X',
  ADD COLUMN IF NOT EXISTS registration_closed BOOLEAN DEFAULT FALSE;

-- Tournament enrollments / standings.
ALTER TABLE public.tournament_players
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sets_lost INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS games_won INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS games_lost INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS members JSONB DEFAULT '[]'::jsonb;

-- Matches.
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_played BOOLEAN DEFAULT FALSE;

-- Bookings.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS match_score TEXT;

-- Messages.
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS sender_name TEXT,
  ADD COLUMN IF NOT EXISTS deleted_by_receiver BOOLEAN DEFAULT FALSE;

-- Ranking point defense helpers.
ALTER TABLE public.ranking_history
  ADD COLUMN IF NOT EXISTS next_edition_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS next_edition_name TEXT;

-- Legacy system_config compatibility.
ALTER TABLE public.system_config
  ADD COLUMN IF NOT EXISTS profile_banner_url TEXT DEFAULT '/profile-banner.jpg';

-- React app settings table.
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System settings viewable by authenticated users" ON public.system_settings;
CREATE POLICY "System settings viewable by authenticated users"
ON public.system_settings FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "System settings manageable by superadmin" ON public.system_settings;
CREATE POLICY "System settings manageable by superadmin"
ON public.system_settings FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
  )
);

INSERT INTO public.system_settings (key, value)
VALUES
  ('profile_banner_url', to_jsonb('/profile-banner.jpg'::text)),
  ('google_drive_enabled', to_jsonb(false)),
  ('google_client_id', to_jsonb(''::text)),
  ('google_api_key', to_jsonb(''::text)),
  ('target_folder_id', to_jsonb(''::text)),
  ('service_account_email', to_jsonb(''::text)),
  ('welcome_message', to_jsonb('Bienvenido a la comunidad de Smash Tennis!'::text))
ON CONFLICT (key) DO NOTHING;

-- Categories compatibility.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

UPDATE public.categories
SET display_order = COALESCE(display_order, level, 0),
    is_active = COALESCE(is_active, TRUE);

-- Audit log table used by the vanilla app.
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Audit logs readable by superadmin" ON public.audit_logs;
CREATE POLICY "Audit logs readable by superadmin"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
  )
);

DROP POLICY IF EXISTS "Audit logs insertable by authenticated users" ON public.audit_logs;
CREATE POLICY "Audit logs insertable by authenticated users"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- RPCs referenced by older app code.
CREATE OR REPLACE FUNCTION public.increment_matches_won(userid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET matches_won = COALESCE(matches_won, 0) + 1
  WHERE id = userid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_tournaments_won(userid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET tournaments_won = COALESCE(tournaments_won, 0) + 1
  WHERE id = userid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_financial_summary(
  p_institution_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_income', COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
    'total_expenses', COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0),
    'net_income', COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0),
    'income_bookings', COALESCE(SUM(CASE WHEN type = 'income' AND category = 'booking' THEN amount ELSE 0 END), 0),
    'income_tournaments', COALESCE(SUM(CASE WHEN type = 'income' AND category = 'tournament_fee' THEN amount ELSE 0 END), 0)
  )
  INTO result
  FROM public.transactions
  WHERE (p_institution_id IS NULL OR institution_id = p_institution_id)
    AND (p_start_date IS NULL OR date::date >= p_start_date)
    AND (p_end_date IS NULL OR date::date <= p_end_date);

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
