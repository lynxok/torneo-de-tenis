-- ==============================================================================
-- 🎾 SMASH TENNIS - MIGRACIÓN: CORRECCIÓN DE APROBACIÓN DE USUARIOS POR ORGANIZADORES
-- Fecha: 2026-08-28
-- ==============================================================================

-- 1. ELIMINAR TRIGGER PREVIO
DROP TRIGGER IF EXISTS trg_protect_profile_fields ON public.profiles;

-- 2. CREAR FUNCIÓN TRIGGER DE PROTECCIÓN CON DELIMITADOR $func$
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $func$
DECLARE
    v_caller_role TEXT;
    v_caller_inst UUID;
BEGIN
    -- A. Si auth.uid() es NULL (llamadas con service_role / backend / scripts), permitir
    IF auth.uid() IS NULL THEN
        NEW.updated_at := NOW();
        RETURN NEW;
    END IF;

    -- B. Obtener rol e institución del usuario que ejecuta la acción
    SELECT role, institution_id INTO v_caller_role, v_caller_inst
    FROM public.profiles 
    WHERE id = auth.uid();

    -- C. Si es SuperAdmin, permitir todo
    IF v_caller_role = 'superadmin' THEN
        NEW.updated_at := NOW();
        RETURN NEW;
    END IF;

    -- D. Si es Organizador (admin, coordinator, professor):
    -- Puede aprobar usuarios, modificar estados y categorías de su club
    IF v_caller_role IN ('admin', 'coordinator', 'professor') THEN
        -- No puede auto-ascenderse a superadmin
        IF NEW.role = 'superadmin' AND (OLD.role IS DISTINCT FROM 'superadmin') THEN
            NEW.role := OLD.role;
        END IF;

        -- No puede alterar contadores de victorias manualmente
        IF NEW.matches_won IS DISTINCT FROM OLD.matches_won THEN
            NEW.matches_won := OLD.matches_won;
        END IF;
        IF NEW.tournaments_won IS DISTINCT FROM OLD.tournaments_won THEN
            NEW.tournaments_won := OLD.tournaments_won;
        END IF;

        NEW.updated_at := NOW();
        RETURN NEW;
    END IF;

    -- E. Si es un jugador común: revertir cambios en campos protegidos
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
$func$;

-- 3. RE-VINCULAR EL TRIGGER A LA TABLA PROFILES
CREATE TRIGGER trg_protect_profile_fields
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_fields();

-- 4. ACTUALIZAR POLÍTICAS RLS PARA PERMITIR QUE ADMINS DE CLUB EDITEN PERFILES
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

-- 5. FUNCIÓN RPC DE APROBACIÓN DIRECTA (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.admin_approve_user(target_user_id UUID, assigned_category TEXT DEFAULT '4ta')
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $rpc$
DECLARE
    v_caller_role TEXT;
BEGIN
    IF auth.uid() IS NOT NULL THEN
        SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
        IF v_caller_role NOT IN ('superadmin', 'admin', 'coordinator', 'professor') THEN
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
$rpc$;

-- 6. APROBAR INMEDIATAMENTE LAS SOLICITUDES PENDIENTES DEL CLUB TENIS PARQUE ESPAÑA
UPDATE public.profiles
SET 
    is_approved = TRUE,
    member_status = 'active',
    updated_at = NOW()
WHERE 
    institution_id = '551f0161-f975-44f8-9fb0-9c15d7c3d7f1'
    AND is_approved = FALSE
    AND name NOT LIKE '%[Usuario Eliminado]%';
