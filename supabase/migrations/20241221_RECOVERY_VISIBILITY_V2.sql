-- ==========================================
-- SUPER RECOVERY: RESTORE ALL VISIBILITY (DISABLE DEEP RLS)
-- ==========================================

-- 1. Employees: Permitir ver todo a CUALQUIER usuario logueado
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view all employees" ON public.employees;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.employees;
DROP POLICY IF EXISTS "Recovery: Allow all for authenticated users" ON public.employees;

CREATE POLICY "FullAccess_Employees" ON public.employees FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Job Roles: Permitir ver todo
ALTER TABLE public.job_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for job_roles" ON public.job_roles;
DROP POLICY IF EXISTS "Recovery: Allow all for authenticated users" ON public.job_roles;

CREATE POLICY "FullAccess_JobRoles" ON public.job_roles FOR SELECT TO authenticated USING (true);

-- 3. Stations: Permitir ver todo (Crítico para joins)
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all" ON public.stations;
DROP POLICY IF EXISTS "Recovery: Allow all for authenticated users" ON public.stations;

CREATE POLICY "FullAccess_Stations" ON public.stations FOR SELECT TO authenticated USING (true);

-- 4. Areas: Permitir ver todo
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_authenticated_areas" ON public.areas;
DROP POLICY IF EXISTS "Recovery: Allow all for authenticated users" ON public.areas;

CREATE POLICY "FullAccess_Areas" ON public.areas FOR SELECT TO authenticated USING (true);

-- 5. System Users: Permitir ver todo (Evita fallos en EXISTS)
ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read all system_users" ON public.system_users;
DROP POLICY IF EXISTS "Recovery: Allow all for authenticated users" ON public.system_users;

CREATE POLICY "FullAccess_SystemUsers" ON public.system_users FOR SELECT TO authenticated USING (true);

-- 6. Grant Permissions (Doble Check)
GRANT ALL ON public.employees TO authenticated;
GRANT ALL ON public.job_roles TO authenticated;
GRANT ALL ON public.stations TO authenticated;
GRANT ALL ON public.areas TO authenticated;
GRANT ALL ON public.system_users TO authenticated;

-- 7. Asegurar Datos de Semilla (Title Case)
INSERT INTO public.job_roles (name)
VALUES 
  ('Supervisor de Estación'),
  ('Auxiliar de Rampa'),
  ('Administrativo'),
  ('Operador 1'),
  ('Operador 2'),
  ('Operador 3'),
  ('Agente de Tráfico'),
  ('Supervisor de Tráfico')
ON CONFLICT (name) DO NOTHING;
