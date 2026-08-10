-- Create system_settings table for global configuration
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read settings (e.g., banner url)
CREATE POLICY "Everyone can read system settings" ON public.system_settings
    FOR SELECT TO authenticated, anon
    USING (true);

-- Policy: Only superadmins can update settings
-- assuming checking role in profiles or claims, for now simplificy to authenticated update if needed, 
-- but ideally check for superadmin. For now, strict:
CREATE POLICY "Only admins can insert/update system settings" ON public.system_settings
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'superadmin'
        )
    );

-- Insert default banner setting
INSERT INTO public.system_settings (key, value, description)
VALUES (
    'profile_banner_url', 
    '"/profile-banner.jpg"', 
    'URL del banner por defecto para los perfiles de usuario'
) ON CONFLICT (key) DO NOTHING;

-- Create assets bucket if not exists (via storage.buckets insert)
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for 'assets'
-- Public Read
CREATE POLICY "Public Access Assets" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'assets');

-- Superadmin Write
CREATE POLICY "Superadmin Write Assets" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'assets' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'superadmin'
        )
    );

CREATE POLICY "Superadmin Update Assets" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'assets' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'superadmin'
        )
    );

CREATE POLICY "Superadmin Delete Assets" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'assets' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'superadmin'
        )
    );
