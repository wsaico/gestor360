-- MIGRATION: 20241222_fix_transport_rls.sql
-- OBJECTIVE: Fix 403 Errors by refining RLS for Transport Module (Allow Supervisors)
-- DATE: 2024-12-22

BEGIN;

-- 1. Ensure public functions exist and are accessible
-- Redefine simple helpers just in case previous migrations were skipped/partial
CREATE OR REPLACE FUNCTION public.get_user_station()
RETURNS uuid AS $$
  SELECT station_id FROM public.system_users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT role FROM public.system_users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_global_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.system_users 
    WHERE id = auth.uid() 
    AND (role = 'SUPERADMIN' OR (role = 'ADMIN' AND station_id IS NULL))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_user_station() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_global_admin() TO authenticated;

-- 2. FIX POLICIES FOR transport_routes

-- Drop previous (potentially ambiguous) policies
DROP POLICY IF EXISTS "Global Admin sees all routes" ON public.transport_routes;
DROP POLICY IF EXISTS "Station Admin sees station routes" ON public.transport_routes;
DROP POLICY IF EXISTS "Providers see station routes" ON public.transport_routes;

-- Policy A: Global Admin (Full Access to Everything)
CREATE POLICY "Global Admin manages all routes" ON public.transport_routes
    FOR ALL TO authenticated USING (public.is_global_admin());

-- Policy B: Station Managers (ADMIN, SUPERVISOR) -> Full Access to their station
CREATE POLICY "Station Managers manage routes" ON public.transport_routes
    FOR ALL TO authenticated 
    USING (
        station_id = public.get_user_station() 
        AND public.get_user_role() IN ('ADMIN', 'SUPERVISOR')
    );

-- Policy C: Viewers (PROVIDER, MONITOR, etc) -> Read Only to their station
CREATE POLICY "Station Users view routes" ON public.transport_routes
    FOR SELECT TO authenticated 
    USING (station_id = public.get_user_station());

-- 3. FIX POLICIES FOR transport_schedules

DROP POLICY IF EXISTS "Global Admin sees all schedules" ON public.transport_schedules;
DROP POLICY IF EXISTS "Station Admin sees station schedules" ON public.transport_schedules;
DROP POLICY IF EXISTS "Provider sees own schedules" ON public.transport_schedules;
DROP POLICY IF EXISTS "Provider updates own schedules" ON public.transport_schedules;

-- Policy A: Global Admin
CREATE POLICY "Global Admin manages all schedules" ON public.transport_schedules
    FOR ALL TO authenticated USING (public.is_global_admin());

-- Policy B: Station Managers (ADMIN, SUPERVISOR) -> Full Access
CREATE POLICY "Station Managers manage schedules" ON public.transport_schedules
    FOR ALL TO authenticated 
    USING (
        station_id = public.get_user_station()
        AND public.get_user_role() IN ('ADMIN', 'SUPERVISOR')
    );

-- Policy C: Providers -> See schedules where they are assigned OR generic station view?
-- Usually providers only need to see their own schedules to accept/start.
-- But maybe they want to see all? Let's restrict to assigned OR general station read?
-- Use strict: See OWN schedules.
CREATE POLICY "Provider sees own schedules" ON public.transport_schedules
    FOR SELECT TO authenticated 
    USING (
        provider_id = auth.uid()
        OR 
        -- Also allow reading if they are just listed in station (optional, sticking to own for now)
        (station_id = public.get_user_station() AND public.get_user_role() IN ('MONITOR'))
    );

-- Policy D: Providers -> Update Status of OWN schedules
CREATE POLICY "Provider updates own schedules" ON public.transport_schedules
    FOR UPDATE TO authenticated 
    USING (provider_id = auth.uid())
    WITH CHECK (provider_id = auth.uid()); 
    -- Important: ensure they can't reassign provider_id, only update status ideally.
    -- RLS doesn't filter columns, ensuring backend validation or specific column grants (complex).
    -- For now this allows updating rows where they are provider.

-- 4. FIX POLICIES FOR transport_execution

DROP POLICY IF EXISTS "Admin/Provider sees execution linked to visible schedule" ON public.transport_execution;

-- Simplified Policy:
-- Global Admin: ALL
-- Station Managers: ALL for their station schedules
-- Provider: ALL for their own schedules

CREATE POLICY "Global Admin manages all execution" ON public.transport_execution
    FOR ALL TO authenticated USING (public.is_global_admin());

CREATE POLICY "Station Managers manage execution" ON public.transport_execution
    FOR ALL TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.transport_schedules s
            WHERE s.id = transport_execution.schedule_id
            AND s.station_id = public.get_user_station()
            AND public.get_user_role() IN ('ADMIN', 'SUPERVISOR')
        )
    );

CREATE POLICY "Provider manages own execution" ON public.transport_execution
    FOR ALL TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.transport_schedules s
            WHERE s.id = transport_execution.schedule_id
            AND s.provider_id = auth.uid()
        )
    );

COMMIT;
