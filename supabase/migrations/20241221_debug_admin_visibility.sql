-- =================================================================
-- DEBUG: 20241221_debug_admin_visibility.sql
-- PURPOSE: Verify why Admin cannot see employees
-- =================================================================

-- 1. Check Admin User Status
SELECT id, email, role, station_id 
FROM public.system_users 
WHERE email = 'admin@gestor360.com';

-- 2. Test Helper Functions
-- We simulate what the RLS sees for the admin user.
-- NOTE: We cannot easily "impersonate" in Supabase SQL Editor for function calls 
-- without setting local config, but we can check the logic of the function.

-- Show the function definition to ensure it handles NULL correctly
SELECT pg_get_functiondef('public.check_station_access'::regproc);

-- 3. Check what 'check_station_access' returns if we pass a random station UUID
-- WE ASSUME THE ADMIN IS THE ONE RUNNING THIS, but in SQL Editor it is likely 'postgres'.
-- If run as postgres, it might bypass RLS or fail RLS depending on setup.

-- 4. Count employees directly (Bypassing RLS to see if data exists)
-- This confirms data didn't disappear.
SELECT count(*) as total_employees_raw FROM public.employees;

-- 5. Helper verification
-- Ensure check_station_access is SECURITY DEFINER
SELECT proname, prosecdef FROM pg_proc WHERE proname = 'check_station_access';

-- 6. Most likely fix:
-- If the context function get_my_claim_station_id() returns NULL for admin, 
-- verify check_station_access(uuid) logic:
-- IF my_station IS NULL THEN RETURN TRUE; 

-- FORCE UPDATE function to be sure (Safe to run again)
CREATE OR REPLACE FUNCTION public.check_station_access(req_station_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  my_station_id UUID;
  my_role TEXT;
BEGIN
  -- 1. Get current user's role and station safely
  -- We use the helper functions we created to avoid recursion
  my_station_id := public.get_my_claim_station_id();
  my_role := public.get_my_claim_role();

  -- 2. Global Admin Bypass
  -- If user has no station (NULL) AND is ADMIN, they see everything.
  -- OR if the role contains 'ADMIN' (flexible check).
  IF my_station_id IS NULL AND (my_role = 'ADMIN' OR my_role = 'SUPER_ADMIN') THEN
    RETURN TRUE;
  END IF;

  -- 3. Station Match
  -- If user is assigned to a station, they can only access data for that station
  IF my_station_id IS NOT NULL THEN
    RETURN my_station_id = req_station_id;
  END IF;

  -- 4. Managers/Auditors (Optional future logic)
  -- For now, default to false if no specific match
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RE-APPLY RLS JUST IN CASE
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_read_employees_policy" ON public.employees;
CREATE POLICY "users_read_employees_policy" ON public.employees
FOR SELECT TO authenticated
USING (
  public.check_station_access(station_id)
);
