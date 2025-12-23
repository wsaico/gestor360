-- MIGRATION: 20241222_clean_slate_transport.sql
-- OBJECTIVE: Wipe ALL policies on Transport tables and re-apply Bulletproof SECURITY DEFINER Logic
-- DATE: 2024-12-23

BEGIN;

-- 1. DYNAMICALLY DROP ALL POLICIES on Transport Tables
-- This ensures no conflicting policies remain, regardless of their name.
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'transport_routes' LOOP
        EXECUTE format('DROP POLICY "%s" ON public.transport_routes', pol.policyname);
    END LOOP;
    
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'transport_schedules' LOOP
        EXECUTE format('DROP POLICY "%s" ON public.transport_schedules', pol.policyname);
    END LOOP;
    
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'transport_execution' LOOP
        EXECUTE format('DROP POLICY "%s" ON public.transport_execution', pol.policyname);
    END LOOP;
END $$;

-- 2. RE-DEFINE SECURITY DEFINER FUNCTION "can_manage_transport"
-- Explicitly handle NULLs and ensure search_path is safe
CREATE OR REPLACE FUNCTION public.can_manage_transport(target_station_id uuid)
RETURNS boolean AS $$
DECLARE
  current_role text;
  current_station_id uuid;
BEGIN
  -- Set search path to prevent hijacking
  -- (Implicit in function definition for newer PG, but good practice inside logic if needed)
  
  -- Fetch user details directly from system_users (Bypassing RLS due to SECURITY DEFINER)
  SELECT role, station_id INTO current_role, current_station_id
  FROM public.system_users
  WHERE id = auth.uid();
  
  -- If user not found in system_users, deny
  IF current_role IS NULL THEN
    RETURN false;
  END IF;

  -- 1. SUPERADMIN: Always allow
  IF current_role = 'SUPERADMIN' THEN
    RETURN true;
  END IF;

  -- 2. ADMIN/SUPERVISOR: Allow if Global OR Matching Station
  IF current_role IN ('ADMIN', 'SUPERVISOR') THEN
    -- If user is Global Admin (no station assigned), allow everything
    IF current_station_id IS NULL THEN
       RETURN true;
    END IF;
    
    -- If target_station_id matches user's station, allow
    -- Handle NULL target (should not happen in Routes, but safety check)
    IF target_station_id IS NOT NULL AND current_station_id = target_station_id THEN
       RETURN true;
    END IF;
  END IF;

  -- Default Deny
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.can_manage_transport(uuid) TO authenticated;

-- 3. RE-DEFINE SECURITY DEFINER FUNCTION "get_my_station_id"
CREATE OR REPLACE FUNCTION public.get_my_station_id()
RETURNS uuid AS $$
  SELECT station_id FROM public.system_users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_my_station_id() TO authenticated;


-- 4. APPLY CLEAN POLICIES

-- === ROUTES ===
CREATE POLICY "Manage Routes" ON public.transport_routes
FOR ALL TO authenticated
USING ( public.can_manage_transport(station_id) )
WITH CHECK ( public.can_manage_transport(station_id) );

CREATE POLICY "View Routes" ON public.transport_routes
FOR SELECT TO authenticated
USING (
  -- Managers can view
  public.can_manage_transport(station_id) 
  OR
  -- Users from the same station can view
  station_id = public.get_my_station_id()
  OR
  -- Global users can view all (if can_manage didn't catch them)
  public.get_my_station_id() IS NULL
);

-- === SCHEDULES ===
CREATE POLICY "Manage Schedules" ON public.transport_schedules
FOR ALL TO authenticated
USING ( public.can_manage_transport(station_id) );

CREATE POLICY "Provider Actions" ON public.transport_schedules
FOR ALL TO authenticated
USING ( provider_id = auth.uid() ); 
-- Simplified: Provider can do anything to their own schedule (View/Update status). 
-- Application logic protects fields.

-- === EXECUTION ===
CREATE POLICY "Manage Execution" ON public.transport_execution
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.transport_schedules s
    WHERE s.id = transport_execution.schedule_id
    AND (
      public.can_manage_transport(s.station_id) -- Managers
      OR 
      s.provider_id = auth.uid() -- Provider
    )
  )
);

-- 5. ENSURE RPC EXISTS
CREATE OR REPLACE FUNCTION public.append_transport_location(
  p_execution_id uuid,
  p_location jsonb
)
RETURNS void AS $$
BEGIN
  UPDATE public.transport_execution
  SET gps_track = gps_track || p_location
  WHERE id = p_execution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.append_transport_location(uuid, jsonb) TO authenticated;

COMMIT;
