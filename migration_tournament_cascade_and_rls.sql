-- ==============================================================================
-- 🎾 SMASH TENNIS - MIGRACIÓN: PERMISOS DE ELIMINACIÓN DE TORNEOS Y CASCADA
-- Fecha: 2026-08-27
-- Objetivo: Garantizar columna created_by, RLS de eliminación y cascada referencial
-- ==============================================================================

-- 1. Asegurar columna created_by en tournaments
DO 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tournaments' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE public.tournaments ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;
END ;

-- 2. Asegurar ON DELETE CASCADE en tablas hijas
-- tournament_players
ALTER TABLE IF EXISTS public.tournament_players 
    DROP CONSTRAINT IF EXISTS tournament_players_tournament_id_fkey,
    ADD CONSTRAINT tournament_players_tournament_id_fkey 
    FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;

-- matches
ALTER TABLE IF EXISTS public.matches 
    DROP CONSTRAINT IF EXISTS matches_tournament_id_fkey,
    ADD CONSTRAINT matches_tournament_id_fkey 
    FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;

-- doubles_teams
ALTER TABLE IF EXISTS public.doubles_teams 
    DROP CONSTRAINT IF EXISTS doubles_teams_tournament_id_fkey,
    ADD CONSTRAINT doubles_teams_tournament_id_fkey 
    FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;

-- 3. Actualizar políticas RLS para tournaments
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tournaments manageable by admin or superadmin" ON public.tournaments;
DROP POLICY IF EXISTS "Tournaments deletable by admin, creator or superadmin" ON public.tournaments;

CREATE POLICY "Tournaments manageable by admin or superadmin" 
ON public.tournaments FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND (
            profiles.role = 'superadmin' OR 
            (profiles.role = 'admin' AND profiles.institution_id = tournaments.institution_id) OR
            tournaments.created_by = auth.uid()
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND (
            profiles.role = 'superadmin' OR 
            (profiles.role = 'admin' AND profiles.institution_id = tournaments.institution_id) OR
            tournaments.created_by = auth.uid()
        )
    )
);

-- Recargar caché de PostgREST
NOTIFY pgrst, 'reload config';
