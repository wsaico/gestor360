-- =================================================================
-- MIGRATION: 20241221_fix_recursion_500.sql
-- PURPOSE: Fix infinite recursion (Error 500) in RLS policies
-- =================================================================

-- 1. Create Safe Helper Functions (SECURITY DEFINER)
-- These allow us to get the current user's role/station without triggering RLS recursively
-- (Because SECURITY DEFINER functions run with the privileges of the creator/superuser)

CREATE OR REPLACE FUNCTION public.get_my_claim_role()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM public.system_users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_claim_station_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT station_id FROM public.system_users WHERE id = auth.uid();
$$;

-- 2. Drop Problematic Recursive Policies
DROP POLICY IF EXISTS "admins_read_station_users" ON public.system_users;
DROP POLICY IF EXISTS "global_admin_read_all_users" ON public.system_users;

-- 3. Re-create Optimized Policies using Helpers

-- Policy: Global Admins can see ALL users
-- Logic: If I am ADMIN and my Station is NULL, I see everyone.
CREATE POLICY "global_admin_read_all_users" ON public.system_users
FOR SELECT TO authenticated
USING (
  (public.get_my_claim_role() = 'ADMIN' AND public.get_my_claim_station_id() IS NULL)
);

-- Policy: Local Admins can see users in THEIR station
-- Logic: If I am ADMIN and have a Station, I see users in THAT station.
CREATE POLICY "admins_read_station_users" ON public.system_users
FOR SELECT TO authenticated
USING (
  (public.get_my_claim_role() = 'ADMIN' AND public.get_my_claim_station_id() IS NOT NULL)
  AND
  (station_id = public.get_my_claim_station_id())
);
