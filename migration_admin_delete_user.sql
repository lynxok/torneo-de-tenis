-- ==============================================================================
-- MIGRACION: Permitir a SuperAdmin eliminar usuarios (Auth y Profiles)
-- ==============================================================================

-- 1. Permitir a SuperAdmin eliminar perfiles directamente con DELETE en public.profiles
DROP POLICY IF EXISTS "SuperAdmin can delete profiles" ON public.profiles;

CREATE POLICY "SuperAdmin can delete profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'superadmin'
    )
);

-- 2. Crear funcion RPC SECURITY DEFINER para eliminar usuario de profiles y auth.users
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    caller_role TEXT;
BEGIN
    SELECT role INTO caller_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF caller_role != 'superadmin' THEN
        RAISE EXCEPTION 'Acceso denegado: Solo SuperAdmin puede eliminar usuarios.';
    END IF;

    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'No puedes eliminar tu propia cuenta de SuperAdmin.';
    END IF;

    BEGIN
        DELETE FROM public.messages WHERE sender_id = target_user_id OR receiver_id = target_user_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        DELETE FROM public.notifications WHERE user_id = target_user_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    DELETE FROM public.profiles WHERE id = target_user_id;
    DELETE FROM auth.users WHERE id = target_user_id;

    RETURN jsonb_build_object('success', true, 'deleted_user_id', target_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;
NOTIFY pgrst, 'reload config';
