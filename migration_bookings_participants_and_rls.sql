-- Migration: Add participants and deleted_by_user to bookings table, and fix RLS policies
-- Execute in Supabase SQL Editor if needed

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS deleted_by_user BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS booking_type TEXT CHECK (booking_type IN ('guest', 'tournament', 'maintenance', 'class')) DEFAULT 'guest',
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS total_price DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extras JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS match_id UUID,
  ADD COLUMN IF NOT EXISTS match_score TEXT;

-- Ensure RLS is configured with full CRUD permissions for authenticated users and admins
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Bookings select policy" ON public.bookings;
DROP POLICY IF EXISTS "Bookings insert policy" ON public.bookings;
DROP POLICY IF EXISTS "Bookings update policy" ON public.bookings;
DROP POLICY IF EXISTS "Bookings delete policy" ON public.bookings;

CREATE POLICY "Bookings select policy" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Bookings insert policy" ON public.bookings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Bookings update policy" ON public.bookings FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Bookings delete policy" ON public.bookings FOR DELETE USING (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload config';
