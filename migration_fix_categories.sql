-- ==============================================================================
-- FIX: Eliminar restricciones de categoría obsoletas (CHECK category IN ('A','B','C','OPEN'))
-- Permite categorías estándar: '1ra', '2da', '3ra', '4ta', '5ta', 'Open', etc.
-- ==============================================================================

-- 1. Tabla tournaments
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_category_check;

-- 2. Tabla profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_category_check;

-- 3. Tabla tournament_players (si existe)
ALTER TABLE tournament_players DROP CONSTRAINT IF EXISTS tournament_players_category_check;

-- 4. Tabla doubles_teams (si existe)
ALTER TABLE doubles_teams DROP CONSTRAINT IF EXISTS doubles_teams_category_check;

-- Recargar la configuración y caché de esquema de PostgREST
NOTIFY pgrst, 'reload config';
