-- MIGRATION: 20241223_add_vehicle_plate.sql
-- OBJECTIVE: Add missing column 'vehicle_plate' to transport_schedules
-- DATE: 2024-12-23

BEGIN;

ALTER TABLE public.transport_schedules 
ADD COLUMN IF NOT EXISTS vehicle_plate TEXT;

COMMIT;
