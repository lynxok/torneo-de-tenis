-- ==============================================================================
-- MIGRATION: DNI SUPPORT AND AUTOMATIC CLAIM FOR TOURNAMENT PLAYERS
-- ==============================================================================

-- 1. Agregar columna dni a tournament_players si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'tournament_players' 
          AND column_name = 'dni'
    ) THEN
        ALTER TABLE public.tournament_players ADD COLUMN dni TEXT;
    END IF;
END $$;

-- 2. Crear índice para optimizar búsquedas por DNI en inscripciones
CREATE INDEX IF NOT EXISTS idx_tournament_players_dni ON public.tournament_players (dni);
CREATE INDEX IF NOT EXISTS idx_profiles_dni ON public.profiles (dni);

-- 3. Función y Trigger: Cuando se registra o actualiza un perfil con DNI,
-- vincula automáticamente todas las inscripciones históricas o pendientes (player_id IS NULL).
CREATE OR REPLACE FUNCTION public.sync_tournament_player_on_profile_dni()
RETURNS TRIGGER AS $$
DECLARE
    cleaned_dni TEXT;
BEGIN
    -- Limpiar espacios o caracteres extra del DNI
    cleaned_dni := NULLIF(REGEXP_REPLACE(COALESCE(NEW.dni, ''), '\D', '', 'g'), '');

    IF cleaned_dni IS NOT NULL THEN
        -- Actualizar cualquier inscripción donde coincida el DNI y player_id sea NULL
        UPDATE public.tournament_players
        SET 
            player_id = NEW.id,
            -- Si el nombre estaba en mayúsculas o incompleto, podemos conservar o enriquecer
            player_name = COALESCE(NULLIF(TRIM(CONCAT(NEW.name, ' ', COALESCE(NEW.lastname, ''))), ''), player_name)
        WHERE 
            REGEXP_REPLACE(COALESCE(dni, ''), '\D', '', 'g') = cleaned_dni
            AND player_id IS NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear el trigger en profiles (INSERT o UPDATE de dni)
DROP TRIGGER IF EXISTS trg_sync_tournament_player_on_profile_dni ON public.profiles;

CREATE TRIGGER trg_sync_tournament_player_on_profile_dni
AFTER INSERT OR UPDATE OF dni, name, lastname ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_tournament_player_on_profile_dni();

-- 4. Función RPC para que organizadores o admins puedan actualizar el DNI de un jugador inscripto
CREATE OR REPLACE FUNCTION public.update_tournament_player_dni(
    p_tournament_player_id UUID,
    p_dni TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_clean_dni TEXT;
    v_matched_user_id UUID := NULL;
    v_user_name TEXT := NULL;
    v_res JSONB;
BEGIN
    v_clean_dni := NULLIF(REGEXP_REPLACE(COALESCE(p_dni, ''), '\D', '', 'g'), '');

    -- Si se proporcionó un DNI, chequear si ya pertenece a un usuario existente en profiles
    IF v_clean_dni IS NOT NULL THEN
        SELECT id, TRIM(CONCAT(name, ' ', COALESCE(lastname, '')))
        INTO v_matched_user_id, v_user_name
        FROM public.profiles
        WHERE REGEXP_REPLACE(COALESCE(dni, ''), '\D', '', 'g') = v_clean_dni
        LIMIT 1;
    END IF;

    -- Actualizar tournament_players
    UPDATE public.tournament_players
    SET 
        dni = v_clean_dni,
        player_id = COALESCE(v_matched_user_id, player_id),
        player_name = COALESCE(v_user_name, player_name)
    WHERE id = p_tournament_player_id;

    RETURN jsonb_build_object(
        'success', true,
        'dni', v_clean_dni,
        'matched_user_id', v_matched_user_id,
        'matched_name', v_user_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
