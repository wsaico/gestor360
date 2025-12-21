-- ==========================================
-- AUDIT & FIX: EMPLOYEE MASTER DATA & PERMISSIONS
-- ==========================================

-- 1. Standardize job_roles table
CREATE TABLE IF NOT EXISTS public.job_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reset/Update roles with Title Case for better mapping
-- First, ensure they are active
UPDATE public.job_roles SET is_active = true WHERE is_active IS NULL;

-- Insert/Update Standard Roles
INSERT INTO public.job_roles (name, description, is_active)
VALUES
  ('Supervisor de Estación', 'Encargado de supervisar las operaciones de la estación', true),
  ('Auxiliar de Rampa', 'Personal de apoyo en operaciones de rampa', true),
  ('Operador 1', 'Operador nivel 1', true),
  ('Operador 2', 'Operador nivel 2', true),
  ('Operador 3', 'Operador nivel 3', true),
  ('Supervisor de Tráfico', 'Encargado de supervisar el tráfico aéreo', true),
  ('Agente de Tráfico', 'Personal encargado del control de tráfico', true),
  ('Técnico de Mantenimiento OMA', 'Técnico especializado en mantenimiento OMA', true),
  ('Técnico Senior 1', 'Técnico con experiencia nivel senior', true),
  ('Administrativo', 'Personal de oficina y soporte administrativo', true)
ON CONFLICT (name) DO NOTHING;

-- 2. Ensure RLS for job_roles
ALTER TABLE public.job_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for job_roles" ON public.job_roles;
CREATE POLICY "Public read access for job_roles"
ON public.job_roles FOR SELECT
TO authenticated
USING (true); -- Accessible by all logged users for dropdowns

-- 3. Ensure RLS for areas (Standardize for all authenticated)
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_authenticated_areas" ON public.areas;
CREATE POLICY "allow_all_authenticated_areas"
ON public.areas FOR SELECT
TO authenticated
USING (true);

-- 4. Audit & Seed default areas for all active stations
DO $$
DECLARE
    st RECORD;
BEGIN
    FOR st IN SELECT id FROM public.stations WHERE is_active = true LOOP
        -- Seed basic areas if missing
        INSERT INTO public.areas (station_id, name, is_active)
        VALUES 
            (st.id, 'RAMPA', true),
            (st.id, 'PAX', true),
            (st.id, 'OMA', true),
            (st.id, 'TRAFICO', true),
            (st.id, 'ADMINISTRATIVO', true)
        ON CONFLICT (station_id, name) DO NOTHING;
    END LOOP;
END $$;

-- 5. Fix permissions for system_users (often needed for RLS functions)
ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read all system_users" ON public.system_users;
CREATE POLICY "Read all system_users" ON public.system_users FOR SELECT TO authenticated USING (true);

-- 6. Grant basic SELECT access to key tables
GRANT SELECT ON public.job_roles TO authenticated;
GRANT SELECT ON public.areas TO authenticated;
GRANT SELECT ON public.stations TO authenticated;
