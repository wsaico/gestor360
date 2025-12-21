-- ==========================================
-- EMERGENCY RECOVERY: RESTORE VISIBILITY
-- ==========================================

-- 1. Reset Employees RLS (Permissive for authenticated)
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view all employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can update all employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can create employees in any station" ON public.employees;
DROP POLICY IF EXISTS "Admins can delete employees" ON public.employees;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.employees;

CREATE POLICY "Recovery: Allow all for authenticated users" 
ON public.employees FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 2. Reset Job Roles RLS
ALTER TABLE public.job_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for job_roles" ON public.job_roles;
CREATE POLICY "Recovery: Allow all for authenticated users" 
ON public.job_roles FOR SELECT 
TO authenticated 
USING (true);

-- 3. Reset Areas RLS
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_authenticated_areas" ON public.areas;
CREATE POLICY "Recovery: Allow all for authenticated users" 
ON public.areas FOR SELECT 
TO authenticated 
USING (true);

-- 4. Reset Stations RLS (Critical for joins)
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all" ON public.stations;
CREATE POLICY "Recovery: Allow all for authenticated users" 
ON public.stations FOR SELECT 
TO authenticated 
USING (true);

-- 5. Reset System Users RLS
ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read all system_users" ON public.system_users;
CREATE POLICY "Recovery: Allow all for authenticated users" 
ON public.system_users FOR SELECT 
TO authenticated 
USING (true);

-- 6. Grant basic permissions
GRANT SELECT ON public.employees TO authenticated;
GRANT SELECT ON public.job_roles TO authenticated;
GRANT SELECT ON public.areas TO authenticated;
GRANT SELECT ON public.stations TO authenticated;
GRANT SELECT ON public.system_users TO authenticated;

-- 7. Ensure seed data exists for roles (Fallback)
INSERT INTO public.job_roles (name)
VALUES 
  ('Supervisor de Estación'),
  ('Auxiliar de Rampa'),
  ('Administrativo'),
  ('Operario')
ON CONFLICT (name) DO NOTHING;
