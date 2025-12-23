-- MIGRATION: 20241222_fix_rls_security_definer.sql
-- OBJECTIVE: Fix RLS recursion/permission issues using SECURITY DEFINER functions
-- DATE: 2024-12-22

BEGIN;

--------------------------------------------------------------------------------
-- 1. Helper Function (SECURITY DEFINER)
-- Bypasses RLS on system_users to safely check permissions
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_manage_transport(target_station_id uuid)
RETURNS boolean AS $$
DECLARE
  current_role text;
  current_station_id uuid;
BEGIN
  -- Get current user's role and station, ignoring RLS
  SELECT role, station_id INTO current_role, current_station_id
  FROM public.system_users
  WHERE id = auth.uid();

  -- Logic:
  -- 1. SUPERADMIN -> TRUE
  -- 2. ADMIN/SUPERVISOR with NULL station (Global) -> TRUE
  -- 3. ADMIN/SUPERVISOR with matching station -> TRUE
  
  IF current_role = 'SUPERADMIN' THEN
    RETURN true;
  END IF;

  IF current_role IN ('ADMIN', 'SUPERVISOR') THEN
    IF current_station_id IS NULL THEN
       RETURN true;
    END IF;
    IF current_station_id = target_station_id THEN
       RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to everyone (authenticated)
GRANT EXECUTE ON FUNCTION public.can_manage_transport(uuid) TO authenticated;


--------------------------------------------------------------------------------
-- 2. APPLY TO TRANSPORT ROUTES
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Manage Routes Policy" ON public.transport_routes;
DROP POLICY IF EXISTS "View Routes Policy" ON public.transport_routes;

-- Manage: Use the Security Definer function
CREATE POLICY "Manage Routes Policy" ON public.transport_routes
FOR ALL TO authenticated
USING ( public.can_manage_transport(station_id) )
WITH CHECK ( public.can_manage_transport(station_id) );

-- View: Allow if can manage OR if it's their station
CREATE POLICY "View Routes Policy" ON public.transport_routes
FOR SELECT TO authenticated
USING (
  public.can_manage_transport(station_id)
  OR
  station_id = (SELECT station_id FROM public.system_users WHERE id = auth.uid())
  OR 
  (SELECT role FROM public.system_users WHERE id = auth.uid()) = 'SUPERADMIN'
);

--------------------------------------------------------------------------------
-- 3. APPLY TO TRANSPORT SCHEDULES
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Manage Schedules Policy" ON public.transport_schedules;
DROP POLICY IF EXISTS "Provider View Schedules" ON public.transport_schedules;
DROP POLICY IF EXISTS "Provider Update Status" ON public.transport_schedules;

-- Manage
CREATE POLICY "Manage Schedules Policy" ON public.transport_schedules
FOR ALL TO authenticated
USING ( public.can_manage_transport(station_id) );

-- Provider View
CREATE POLICY "Provider View Schedules" ON public.transport_schedules
FOR SELECT TO authenticated
USING ( provider_id = auth.uid() );

-- Provider Update (Status only ideally, but row level allows update if id matches)
CREATE POLICY "Provider Update Status" ON public.transport_schedules
FOR UPDATE TO authenticated
USING ( provider_id = auth.uid() );


--------------------------------------------------------------------------------
-- 4. APPLY TO TRANSPORT EXECUTION
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Manage Execution Admin" ON public.transport_execution;
DROP POLICY IF EXISTS "Manage Execution Provider" ON public.transport_execution;

-- Admin/Supervisor Manage (via Schedule Link)
CREATE POLICY "Manage Execution Admin" ON public.transport_execution
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.transport_schedules s
    WHERE s.id = transport_execution.schedule_id
    AND public.can_manage_transport(s.station_id)
  )
);

-- Provider Manage
CREATE POLICY "Manage Execution Provider" ON public.transport_execution
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.transport_schedules s
    WHERE s.id = transport_execution.schedule_id
    AND s.provider_id = auth.uid()
  )
);

COMMIT;
