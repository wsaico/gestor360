-- Create table if not exists (just to be safe and ensure structure)
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON public.app_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.app_settings;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.app_settings;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.app_settings;

-- Create policies

-- 1. Read access: Allow everyone (including anon for login page logo) to read settings
CREATE POLICY "Enable read access for all users" ON public.app_settings
    FOR SELECT
    USING (true);

-- 2. Write access (Insert/Update/Delete): Allow authenticated users
-- Ideally this should be restricted to admins, but checking role is safer if we just trust the UI for now
-- or we can use: AND (auth.jwt() ->> 'role' = 'authenticated')
CREATE POLICY "Enable insert for authenticated users" ON public.app_settings
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.app_settings
    FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON public.app_settings
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON public.app_settings TO anon;
GRANT ALL ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
