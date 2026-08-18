-- ==============================================================================
-- MIGRACIÓN: SISTEMA DINÁMICO DE CATEGORÍAS (1RA A 7MA, LETRAS A1-D2 Y EQUIVALENCIAS)
-- ==============================================================================

-- 1. Eliminar restricciones CHECK estáticas que bloqueaban la creación de torneos o categorías
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_category_check;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_category_check;
ALTER TABLE tournament_players DROP CONSTRAINT IF EXISTS tournament_players_category_check;
ALTER TABLE doubles_teams DROP CONSTRAINT IF EXISTS doubles_teams_category_check;

-- 2. Agregar columna category_system a la tabla institutions si no existe
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS category_system TEXT DEFAULT 'numeric';

-- 3. Recargar la configuración y caché de PostgREST en Supabase
NOTIFY pgrst, 'reload config';
