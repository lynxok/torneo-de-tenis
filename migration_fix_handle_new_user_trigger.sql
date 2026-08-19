-- =====================================================
-- FIX TRIGGER: Auto-create and populate full profile on user signup
-- =====================================================
-- Run this in Supabase SQL Editor to ensure all registration fields are populated directly in Postgres

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_institution_id UUID := NULL;
    v_raw_inst TEXT;
BEGIN
    v_raw_inst := NEW.raw_user_meta_data->>'institution_id';
    IF v_raw_inst IS NOT NULL AND v_raw_inst <> '' AND v_raw_inst <> 'none' THEN
        BEGIN
            v_institution_id := v_raw_inst::UUID;
        EXCEPTION WHEN OTHERS THEN
            v_institution_id := NULL;
        END;
    END IF;

    INSERT INTO public.profiles (
        id, 
        name, 
        lastname,
        email, 
        role,
        phone,
        dni,
        category,
        institution_id,
        is_approved
    )
    VALUES (
        NEW.id,
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''), split_part(NEW.email, '@', 1)),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'lastname'), ''),
        NEW.email,
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), ''), 'player'),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'dni'), ''),
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'category'), ''), '6ta'),
        v_institution_id,
        COALESCE((NEW.raw_user_meta_data->>'is_approved')::BOOLEAN, false)
    )
    ON CONFLICT (id) DO UPDATE SET
        name = COALESCE(NULLIF(EXCLUDED.name, ''), public.profiles.name),
        lastname = COALESCE(NULLIF(EXCLUDED.lastname, ''), public.profiles.lastname),
        phone = COALESCE(NULLIF(EXCLUDED.phone, ''), public.profiles.phone),
        dni = COALESCE(NULLIF(EXCLUDED.dni, ''), public.profiles.dni),
        category = CASE 
            WHEN EXCLUDED.category IS NOT NULL AND EXCLUDED.category <> 'C' THEN EXCLUDED.category 
            ELSE public.profiles.category 
        END,
        institution_id = COALESCE(EXCLUDED.institution_id, public.profiles.institution_id),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
