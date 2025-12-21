
-- Migration: Create app_settings table for global configuration
-- Author: Supervisor
-- Date: 2024-12-21
-- Fix: Changed 'profiles' to 'system_users' for Policy check

CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Allow Read for Authenticated Users (for toggles) OR Service Role (Edge Function)
CREATE POLICY "Allow read access for authenticated users" ON public.app_settings
    FOR SELECT TO authenticated USING (true);

-- Policy: Allow Write for ADMIN only
CREATE POLICY "Allow write access for admins" ON public.app_settings
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.system_users 
            WHERE system_users.id = auth.uid() 
            AND system_users.role = 'ADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.system_users 
            WHERE system_users.id = auth.uid() 
            AND system_users.role = 'ADMIN'
        )
    );

-- Seed Default Values
INSERT INTO public.app_settings (key, value) VALUES
    ('ENABLE_NOTIFICATIONS_GLOBAL', 'true'),
    ('BREVO_API_KEY', ''),
    ('SMTP_SENDER_EMAIL', 'no-reply@gestor360.com'),
    ('ENABLE_ALERT_EPPS', 'true'),
    ('ENABLE_ALERT_LOW_STOCK', 'true'),
    ('ENABLE_ALERT_BIRTHDAYS', 'true'),
    ('ENABLE_ALERT_EMO', 'true'),
    ('ENABLE_ALERT_PHOTOCHECK', 'true')
ON CONFLICT (key) DO NOTHING;

-- Grant permissions (if needed for anon, but restricted in app)
GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
