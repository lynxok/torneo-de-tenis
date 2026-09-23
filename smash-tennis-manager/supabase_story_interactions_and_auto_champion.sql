-- ==============================================================================
-- SMASH TENNIS - HISTORIAS: REACCIONES, VISTAS Y PUBLICACIÓN DE CAMPEONES
-- ==============================================================================

-- 1. Tabla de Reacciones de Historias
CREATE TABLE IF NOT EXISTS public.story_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reaction TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(story_id, user_id)
);

-- 2. Tabla de Vistas de Historias
CREATE TABLE IF NOT EXISTS public.story_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(story_id, user_id)
);

-- 3. Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_story_reactions_story ON public.story_reactions(story_id);
CREATE INDEX IF NOT EXISTS idx_story_reactions_user ON public.story_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_story_views_story ON public.story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_user ON public.story_views(user_id);

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de Reacciones
DROP POLICY IF EXISTS "Story reactions viewable by everyone" ON public.story_reactions;
DROP POLICY IF EXISTS "Story reactions viewable by authenticated users" ON public.story_reactions;
CREATE POLICY "Story reactions viewable by authenticated users"
ON public.story_reactions FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Story reactions insertable by self" ON public.story_reactions;
CREATE POLICY "Story reactions insertable by self"
ON public.story_reactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Story reactions updateable by self" ON public.story_reactions;
CREATE POLICY "Story reactions updateable by self"
ON public.story_reactions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Story reactions deletable by self" ON public.story_reactions;
CREATE POLICY "Story reactions deletable by self"
ON public.story_reactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 6. Políticas de Vistas
DROP POLICY IF EXISTS "Story views viewable by everyone" ON public.story_views;
DROP POLICY IF EXISTS "Story views viewable by authenticated users" ON public.story_views;
CREATE POLICY "Story views viewable by authenticated users"
ON public.story_views FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Story views insertable by self" ON public.story_views;
CREATE POLICY "Story views insertable by self"
ON public.story_views FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
