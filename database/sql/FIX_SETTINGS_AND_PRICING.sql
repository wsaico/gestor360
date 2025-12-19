-- 1. Ensure app_settings table exists
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies (Drop first to avoid conflicts)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.app_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.app_settings;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.app_settings;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.app_settings;

-- Read policy (Allow everyone to read settings)
CREATE POLICY "Enable read access for all users" ON public.app_settings
    FOR SELECT
    USING (true);

-- Write policies (Authenticated users only)
CREATE POLICY "Enable insert for authenticated users" ON public.app_settings
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.app_settings
    FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON public.app_settings
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- 4. Grant permissions
GRANT SELECT ON public.app_settings TO anon;
GRANT ALL ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

-- 5. Ensure unit_price column exists in epp_items
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'epp_items' AND column_name = 'unit_price') THEN 
        ALTER TABLE public.epp_items ADD COLUMN unit_price DECIMAL(10,2) DEFAULT 0; 
    END IF; 
END $$;

-- 6. Insert Default Settings if not exist (Optional, helps visual confirmation)
INSERT INTO public.app_settings (key, value)
VALUES 
    ('INVENTORY_VALORIZATION_ENABLED', 'true'::jsonb),
    ('CURRENCY_SYMBOL', '"S/"'::jsonb),
    ('CURRENCY_CODE', '"PEN"'::jsonb)
ON CONFLICT (key) DO NOTHING;
