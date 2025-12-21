-- =================================================================
-- SCRIPT: 20241221_FIX_DROPDOWNS_NOW.sql
-- PURPOSE: FORCE FIX for Duplicate Roles and Empty Areas
-- =================================================================

-- 1. FIX JOB ROLES (CARGOS)
-- Disable RLS temporarily to ensure we can clean up
ALTER TABLE public.job_roles DISABLE ROW LEVEL SECURITY;

-- Standardize names to Title Case (Postgres initcap) to find duplicates
UPDATE public.job_roles SET name = initcap(name);

-- Delete duplicates, keeping the one with the oldest ID
DELETE FROM public.job_roles a USING public.job_roles b
WHERE a.id > b.id AND lower(a.name) = lower(b.name);

-- Re-Enable RLS but make it OPEN for read
ALTER TABLE public.job_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_job_roles" ON public.job_roles;
CREATE POLICY "read_job_roles" ON public.job_roles 
FOR SELECT TO authenticated 
USING (true); -- EVERYONE can see job roles

-- 2. FIX AREAS (ÁREAS)
-- Ensure Global Admin (station_id IS NULL) can see ALL areas
DROP POLICY IF EXISTS "areas_isolation_policy" ON public.areas;
DROP POLICY IF EXISTS "read_areas_policy" ON public.areas;

CREATE POLICY "read_areas_policy" ON public.areas
FOR SELECT TO authenticated
USING (
  -- Option 1: User is Global Admin (station_id is NULL)
  (SELECT station_id FROM public.system_users WHERE id = auth.uid()) IS NULL
  OR
  -- Option 2: User belongs to the same station as the area
  station_id = (SELECT station_id FROM public.system_users WHERE id = auth.uid())
);

-- 3. FIX EMPLOYEES LIST Visibility
-- Re-apply the logic for Employees just in case
DROP POLICY IF EXISTS "users_read_employees_policy" ON public.employees;
CREATE POLICY "users_read_employees_policy" ON public.employees
FOR SELECT TO authenticated
USING (
  -- Option 1: Global Admin
  (SELECT station_id FROM public.system_users WHERE id = auth.uid()) IS NULL
  OR
  -- Option 2: Same Station
  station_id = (SELECT station_id FROM public.system_users WHERE id = auth.uid())
);

-- 4. VERIFICATION
-- Check if we still have duplicates (Should be 0)
SELECT name, count(*) FROM public.job_roles GROUP BY name HAVING count(*) > 1;
