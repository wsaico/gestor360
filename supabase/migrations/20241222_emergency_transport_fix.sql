-- MIGRATION: 20241222_emergency_transport_fix.sql
-- OBJECTIVE: Resolve persistent 403 Errors by using DIRECT Policy Logic (No functions)
-- DATE: 2024-12-22

BEGIN;

--------------------------------------------------------------------------------
-- 1. TRANSPORT ROUTES (Tarifario)
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Global Admin manages all routes" ON public.transport_routes;
DROP POLICY IF EXISTS "Station Managers manage routes" ON public.transport_routes;
DROP POLICY IF EXISTS "Station Users view routes" ON public.transport_routes;
DROP POLICY IF EXISTS "Station Admin sees station routes" ON public.transport_routes;
DROP POLICY IF EXISTS "Providers see station routes" ON public.transport_routes;
DROP POLICY IF EXISTS "Global Admin sees all routes" ON public.transport_routes;
DROP POLICY IF EXISTS "Read routes station" ON public.transport_routes;
DROP POLICY IF EXISTS "Manage routes station" ON public.transport_routes;
DROP POLICY IF EXISTS "Emergency Access" ON public.transport_routes;

-- Policy 1: Full Management for ADMIN and SUPERVISOR (and SUPERADMIN)
CREATE POLICY "Manage Routes Policy" ON public.transport_routes
FOR ALL TO authenticated
USING (
   EXISTS (
     SELECT 1 FROM public.system_users su
     WHERE su.id = auth.uid()
     AND (
       su.role = 'SUPERADMIN' -- God mode
       OR (
          su.role IN ('ADMIN', 'SUPERVISOR') -- Managers
          AND (su.station_id IS NULL OR su.station_id = transport_routes.station_id)
       )
     )
   )
);

-- Policy 2: Read Access for PROVIDER, MONITOR (and others)
CREATE POLICY "View Routes Policy" ON public.transport_routes
FOR SELECT TO authenticated
USING (
   EXISTS (
     SELECT 1 FROM public.system_users su
     WHERE su.id = auth.uid()
     AND (
       su.station_id IS NULL -- Global users see all
       OR su.station_id = transport_routes.station_id -- Station users see station routes
     )
   )
);


--------------------------------------------------------------------------------
-- 2. TRANSPORT SCHEDULES (Programación)
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Global Admin manages all schedules" ON public.transport_schedules;
DROP POLICY IF EXISTS "Station Managers manage schedules" ON public.transport_schedules;
DROP POLICY IF EXISTS "Provider sees own schedules" ON public.transport_schedules;
DROP POLICY IF EXISTS "Provider updates own schedules" ON public.transport_schedules;

-- Policy 1: Full Management (ADMIN, SUPERVISOR)
CREATE POLICY "Manage Schedules Policy" ON public.transport_schedules
FOR ALL TO authenticated
USING (
   EXISTS (
     SELECT 1 FROM public.system_users su
     WHERE su.id = auth.uid()
     AND (
        su.role = 'SUPERADMIN'
        OR (
          su.role IN ('ADMIN', 'SUPERVISOR')
          AND (su.station_id IS NULL OR su.station_id = transport_schedules.station_id)
        )
     )
   )
);

-- Policy 2: Provider View (Own Schedules)
CREATE POLICY "Provider View Schedules" ON public.transport_schedules
FOR SELECT TO authenticated
USING (
    provider_id = auth.uid()
);

-- Policy 3: Provider Update Status (Own Schedules)
CREATE POLICY "Provider Update Status" ON public.transport_schedules
FOR UPDATE TO authenticated
USING (
    provider_id = auth.uid()
)
WITH CHECK (
    provider_id = auth.uid()
);


--------------------------------------------------------------------------------
-- 3. TRANSPORT EXECUTION (GPS)
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Global Admin manages all execution" ON public.transport_execution;
DROP POLICY IF EXISTS "Station Managers manage execution" ON public.transport_execution;
DROP POLICY IF EXISTS "Provider manages own execution" ON public.transport_execution;
DROP POLICY IF EXISTS "Admin/Provider sees execution linked to visible schedule" ON public.transport_execution;

-- Policy 1: Admin/Supervisor Link Check
CREATE POLICY "Manage Execution Admin" ON public.transport_execution
FOR ALL TO authenticated
USING (
   EXISTS (
      SELECT 1 FROM public.transport_schedules ts
      JOIN public.system_users su ON su.id = auth.uid()
      WHERE ts.id = transport_execution.schedule_id
      AND (
         su.role = 'SUPERADMIN'
         OR (
            su.role IN ('ADMIN', 'SUPERVISOR')
            AND (su.station_id IS NULL OR su.station_id = ts.station_id)
         )
      )
   )
);

-- Policy 2: Provider Link Check
CREATE POLICY "Manage Execution Provider" ON public.transport_execution
FOR ALL TO authenticated
USING (
   EXISTS (
      SELECT 1 FROM public.transport_schedules ts
      WHERE ts.id = transport_execution.schedule_id
      AND ts.provider_id = auth.uid()
   )
);

COMMIT;
