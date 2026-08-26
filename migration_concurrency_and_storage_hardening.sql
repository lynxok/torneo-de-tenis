-- ==============================================================================
-- 🎾 SMASH TENNIS - MIGRACIÓN DE CONCURRENCIA, STORAGE Y ANTI-SOLAPAMIENTO
-- Fecha: 2026-08-26
-- Objetivo:
--  1. Prevenir colisiones y reservas dobles simultáneas en canchas (Trigger Anti-Overlap)
--  2. Blindar políticas RLS de Supabase Storage para los buckets avatars, stories y assets
-- ==============================================================================

-- 0. ASEGURAR COLUMNA deleted_by_user EN BOOKINGS
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS deleted_by_user BOOLEAN DEFAULT FALSE;

-- ==============================================================================
-- 1. TRIGGER ANTI-SOLAPAMIENTO Y DOBLE RESERVA DE CANCHAS (CONCURRENCY LOCK)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.check_booking_overlap()
RETURNS TRIGGER AS $$
BEGIN
    -- Ignorar reservas que están canceladas, rechazadas o eliminadas
    IF NEW.status IN ('cancelled', 'rejected') OR COALESCE(NEW.deleted_by_user, FALSE) = TRUE THEN
        RETURN NEW;
    END IF;

    -- Validar si ya existe otra reserva activa que se superponga en la misma cancha y fecha
    IF EXISTS (
        SELECT 1 FROM public.bookings
        WHERE institution_id = NEW.institution_id
          AND court_name = NEW.court_name
          AND date = NEW.date
          AND id != COALESCE(NEW.id, '00000000-0000-00-0000-000000000000'::uuid)
          AND (status IS NULL OR status NOT IN ('cancelled', 'rejected'))
          AND COALESCE(deleted_by_user, FALSE) = FALSE
          AND (
              -- Condición de solapamiento de intervalos de tiempo:
              (NEW.start_time < end_time AND NEW.end_time > start_time)
          )
    ) THEN
        RAISE EXCEPTION 'La cancha % ya se encuentra reservada u ocupada en ese horario (% a %).', 
            NEW.court_name, 
            to_char(NEW.start_time, 'HH24:MI'), 
            to_char(NEW.end_time, 'HH24:MI');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_booking_overlap ON public.bookings;
CREATE TRIGGER trg_check_booking_overlap
    BEFORE INSERT OR UPDATE
    ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.check_booking_overlap();


-- ==============================================================================
-- 2. BLINDAJE DE POLÍTICAS EN STORAGE (BUCKETS AVATARS, STORIES Y ASSETS)
-- ==============================================================================

-- BUCKET AVATARS: Lectura pública, subida y edición para autenticados
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Avatars Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Avatars Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Avatars Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Avatars Authenticated Delete" ON storage.objects;

CREATE POLICY "Avatars Public Read" ON storage.objects
    FOR SELECT TO public, authenticated, anon USING (bucket_id = 'avatars');

CREATE POLICY "Avatars Authenticated Upload" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Avatars Authenticated Update" ON storage.objects
    FOR UPDATE TO authenticated USING (bucket_id = 'avatars');

CREATE POLICY "Avatars Authenticated Delete" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'avatars');


-- BUCKET STORIES: Solo el autor o administradores pueden borrar
INSERT INTO storage.buckets (id, name, public)
VALUES ('stories', 'stories', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Stories public read" ON storage.objects;
DROP POLICY IF EXISTS "Stories public select policy" ON storage.objects;
DROP POLICY IF EXISTS "Stories upload policy" ON storage.objects;
DROP POLICY IF EXISTS "Stories delete policy" ON storage.objects;
DROP POLICY IF EXISTS "Stories update policy" ON storage.objects;

CREATE POLICY "Stories public select policy" ON storage.objects
    FOR SELECT TO public, authenticated, anon USING (bucket_id = 'stories');

CREATE POLICY "Stories upload policy" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'stories');

CREATE POLICY "Stories delete policy" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'stories' AND (
            owner = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE profiles.id = auth.uid() AND profiles.role IN ('superadmin', 'admin')
            )
        )
    );

CREATE POLICY "Stories update policy" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'stories' AND (
            owner = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE profiles.id = auth.uid() AND profiles.role IN ('superadmin', 'admin')
            )
        )
    );


-- BUCKET ASSETS: Solo SuperAdmin puede subir o borrar banners del sistema
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Access Assets" ON storage.objects;
DROP POLICY IF EXISTS "Superadmin Write Assets" ON storage.objects;
DROP POLICY IF EXISTS "Superadmin Update Assets" ON storage.objects;
DROP POLICY IF EXISTS "Superadmin Delete Assets" ON storage.objects;

CREATE POLICY "Public Access Assets" ON storage.objects
    FOR SELECT TO public, authenticated, anon USING (bucket_id = 'assets');

CREATE POLICY "Superadmin Write Assets" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'assets' AND
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'superadmin')
    );

CREATE POLICY "Superadmin Update Assets" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'assets' AND
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'superadmin')
    );

CREATE POLICY "Superadmin Delete Assets" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'assets' AND
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'superadmin')
    );

NOTIFY pgrst, 'reload config';
