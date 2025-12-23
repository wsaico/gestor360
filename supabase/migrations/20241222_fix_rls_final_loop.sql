-- MIGRATION: 20241222_fix_rls_final_loop.sql
-- OBJECTIVE: Fix RLS recursion by using SECURITY DEFINER getters and add missing Transport RPC
-- DATE: 2024-12-23

BEGIN;

--------------------------------------------------------------------------------
-- 1. Helper Function: get_my_station_id() [SECURITY DEFINER]
-- Safely gets the current user's station_id without triggering system_users RLS
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_station_id()
RETURNS uuid AS $$
  SELECT station_id FROM public.system_users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_my_station_id() TO authenticated;


--------------------------------------------------------------------------------
-- 2. Helper Function: is_super_admin() [SECURITY DEFINER]
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
  SELECT EXISTS(SELECT 1 FROM public.system_users WHERE id = auth.uid() AND role = 'SUPERADMIN');
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;


--------------------------------------------------------------------------------
-- 3. APPLY FINAL POLICIES TO TRANSPORT ROUTES
--------------------------------------------------------------------------------
-- Remove all existing policies again to be clean
DROP POLICY IF EXISTS "Manage Routes Policy" ON public.transport_routes;
DROP POLICY IF EXISTS "View Routes Policy" ON public.transport_routes;
DROP POLICY IF EXISTS "Public View" ON public.transport_routes;

-- Policy: Manage (Admin/Supervisor) - Uses existing can_manage_transport
CREATE POLICY "Manage Routes Policy" ON public.transport_routes
FOR ALL TO authenticated
USING ( public.can_manage_transport(station_id) )
WITH CHECK ( public.can_manage_transport(station_id) );

-- Policy: View (Provider/Monitor/Anyone in Station)
-- Replaced subquery with SECURITY DEFINER function call
CREATE POLICY "View Routes Policy" ON public.transport_routes
FOR SELECT TO authenticated
USING (
  public.can_manage_transport(station_id)  -- Managers
  OR
  station_id = public.get_my_station_id()  -- Users in station
  OR
  public.is_super_admin()                  -- Superadmin
  OR
  (public.get_my_station_id() IS NULL AND public.can_manage_transport(station_id)) -- Global Admin case (station_id NULL usually implies Global)
);

--------------------------------------------------------------------------------
-- 4. MISSING RPC: append_transport_location
-- Needed for GPS Tracking
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.append_transport_location(
  p_execution_id uuid,
  p_location jsonb
)
RETURNS void AS $$
BEGIN
  -- Append the new location object to the gps_track JSONB array
  UPDATE public.transport_execution
  SET gps_track = gps_track || p_location
  WHERE id = p_execution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.append_transport_location(uuid, jsonb) TO authenticated;

COMMIT;
