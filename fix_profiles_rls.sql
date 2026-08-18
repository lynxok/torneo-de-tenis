-- ==============================================================================
-- FIX RLS: Permitir que SuperAdmin y Admin puedan actualizar perfiles de usuarios
-- ==============================================================================

-- 1. Eliminar política restrictiva anterior
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles updatable by user or superadmin" ON public.profiles;

-- 2. Crear política completa: el propio usuario O cualquier admin/superadmin
CREATE POLICY "Profiles updatable by user or superadmin" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (
    auth.uid() = id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role IN ('superadmin', 'admin')
    )
)
WITH CHECK (
    auth.uid() = id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role IN ('superadmin', 'admin')
    )
);
