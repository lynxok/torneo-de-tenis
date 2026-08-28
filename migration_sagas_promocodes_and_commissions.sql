-- ====================================================================
-- MIGRATION: SAGAS DE TORNEOS, CÓDIGOS PROMOCIONALES, TRIAL Y COMISIONES
-- Smash Tennis Manager v1.5.0
-- ====================================================================

-- 1. Tabla de Códigos Promocionales
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    free_tournaments_count INT DEFAULT 2,
    max_uses INT DEFAULT NULL,
    current_uses INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ DEFAULT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS en promo_codes
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Políticas de promo_codes
DROP POLICY IF EXISTS "Public can view active promo codes for validation" ON public.promo_codes;
CREATE POLICY "Public can view active promo codes for validation" 
ON public.promo_codes FOR SELECT 
TO authenticated, anon
USING (is_active = true);

DROP POLICY IF EXISTS "Superadmin full access to promo_codes" ON public.promo_codes;
CREATE POLICY "Superadmin full access to promo_codes" 
ON public.promo_codes FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'superadmin'
    )
);

-- 2. Tabla de Sagas / Series de Torneos
CREATE TABLE IF NOT EXISTS public.tournament_sagas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    current_tier TEXT DEFAULT 'challenger', -- challenger, 250, 500, 1000, masters
    total_editions INT DEFAULT 0,
    last_edition_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS en tournament_sagas
ALTER TABLE public.tournament_sagas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read tournament_sagas" ON public.tournament_sagas;
CREATE POLICY "Public can read tournament_sagas" 
ON public.tournament_sagas FOR SELECT 
TO authenticated, anon 
USING (true);

DROP POLICY IF EXISTS "Admins and Superadmin can manage tournament_sagas" ON public.tournament_sagas;
CREATE POLICY "Admins and Superadmin can manage tournament_sagas" 
ON public.tournament_sagas FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND (
            profiles.role = 'superadmin' OR 
            (profiles.role IN ('admin', 'coordinator', 'professor') AND profiles.institution_id = tournament_sagas.institution_id)
        )
    )
);

-- 3. Ampliación de la tabla profiles (Membresías y Free Trial)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS promo_code_used TEXT,
ADD COLUMN IF NOT EXISTS free_tournaments_remaining INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS free_tournaments_disputed INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS membership_type TEXT DEFAULT 'standard', -- standard, trial, vip_time_limited, vip_permanent
ADD COLUMN IF NOT EXISTS membership_expires_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_membership_active BOOLEAN DEFAULT false;

-- 4. Ampliación de la tabla tournaments (Saga, Disputa y Comisiones)
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS saga_id UUID REFERENCES public.tournament_sagas(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS edition_number INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS tier_applied TEXT DEFAULT 'challenger',
ADD COLUMN IF NOT EXISTS is_direct_jump BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS commission_rate_applied NUMERIC DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS is_trial_free BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_disputed BOOLEAN DEFAULT false;

-- 5. Ampliación de la tabla institutions (Membresías VIP y Free Trial por Club)
ALTER TABLE public.institutions
ADD COLUMN IF NOT EXISTS promo_code_used TEXT,
ADD COLUMN IF NOT EXISTS free_tournaments_remaining INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS free_tournaments_disputed INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS membership_type TEXT DEFAULT 'none', -- none, vip_time_limited, vip_permanent
ADD COLUMN IF NOT EXISTS membership_expires_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_membership_active BOOLEAN DEFAULT false;

-- Recargar caché de PostgREST
NOTIFY pgrst, 'reload config';
