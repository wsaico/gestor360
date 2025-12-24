-- MIGRATION: 20251224_fix_provider_roles.sql
-- OBJECTIVE: Allow PROVIDER role to view stations (for sharing) and manage menus
-- DATE: 2025-12-24

BEGIN;

--------------------------------------------------------------------------------
-- 1. STATIONS POLICIES
--------------------------------------------------------------------------------
-- Allow PROVIDER to view their assigned station (needed for WhatsApp sharing context)
DROP POLICY IF EXISTS "Providers can view stations" ON public.stations;

CREATE POLICY "Providers can view stations"
ON public.stations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.system_users u
    WHERE u.id = auth.uid()
    AND u.role = 'PROVIDER'
    AND (u.station_id = stations.id) 
  )
);

--------------------------------------------------------------------------------
-- 2. MENUS POLICIES
--------------------------------------------------------------------------------
-- Allow PROVIDER to INSERT menus
DROP POLICY IF EXISTS "Providers can insert menus" ON public.menus;

CREATE POLICY "Providers can insert menus"
ON public.menus
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.system_users u
    WHERE u.id = auth.uid()
    AND u.role = 'PROVIDER'
    AND u.station_id = menus.station_id -- Ensure they create for their station
  )
  -- Ensure they attribute it to themselves 
  AND auth.uid() = provider_id 
);

-- Allow PROVIDER to UPDATE their own menus
DROP POLICY IF EXISTS "Providers can update own menus" ON public.menus;

CREATE POLICY "Providers can update own menus"
ON public.menus
FOR UPDATE
TO authenticated
USING (
  auth.uid() = provider_id
  AND
  EXISTS (
    SELECT 1 FROM public.system_users u
    WHERE u.id = auth.uid()
    AND u.role = 'PROVIDER'
  )
);

-- Allow PROVIDER to DELETE their own menus
DROP POLICY IF EXISTS "Providers can delete own menus" ON public.menus;

CREATE POLICY "Providers can delete own menus"
ON public.menus
FOR DELETE
TO authenticated
USING (
  auth.uid() = provider_id
  AND
  EXISTS (
    SELECT 1 FROM public.system_users u
    WHERE u.id = auth.uid()
    AND u.role = 'PROVIDER'
  )
);

COMMIT;
