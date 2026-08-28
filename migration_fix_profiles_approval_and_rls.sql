-- ==============================================================================
-- 🎾 SMASH TENNIS - MIGRACIÓN DEFINITIVA: APROBACIÓN DE USUARIOS POR ORGANIZADORES
-- ==============================================================================

-- PASO 1: Eliminar trigger previo
DROP TRIGGER IF EXISTS trg_protect_profile_fields ON public.profiles;

-- PASO 2: Función de protección limpia y robusta
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
    current_user_role TEXT;
BEGIN
    -- Permitir si es llamada de sistema / service_role
    IF auth.uid() IS NULL THEN
        NEW.updated_at := NOW();
        RETURN NEW;
    END IF;

    -- Obtener rol del usuario autenticado
    SELECT role INTO current_user_role
    FROM public.profiles 
    WHERE id = auth.uid();

    -- Si es SuperAdmin, permitir todo
    IF current_user_role = 'superadmin' THEN
        NEW.updated_at := NOW();
        RETURN NEW;
    END IF;

    -- Si es Organizador (admin, coordinator, professor):
    -- Puede aprobar usuarios, modificar estados y categorías
    IF current_user_role IN ('admin', 'coordinator', 'professor') THEN
        -- No permitir ascender a superadmin
        IF NEW.role = 'superadmin' AND (OLD.role IS DISTINCT FROM 'superadmin') THEN
            NEW.role := OLD.role;
        END IF;

        -- No permitir modificar victorias manualmente
        IF NEW.matches_won IS DISTINCT FROM OLD.matches_won THEN
            NEW.matches_won := OLD.matches_won;
        END IF;
        IF NEW.tournaments_won IS DISTINCT FROM OLD.tournaments_won THEN
            NEW.tournaments_won := OLD.tournaments_won;
        END IF;

        NEW.updated_at := NOW();
        RETURN NEW;
    END IF;

    -- Si es jugador regular: revertir cambios en campos protegidos
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        NEW.role := OLD.role;
    END IF;
    IF NEW.is_approved IS DISTINCT FROM OLD.is_approved THEN
        NEW.is_approved := OLD.is_approved;
    END IF;
    IF NEW.matches_won IS DISTINCT FROM OLD.matches_won THEN
        NEW.matches_won := OLD.matches_won;
    END IF;
    IF NEW.tournaments_won IS DISTINCT FROM OLD.tournaments_won THEN
        NEW.tournaments_won := OLD.tournaments_won;
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

-- PASO 3: Vincular el trigger a la tabla profiles
CREATE TRIGGER trg_protect_profile_fields
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_fields();

-- PASO 4: Políticas RLS para perfiles
DROP POLICY IF EXISTS "Profiles updatable by user or superadmin" ON public.profiles;
DROP POLICY IF EXISTS "Profiles updatable by user or admin" ON public.profiles;

CREATE POLICY "Profiles updatable by user or admin" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (
    auth.uid() = id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role IN ('superadmin', 'admin', 'coordinator', 'professor')
    )
)
WITH CHECK (
    auth.uid() = id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role IN ('superadmin', 'admin', 'coordinator', 'professor')
    )
);

-- PASO 5: RPC de Aprobación Directa
CREATE OR REPLACE FUNCTION public.admin_approve_user(target_user_id UUID, assigned_category TEXT DEFAULT '4ta')
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
    op_role TEXT;
BEGIN
    IF auth.uid() IS NOT NULL THEN
        SELECT role INTO op_role FROM public.profiles WHERE id = auth.uid();
        IF op_role NOT IN ('superadmin', 'admin', 'coordinator', 'professor') THEN
            RAISE EXCEPTION 'No tienes permisos de organizador para aprobar usuarios.';
        END IF;
    END IF;

    UPDATE public.profiles
    SET 
        is_approved = TRUE,
        member_status = 'active',
        category = COALESCE(assigned_category, category, '4ta'),
        updated_at = NOW()
    WHERE id = target_user_id;

    RETURN jsonb_build_object('success', true, 'user_id', target_user_id);
END;
$$;

-- PASO 6: Aprobación inmediata de las 12 jugadoras de Tenis Parque España
UPDATE public.profiles
SET 
    is_approved = TRUE,
    member_status = 'active',
    updated_at = NOW()
WHERE 
    institution_id = '551f0161-f975-44f8-9fb0-9c15d7c3d7f1'
    AND is_approved = FALSE
    AND name NOT LIKE '%[Usuario Eliminado]%';
