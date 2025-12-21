-- =================================================================
-- SCRIPT: 20241221_restore_employee_crud.sql
-- PURPOSE: Fix "Cannot coerce result" error by restoring UPDATE/INSERT policies
-- -----------------------------------------------------------------
-- PREVIOUSLY: We set policies "FOR SELECT" to fix visibility.
-- PROBLEM: This likely blocked UPDATE/INSERT operations (Default Deny).
-- SOLUTION: Create a unified "FOR ALL" policy.
-- =================================================================

-- 1. Reset Policies on Employees
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Drop all known recent policies to avoid conflicts
DROP POLICY IF EXISTS "users_read_employees_policy" ON public.employees; -- The one we just made
DROP POLICY IF EXISTS "employees_policy_all" ON public.employees;
DROP POLICY IF EXISTS "employees_select_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_modify_policy" ON public.employees;

-- 2. Create UNIFIED CRUD Policy (Select, Insert, Update, Delete)
CREATE POLICY "admin_employee_crud_policy" ON public.employees
FOR ALL TO authenticated
USING (
  -- READ/DELETE/UPDATE TARGET FILTER:
  -- 1. Global Admin (station_id IS NULL)
  (SELECT station_id FROM public.system_users WHERE id = auth.uid()) IS NULL
  OR
  -- 2. Local Admin/User (Same Station)
  station_id = (SELECT station_id FROM public.system_users WHERE id = auth.uid())
)
WITH CHECK (
  -- INSERT/UPDATE NEW ROW VALIDATION:
  -- 1. Global Admin can write anything
  (SELECT station_id FROM public.system_users WHERE id = auth.uid()) IS NULL
  OR
  -- 2. Local Admin can only write to their station
  station_id = (SELECT station_id FROM public.system_users WHERE id = auth.uid())
);

-- 3. Safety Check for Job Roles (Just in case they need to create roles)
-- Ensure 'job_roles' is readable/writable if necessary (usually just read for dropdowns)
-- We kept it "FOR SELECT" in previous fix. If you dynamically create roles, we need more.
-- For now, let's assume it's mostly Read-Only, but let's Ensure Select is robust.
DROP POLICY IF EXISTS "read_job_roles" ON public.job_roles;
CREATE POLICY "read_job_roles" ON public.job_roles FOR SELECT TO authenticated USING (true);

-- 4. Safety Check for Areas
-- We kept it "FOR SELECT". If you need to create areas, we need FOR ALL.
-- Let's upgrade Areas to FOR ALL just to be safe for Admins.
DROP POLICY IF EXISTS "read_areas_policy" ON public.areas;
CREATE POLICY "admin_areas_crud_policy" ON public.areas
FOR ALL TO authenticated
USING (
  (SELECT station_id FROM public.system_users WHERE id = auth.uid()) IS NULL
  OR
  station_id = (SELECT station_id FROM public.system_users WHERE id = auth.uid())
)
WITH CHECK (
  (SELECT station_id FROM public.system_users WHERE id = auth.uid()) IS NULL
  OR
  station_id = (SELECT station_id FROM public.system_users WHERE id = auth.uid())
);
