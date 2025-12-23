-- MIGRATION: 20241222_fix_transport_secure_v2.sql
-- OBJECTIVE: Robust, Case-Insensitive, Loop-Free RLS for Transport Module
-- DATE: 2024-12-23

BEGIN;

-- 1. Helper: Check Permissions Safe (SECURITY DEFINER)
-- Bypasses RLS to read system_users safely and correctly.
CREATE OR REPLACE FUNCTION public.check_transport_permissions(
  target_station_id uuid, 
  required_privilege text -- 'MANAGE' or 'VIEW'
)
RETURNS boolean AS $$
DECLARE
  u_role text;
  u_station uuid;
  u_id uuid;
BEGIN
  -- Get context
  u_id := auth.uid();
  IF u_id IS NULL THEN RETURN false; END IF;

  -- Read trusted data
  SELECT role, station_id INTO u_role, u_station
  FROM public.system_users 
  WHERE id = u_id;
  
  -- Normalize role to uppercase for safety (Admin -> ADMIN)
  u_role := UPPER(u_role);

  -- 1. SUPERADMIN: God mode
  IF u_role = 'SUPERADMIN' THEN RETURN true; END IF;

  -- 2. MANAGEMENT (Admin/Supervisor)
  IF u_role IN ('ADMIN', 'SUPERVISOR') THEN
    -- Global Admin (no station) -> Access Everything
    IF u_station IS NULL THEN RETURN true; END IF;

    -- Station Admin -> Access Own Station
    -- For VIEW or MANAGE, target station must match user station
    -- If target_station_id is NULL (e.g. creating global route?), block unless Global Admin.
    IF target_station_id IS NOT NULL AND u_station = target_station_id THEN
      RETURN true;
    END IF;
  END IF;

  -- 3. VIEW ONLY (Monitor/Provider)
  IF required_privilege = 'VIEW' THEN
    -- If user is assigned to station, can view station data
    IF u_station IS NOT NULL AND u_station = target_station_id THEN
      RETURN true;
    END IF;
    -- Note: We generally don't let Monitors view *all* global data unless specified.
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.check_transport_permissions(uuid, text) TO authenticated;


-- 2. APPLY ROBUST POLICIES
-- Drop everything first to be sure
DROP POLICY IF EXISTS "Manage Routes" ON public.transport_routes;
DROP POLICY IF EXISTS "View Routes" ON public.transport_routes;
DROP POLICY IF EXISTS "Manage Routes Policy" ON public.transport_routes;
DROP POLICY IF EXISTS "View Routes Policy" ON public.transport_routes;

-- Policy: Manage
CREATE POLICY "Manage Routes v2" ON public.transport_routes
FOR ALL TO authenticated
USING ( public.check_transport_permissions(station_id, 'MANAGE') )
WITH CHECK ( public.check_transport_permissions(station_id, 'MANAGE') );

-- Policy: View
CREATE POLICY "View Routes v2" ON public.transport_routes
FOR SELECT TO authenticated
USING ( 
  public.check_transport_permissions(station_id, 'VIEW') 
  OR public.check_transport_permissions(station_id, 'MANAGE')
);


-- 3. SCHEDULES & EXECUTION (Apply same logic)
DROP POLICY IF EXISTS "Manage Schedules" ON public.transport_schedules;
DROP POLICY IF EXISTS "Provider Actions" ON public.transport_schedules;

CREATE POLICY "Manage Schedules v2" ON public.transport_schedules
FOR ALL TO authenticated
USING ( public.check_transport_permissions(station_id, 'MANAGE') );

CREATE POLICY "Provider Actions v2" ON public.transport_schedules
FOR ALL TO authenticated
USING ( provider_id = auth.uid() );

-- Fix Execution just in case
DROP POLICY IF EXISTS "Manage Execution" ON public.transport_execution;

CREATE POLICY "Manage Execution v2" ON public.transport_execution
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.transport_schedules s
    WHERE s.id = transport_execution.schedule_id
    AND (
      public.check_transport_permissions(s.station_id, 'MANAGE') 
      OR 
      s.provider_id = auth.uid()
    )
  )
);

COMMIT;
