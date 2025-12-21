-- ==========================================
-- FIX: EMPLOYEE FORM DROPDOWNS (ROLES & AREAS)
-- ==========================================

-- 1. Ensure job_roles exists and has data
CREATE TABLE IF NOT EXISTS public.job_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed Job Roles if empty
INSERT INTO public.job_roles (name, description, is_active)
VALUES
  ('SUPERVISOR DE ESTACIÓN', 'Encargado de supervisar las operaciones de la estación', true),
  ('AUXILIAR DE RAMPA', 'Personal de apoyo en operaciones de rampa', true),
  ('OPERADOR 1', 'Operador nivel 1', true),
  ('OPERADOR 2', 'Operador nivel 2', true),
  ('OPERADOR 3', 'Operador nivel 3', true),
  ('SUPERVISOR DE TRÁFICO', 'Encargado de supervisar el tráfico aéreo', true),
  ('AGENTE DE TRÁFICO', 'Personal encargado del control de tráfico', true),
  ('TÉCNICO DE MANTENIMIENTO OMA', 'Técnico especializado en mantenimiento OMA', true),
  ('TÉCNICO SENIOR 1', 'Técnico con experiencia nivel senior', true),
  ('ADMINISTRATIVO', 'Personal de oficina y soporte administrativo', true)
ON CONFLICT (name) DO NOTHING;

-- 2. Ensure RLS for job_roles
ALTER TABLE public.job_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for job_roles" ON public.job_roles;
CREATE POLICY "Public read access for job_roles"
ON public.job_roles FOR SELECT
TO authenticated
USING (is_active = true);

-- 3. Ensure RLS for areas (Consolidated policy)
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_authenticated_areas" ON public.areas;
CREATE POLICY "allow_all_authenticated_areas"
ON public.areas FOR SELECT
TO authenticated
USING (is_active = true);

-- Policy to allow admins to manage areas (for completeness)
DROP POLICY IF EXISTS "admins_manage_areas" ON public.areas;
CREATE POLICY "admins_manage_areas"
ON public.areas FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.system_users 
        WHERE id = auth.uid() AND role = 'ADMIN'
    )
);

-- 4. Seed basic areas for all stations if they don't have ANY
DO $$
DECLARE
    st RECORD;
BEGIN
    FOR st IN SELECT id FROM public.stations WHERE is_active = true LOOP
        -- Only insert if the station has 0 areas
        IF NOT EXISTS (SELECT 1 FROM public.areas WHERE station_id = st.id) THEN
            INSERT INTO public.areas (station_id, name, is_active)
            VALUES 
                (st.id, 'RAMPA', true),
                (st.id, 'PAX', true),
                (st.id, 'OMA', true),
                (st.id, 'TRAFICO', true),
                (st.id, 'ADMINISTRATIVO', true);
        END IF;
    END LOOP;
END $$;

-- 5. Grant access to authenticated users
GRANT SELECT ON public.job_roles TO authenticated;
GRANT SELECT ON public.areas TO authenticated;
