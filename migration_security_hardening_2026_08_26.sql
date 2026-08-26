-- ==============================================================================
-- 🎾 SMASH TENNIS - MIGRACIÓN CONSOLIDADA DE BLINDAJE DE SEGURIDAD
-- Fecha: 2026-08-26
-- Objetivo: Blindar RLS, triggers anti-escalamiento de privilegios y RPCs
-- ==============================================================================

-- 1. TRIGGER ANTI-ESCALAMIENTO DE PRIVILEGIOS EN PROFILES
-- Protege campos críticos (role, is_approved, matches_won, tournaments_won)
-- para que solo SuperAdmin pueda modificarlos.
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER AS $$
DECLARE
    caller_role TEXT;
BEGIN
    -- Obtener el rol del usuario autenticado en la sesión
    SELECT role INTO caller_role 
    FROM public.profiles 
    WHERE id = auth.uid();

    -- Si quien ejecuta no es SuperAdmin, revertir cualquier intento de cambio en campos protegidos
    IF caller_role IS NULL OR caller_role != 'superadmin' THEN
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
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_fields
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_fields();


-- 2. POLÍTICAS RLS PARA PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles updatable by user or superadmin" ON public.profiles;
DROP POLICY IF EXISTS "SuperAdmin can delete profiles" ON public.profiles;

CREATE POLICY "Profiles viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

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

CREATE POLICY "SuperAdmin can delete profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'superadmin'
    )
);


-- 3. POLÍTICAS RLS PARA TORNEOS (TOURNAMENTS)
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tournaments viewable by everyone" ON public.tournaments;
DROP POLICY IF EXISTS "Tournaments insertable by authenticated" ON public.tournaments;
DROP POLICY IF EXISTS "Tournaments updatable by authenticated" ON public.tournaments;
DROP POLICY IF EXISTS "Tournaments deletable by authenticated" ON public.tournaments;
DROP POLICY IF EXISTS "Tournaments manageable by admin or superadmin" ON public.tournaments;

CREATE POLICY "Tournaments viewable by everyone" 
ON public.tournaments FOR SELECT 
USING (true);

CREATE POLICY "Tournaments manageable by admin or superadmin" 
ON public.tournaments FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND (
            profiles.role = 'superadmin' OR 
            (profiles.role = 'admin' AND profiles.institution_id = tournaments.institution_id)
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND (
            profiles.role = 'superadmin' OR 
            (profiles.role = 'admin' AND profiles.institution_id = tournaments.institution_id)
        )
    )
);


-- 4. POLÍTICAS RLS PARA PARTIDOS (MATCHES)
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Matches viewable by everyone" ON public.matches;
DROP POLICY IF EXISTS "Matches insertable by authenticated" ON public.matches;
DROP POLICY IF EXISTS "Matches updatable by authenticated" ON public.matches;
DROP POLICY IF EXISTS "Matches deletable by authenticated" ON public.matches;
DROP POLICY IF EXISTS "Matches updatable by participants or admins" ON public.matches;
DROP POLICY IF EXISTS "Matches manageable by admins" ON public.matches;

CREATE POLICY "Matches viewable by everyone" 
ON public.matches FOR SELECT 
USING (true);

CREATE POLICY "Matches updatable by participants or admins" 
ON public.matches FOR UPDATE 
TO authenticated
USING (
    auth.uid() = player1_id OR 
    auth.uid() = player2_id OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.tournaments t ON t.id = matches.tournament_id
        WHERE p.id = auth.uid() 
        AND (p.role = 'superadmin' OR (p.role = 'admin' AND p.institution_id = t.institution_id))
    )
)
WITH CHECK (
    auth.uid() = player1_id OR 
    auth.uid() = player2_id OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.tournaments t ON t.id = matches.tournament_id
        WHERE p.id = auth.uid() 
        AND (p.role = 'superadmin' OR (p.role = 'admin' AND p.institution_id = t.institution_id))
    )
);

CREATE POLICY "Matches insert and delete by admins" 
ON public.matches FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.tournaments t ON t.id = matches.tournament_id
        WHERE p.id = auth.uid() 
        AND (p.role = 'superadmin' OR (p.role = 'admin' AND p.institution_id = t.institution_id))
    )
);


-- 5. POLÍTICAS RLS PARA INSCRIPTOS (TOURNAMENT_PLAYERS)
ALTER TABLE public.tournament_players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tournament players viewable by everyone" ON public.tournament_players;
DROP POLICY IF EXISTS "Players can enroll themselves" ON public.tournament_players;
DROP POLICY IF EXISTS "Players can update own enrollment" ON public.tournament_players;
DROP POLICY IF EXISTS "Admins can delete enrollments" ON public.tournament_players;
DROP POLICY IF EXISTS "Tournament players insert policy" ON public.tournament_players;
DROP POLICY IF EXISTS "Tournament players update policy" ON public.tournament_players;
DROP POLICY IF EXISTS "Tournament players delete policy" ON public.tournament_players;

CREATE POLICY "Tournament players viewable by everyone" 
ON public.tournament_players FOR SELECT 
USING (true);

CREATE POLICY "Tournament players insert policy" 
ON public.tournament_players FOR INSERT 
TO authenticated
WITH CHECK (
    auth.uid() = player_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.tournaments t ON t.id = tournament_players.tournament_id
        WHERE p.id = auth.uid() 
        AND (p.role = 'superadmin' OR (p.role = 'admin' AND p.institution_id = t.institution_id))
    )
);

CREATE POLICY "Tournament players update policy" 
ON public.tournament_players FOR UPDATE 
TO authenticated
USING (
    auth.uid() = player_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.tournaments t ON t.id = tournament_players.tournament_id
        WHERE p.id = auth.uid() 
        AND (p.role = 'superadmin' OR (p.role = 'admin' AND p.institution_id = t.institution_id))
    )
);

CREATE POLICY "Tournament players delete policy" 
ON public.tournament_players FOR DELETE 
TO authenticated
USING (
    auth.uid() = player_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.tournaments t ON t.id = tournament_players.tournament_id
        WHERE p.id = auth.uid() 
        AND (p.role = 'superadmin' OR (p.role = 'admin' AND p.institution_id = t.institution_id))
    )
);


-- 6. POLÍTICAS RLS PARA RESERVAS (BOOKINGS)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Bookings select policy" ON public.bookings;
DROP POLICY IF EXISTS "Bookings insert policy" ON public.bookings;
DROP POLICY IF EXISTS "Bookings update policy" ON public.bookings;
DROP POLICY IF EXISTS "Bookings delete policy" ON public.bookings;

CREATE POLICY "Bookings select policy" 
ON public.bookings FOR SELECT 
USING (true);

CREATE POLICY "Bookings insert policy" 
ON public.bookings FOR INSERT 
TO authenticated 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superadmin')
    )
);

CREATE POLICY "Bookings update policy" 
ON public.bookings FOR UPDATE 
TO authenticated 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'superadmin' OR (profiles.role = 'admin' AND profiles.institution_id = bookings.institution_id))
    )
);

CREATE POLICY "Bookings delete policy" 
ON public.bookings FOR DELETE 
TO authenticated 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'superadmin' OR (profiles.role = 'admin' AND profiles.institution_id = bookings.institution_id))
    )
);


-- 7. POLÍTICAS RLS PARA INSTITUCIONES (INSTITUTIONS)
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Institutions viewable by everyone" ON public.institutions;
DROP POLICY IF EXISTS "Institutions insertable by authenticated" ON public.institutions;
DROP POLICY IF EXISTS "Institutions updatable by authenticated" ON public.institutions;
DROP POLICY IF EXISTS "Institutions deletable by authenticated" ON public.institutions;
DROP POLICY IF EXISTS "Institutions manageable by superadmin or club admin" ON public.institutions;

CREATE POLICY "Institutions viewable by everyone" 
ON public.institutions FOR SELECT 
USING (true);

CREATE POLICY "Institutions manageable by superadmin or club admin" 
ON public.institutions FOR UPDATE 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'superadmin' OR (profiles.role = 'admin' AND profiles.institution_id = institutions.id))
    )
);

CREATE POLICY "Institutions insertable and deletable only by superadmin" 
ON public.institutions FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'superadmin'
    )
);


-- 8. POLÍTICAS RLS PARA CAJA Y TRANSACCIONES (TRANSACTIONS)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Transactions viewable only by admins" ON public.transactions;
DROP POLICY IF EXISTS "Transactions manageable only by admins" ON public.transactions;

CREATE POLICY "Transactions viewable only by admins" 
ON public.transactions FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND (
            profiles.role = 'superadmin' OR 
            (profiles.role = 'admin' AND profiles.institution_id = transactions.institution_id)
        )
    )
);

CREATE POLICY "Transactions manageable only by admins" 
ON public.transactions FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND (
            profiles.role = 'superadmin' OR 
            (profiles.role = 'admin' AND profiles.institution_id = transactions.institution_id)
        )
    )
);


-- 9. RPC SEGURA PARA CAMBIO DE CONTRASEÑA POR SUPERADMIN
CREATE OR REPLACE FUNCTION public.admin_update_user_password(
    target_user_id UUID,
    new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    caller_role TEXT;
BEGIN
    SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
    IF caller_role != 'superadmin' THEN
        RAISE EXCEPTION 'Acceso denegado: Solo SuperAdmin puede cambiar contraseñas de otros usuarios.';
    END IF;

    IF length(new_password) < 6 THEN
        RAISE EXCEPTION 'La contraseña debe tener al menos 6 caracteres.';
    END IF;

    UPDATE auth.users
    SET encrypted_password = crypt(new_password, gen_salt('bf')),
        updated_at = NOW()
    WHERE id = target_user_id;

    RETURN jsonb_build_object('success', true, 'updated_user_id', target_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_user_password(UUID, TEXT) TO authenticated;


-- 10. RECARGA DE CACHÉ DE POSTGREST
NOTIFY pgrst, 'reload config';
