-- ==============================================================================
-- SMASH TENNIS - HISTORIAS TEMPORALES (20 HORAS) ZERO-WASTE & RLS POLICIES
-- ==============================================================================

-- 1. Crear tabla de historias (stories)
CREATE TABLE IF NOT EXISTS public.stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    storage_path TEXT,
    layers JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now() + interval '20 hours') NOT NULL
);

-- Índices para búsqueda rápida y purga eficiente
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON public.stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON public.stories(user_id);

-- 2. Habilitar RLS (Row Level Security)
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- Política de lectura: Todos pueden ver historias activas
DROP POLICY IF EXISTS "Stories viewable by authenticated users" ON public.stories;
DROP POLICY IF EXISTS "Stories viewable by everyone" ON public.stories;
CREATE POLICY "Stories viewable by everyone" 
ON public.stories FOR SELECT 
TO authenticated, anon 
USING (expires_at > timezone('utc'::text, now()));

-- Política de inserción: Usuarios autenticados pueden publicar
DROP POLICY IF EXISTS "Stories insertable only by superadmin" ON public.stories;
DROP POLICY IF EXISTS "Stories insertable by authenticated users" ON public.stories;
CREATE POLICY "Stories insertable by authenticated users" 
ON public.stories FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Política de borrado: El autor o administradores
DROP POLICY IF EXISTS "Stories deletable by author or superadmin" ON public.stories;
DROP POLICY IF EXISTS "Stories deletable by author or admin" ON public.stories;
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

-- 3. Crear Bucket de Storage para Historias
INSERT INTO storage.buckets (id, name, public)
VALUES ('stories', 'stories', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 4. Políticas de Storage para el bucket 'stories'
DROP POLICY IF EXISTS "Stories public read" ON storage.objects;
DROP POLICY IF EXISTS "Stories public select policy" ON storage.objects;
CREATE POLICY "Stories public select policy" 
ON storage.objects FOR SELECT 
TO public, authenticated, anon 
USING (bucket_id = 'stories');

DROP POLICY IF EXISTS "Stories upload by superadmin" ON storage.objects;
DROP POLICY IF EXISTS "Stories upload policy" ON storage.objects;
CREATE POLICY "Stories upload policy" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'stories');

DROP POLICY IF EXISTS "Stories delete by superadmin" ON storage.objects;
DROP POLICY IF EXISTS "Stories delete policy" ON storage.objects;
CREATE POLICY "Stories delete policy" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'stories');

DROP POLICY IF EXISTS "Stories update policy" ON storage.objects;
CREATE POLICY "Stories update policy" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'stories');

-- 5. Función de auto-purga periódica de historias vencidas
CREATE OR REPLACE FUNCTION public.purge_expired_stories()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM public.stories
    WHERE expires_at <= timezone('utc'::text, now());
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$func$;
