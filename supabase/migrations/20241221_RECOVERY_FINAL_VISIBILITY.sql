-- ==========================================
-- FINAL RECOVERY: RESTORE SYSTEM VISIBILITY
-- ==========================================

-- 1. Disable RLS on core tables to restore immediate access
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_users DISABLE ROW LEVEL SECURITY;

-- 2. Drop all policies to clean up
DROP POLICY IF EXISTS "Admins can view all employees" ON public.employees;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.employees;
DROP POLICY IF EXISTS "Recovery: Allow all for authenticated users" ON public.employees;
DROP POLICY IF EXISTS "FullAccess_Employees" ON public.employees;

DROP POLICY IF EXISTS "Public read access for job_roles" ON public.job_roles;
DROP POLICY IF EXISTS "FullAccess_JobRoles" ON public.job_roles;

DROP POLICY IF EXISTS "Enable read access for all" ON public.stations;
DROP POLICY IF EXISTS "FullAccess_Stations" ON public.stations;

DROP POLICY IF EXISTS "allow_all_authenticated_areas" ON public.areas;
DROP POLICY IF EXISTS "FullAccess_Areas" ON public.areas;

DROP POLICY IF EXISTS "Read all system_users" ON public.system_users;
DROP POLICY IF EXISTS "FullAccess_SystemUsers" ON public.system_users;

-- 3. Grant full permissions to authenticated users
GRANT ALL ON public.employees TO authenticated;
GRANT ALL ON public.job_roles TO authenticated;
GRANT ALL ON public.stations TO authenticated;
GRANT ALL ON public.areas TO authenticated;
GRANT ALL ON public.system_users TO authenticated;

-- 4. Synchronize job_roles with actual data in employees table
-- This ensures the dropdowns are NOT empty
INSERT INTO public.job_roles (name, is_active)
SELECT DISTINCT role_name, true 
FROM public.employees
WHERE role_name IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- 5. Standard roles if missing
INSERT INTO public.job_roles (name, is_active)
VALUES 
  ('Supervisor de Estación', true),
  ('Auxiliar de Rampa', true),
  ('Administrativo', true),
  ('Operador 1', true),
  ('Operador 2', true),
  ('Operador 3', true),
  ('Agente de Tráfico', true),
  ('Supervisor de Tráfico', true)
ON CONFLICT (name) DO NOTHING;
