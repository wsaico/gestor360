-- MIGRATION: 20241223_ensure_station_location.sql
-- OBJECTIVE: Ensure 'location' column exists in stations and populate dummy for testing.
-- DATE: 2024-12-23

BEGIN;

-- 1. Ensure Column Exists (if not already)
-- It seems it exists, but let's make sure it's JSONB
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stations' AND column_name='location') THEN
        ALTER TABLE public.stations ADD COLUMN location JSONB DEFAULT '{"lat": -12.0464, "lng": -77.0428}'::jsonb;
    END IF;
END $$;

-- 2. Update a station with a known location (Example: Lima Center) if null
-- This ensures the Geofence logic has something to test against.
UPDATE public.stations
SET location = '{"lat": -12.0464, "lng": -77.0428}'::jsonb
WHERE location IS NULL;

-- 3. Grant access just in case
GRANT SELECT(location) ON public.stations TO authenticated;

COMMIT;
