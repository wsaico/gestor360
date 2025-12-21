-- =================================================================
-- MIGRATION: 20241221_EMERGENCY_FIX.sql
-- PURPOSE: Fix 500 Recursion Error AND Admin Visibility in ONE GO
-- =================================================================

-- 1. Helper Functions (MUST BE SECURITY DEFINER to stop recursion)
CREATE OR REPLACE FUNCTION public.get_my_claim_role()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM public.system_users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_claim_station_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT station_id FROM public.system_users WHERE id = auth.uid();
$$;

-- 2. Drop Problematic Policies on system_users
DROP POLICY IF EXISTS "admins_read_station_users" ON public.system_users;
DROP POLICY IF EXISTS "global_admin_read_all_users" ON public.system_users;
DROP POLICY IF EXISTS "users_read_own_profile" ON public.system_users;
DROP POLICY IF EXISTS "Read all system_users" ON public.system_users;
DROP POLICY IF EXISTS "Recovery: Allow all for authenticated users" ON public.system_users;

-- 3. Re-Create Safe Policies for system_users

-- A. Read Own Profile (Safe)
CREATE POLICY "users_read_own_profile" ON public.system_users
FOR SELECT TO authenticated
USING (
  auth.uid() = id
);

-- B. Global Admin Read All (Safe because it uses Helper Functions)
CREATE POLICY "global_admin_read_all_users" ON public.system_users
FOR SELECT TO authenticated
USING (
  public.get_my_claim_role() = 'ADMIN' 
  AND 
  public.get_my_claim_station_id() IS NULL
);

-- C. Local Admin Read Station Users (Safe because it uses Helper Functions)
CREATE POLICY "admins_read_station_users" ON public.system_users
FOR SELECT TO authenticated
USING (
  public.get_my_claim_role() = 'ADMIN' 
  AND 
  public.get_my_claim_station_id() IS NOT NULL
  AND
  station_id = public.get_my_claim_station_id()
);

-- 4. Ensure Admin User is Global (Fix Visibility)
UPDATE public.system_users 
SET station_id = NULL 
WHERE email = 'admin@gestor360.com';

-- 5. Helper Function for other tables (Employees/Areas)
-- Re-defining just in case to ensure SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.check_station_access(req_station_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  cur_role TEXT;
  cur_station_id UUID;
BEGIN
  -- We can use the safe variables now or query directly as SECURITY DEFINER
  -- Querying directly is safe here because this function is SECURITY DEFINER
  SELECT role, station_id INTO cur_role, cur_station_id
  FROM public.system_users
  WHERE id = auth.uid();

  IF cur_role IS NULL THEN RETURN FALSE; END IF;
  
  -- Global Admin
  IF cur_role = 'ADMIN' AND cur_station_id IS NULL THEN RETURN TRUE; END IF;
  
  -- Local Match
  IF cur_station_id = req_station_id THEN RETURN TRUE; END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
