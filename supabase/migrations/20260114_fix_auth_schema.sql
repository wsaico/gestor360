-- =================================================================
-- MIGRATION: 20260114_fix_auth_schema.sql
-- PURPOSE: Restore missing critical tables and specific admin user
-- =================================================================

-- 0. Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create Stations Table (Requisite for system_users)
CREATE TABLE IF NOT EXISTS public.stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for authenticated users" ON public.stations
    FOR SELECT TO authenticated USING (true);

-- 2. Create Roles Table
CREATE TABLE IF NOT EXISTS public.app_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- Internal ID (e.g. 'ADMIN')
    label TEXT NOT NULL,       -- Display Name
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_roles_authenticated" ON public.app_roles
    FOR SELECT TO authenticated USING (true);

-- 3. Seed Roles
INSERT INTO public.app_roles (name, label, description, is_system, permissions)
VALUES 
  ('ADMIN', 'Administrador', 'Acceso administrativo total a su estación (o global)', true, '["ALL_ACCESS"]'),
  ('OPERATOR', 'Operador', 'Acceso operativo básico', true, '["OPERATIONS_VIEW", "OPERATIONS_EDIT"]'),
  ('SUPERVISOR', 'Supervisor', 'Acceso de supervisión y reportes', true, '["OPERATIONS_VIEW", "REPORTS_VIEW", "EMPLOYEES_VIEW"]')
ON CONFLICT (name) DO UPDATE SET 
  permissions = EXCLUDED.permissions;

-- 4. Create System Users Table
CREATE TABLE IF NOT EXISTS public.system_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    username TEXT,
    role TEXT NOT NULL,
    station_id UUID REFERENCES public.stations(id),
    is_active BOOLEAN DEFAULT true,
    password_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for authenticated users" ON public.system_users
    FOR SELECT TO authenticated USING (true);

-- 5. Restore Specific User
-- First, ensure the user exists in auth.users (Idempotent upsert attempt)
-- Note: Modifying auth.users directly is generally reserved for supabase admin, strictly for recovery
DO $$
DECLARE
    target_user_id UUID := '363adba1-de70-40ab-968f-a5748b635c42';
    target_email TEXT := 'josemorales.hu@gmail.com';
    -- Default password '123456' hashed with bcrypt. 
    -- In real scenario, user should reset password.
    target_pass_hash TEXT := crypt('123456', gen_salt('bf')); 
BEGIN
    -- Insert into auth.users if not exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            target_user_id,
            'authenticated',
            'authenticated',
            target_email,
            target_pass_hash,
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{}',
            NOW(),
            NOW()
        );
    END IF;

    -- Insert into system_users (The critical link)
    INSERT INTO public.system_users (id, email, username, role, is_active)
    VALUES (target_user_id, target_email, 'Jose Morales', 'ADMIN', true)
    ON CONFLICT (id) DO UPDATE SET
        role = 'ADMIN',
        is_active = true;
        
END $$;
