-- MIGRATION: 20241223_fix_fleet_rls.sql
-- OBJECTIVE: Allow Supervisors/Station Admins to view Drivers/Vehicles for scheduling
-- DATE: 2024-12-23

BEGIN;

-- 1. Drop existing restrictive policies
DROP POLICY IF EXISTS "Vehicles visibility" ON public.transport_vehicles;
DROP POLICY IF EXISTS "Drivers visibility" ON public.transport_drivers;

-- 2. Create new granular policies for VEHICLES

-- READ: Everyone authenticated can see vehicles (needed for scheduling)
CREATE POLICY "Vehicles select policy" ON public.transport_vehicles
FOR SELECT USING (auth.role() = 'authenticated');

-- WRITE: Only Admin or Owner can modify
CREATE POLICY "Vehicles modify policy" ON public.transport_vehicles
FOR ALL USING (
    (auth.jwt() ->> 'role' = 'ADMIN' OR EXISTS (SELECT 1 FROM public.system_users WHERE id = auth.uid() AND role = 'ADMIN'))
    OR
    (provider_id = auth.uid())
)
WITH CHECK (
    (auth.jwt() ->> 'role' = 'ADMIN' OR EXISTS (SELECT 1 FROM public.system_users WHERE id = auth.uid() AND role = 'ADMIN'))
    OR
    (provider_id = auth.uid())
);


-- 3. Create new granular policies for DRIVERS

-- READ: Everyone authenticated can see drivers
CREATE POLICY "Drivers select policy" ON public.transport_drivers
FOR SELECT USING (auth.role() = 'authenticated');

-- WRITE: Only Admin or Owner can modify
CREATE POLICY "Drivers modify policy" ON public.transport_drivers
FOR ALL USING (
    (auth.jwt() ->> 'role' = 'ADMIN' OR EXISTS (SELECT 1 FROM public.system_users WHERE id = auth.uid() AND role = 'ADMIN'))
    OR
    (provider_id = auth.uid())
)
WITH CHECK (
    (auth.jwt() ->> 'role' = 'ADMIN' OR EXISTS (SELECT 1 FROM public.system_users WHERE id = auth.uid() AND role = 'ADMIN'))
    OR
    (provider_id = auth.uid())
);

COMMIT;
