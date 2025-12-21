-- =================================================================
-- MIGRATION: 20241221_optimize_multibranch_security.sql
-- PURPOSE: Implement Safe Hybrid Multi-Branch Security (RLS)
-- =================================================================

-- 1. Helper function: check_station_access(req_station_id)
-- Returns TRUE if the current user has permission to access the given station ID.
-- Uses SECURITY DEFINER to avoid RLS recursion when reading system_users.
CREATE OR REPLACE FUNCTION public.check_station_access(req_station_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  cur_role TEXT;
  cur_station_id UUID;
BEGIN
  -- Get current user's role and assigned station
  SELECT role, station_id INTO cur_role, cur_station_id
  FROM public.system_users
  WHERE id = auth.uid();

  -- If user not found, deny
  IF cur_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 1. Global Admin: Role 'ADMIN' and NO specific station (NULL)
  -- They can access ANY station.
  IF cur_role = 'ADMIN' AND cur_station_id IS NULL THEN
    RETURN TRUE;
  END IF;

  -- 2. Local Admin / Operator: Restricted to their assigned station
  -- They can only access if the requested station matches their assigned station.
  -- This covers both 'ADMIN' (Local) and other roles.
  IF cur_station_id = req_station_id THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Re-Enable RLS on Critical Tables & Clean old policies
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

-- Clean Employees Policies
DROP POLICY IF EXISTS "Recovery: Allow all for authenticated users" ON public.employees;
DROP POLICY IF EXISTS "multibranch_employee_select" ON public.employees;
DROP POLICY IF EXISTS "multibranch_employee_modify" ON public.employees;
DROP POLICY IF EXISTS "Admins can view all employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can update all employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can create employees in any station" ON public.employees;
DROP POLICY IF EXISTS "Admins can delete employees" ON public.employees;

-- Clean Areas Policies
DROP POLICY IF EXISTS "Recovery: Allow all for authenticated users" ON public.areas;
DROP POLICY IF EXISTS "multibranch_area_select" ON public.areas;
DROP POLICY IF EXISTS "allow_all_authenticated_areas" ON public.areas;


-- 3. Apply New Policies: EMPLOYEES
-- SELECT: Users (Admins & Ops) can SEE employees of their allowed station
CREATE POLICY "multibranch_employee_select" ON public.employees
FOR SELECT TO authenticated
USING (
  public.check_station_access(station_id)
);

-- MODIFY (Insert/Update/Delete): restricted to ADMINS locally or globally
CREATE POLICY "multibranch_employee_modify" ON public.employees
FOR ALL TO authenticated
USING (
  public.check_station_access(station_id) 
  AND (
    EXISTS (SELECT 1 FROM public.system_users WHERE id = auth.uid() AND role = 'ADMIN')
  )
)
WITH CHECK (
  public.check_station_access(station_id)
  AND (
    EXISTS (SELECT 1 FROM public.system_users WHERE id = auth.uid() AND role = 'ADMIN')
  )
);


-- 4. Apply New Policies: AREAS
-- SELECT: Users can SEE areas of their allowed station
CREATE POLICY "multibranch_area_select" ON public.areas
FOR SELECT TO authenticated
USING (
  public.check_station_access(station_id)
);

-- 5. System Users Policy (Self & Admin Access)
ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Recovery: Allow all for authenticated users" ON public.system_users;
DROP POLICY IF EXISTS "Read all system_users" ON public.system_users;
DROP POLICY IF EXISTS "users_read_own_profile" ON public.system_users;
DROP POLICY IF EXISTS "admins_read_station_users" ON public.system_users;
DROP POLICY IF EXISTS "global_admin_read_all_users" ON public.system_users;

-- Users can read their own profile (Critical for Login/AuthService)
CREATE POLICY "users_read_own_profile" ON public.system_users
FOR SELECT TO authenticated
USING (
  auth.uid() = id
);

-- Station Admins can read other users in their station (for management)
CREATE POLICY "admins_read_station_users" ON public.system_users
FOR SELECT TO authenticated
USING (
  role = 'ADMIN' 
  AND station_id IS NOT NULL 
  AND station_id = (SELECT station_id FROM public.system_users WHERE id = auth.uid())
);

-- Global Admins can read ALL users
CREATE POLICY "global_admin_read_all_users" ON public.system_users
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.system_users WHERE id = auth.uid() AND role = 'ADMIN' AND station_id IS NULL)
);
