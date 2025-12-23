-- FIX: RPC Function Verification (Attempt 2 - Correcting Type)
-- The previous error confirmed that "passengers_manifest" column is uuid[], not jsonb.
-- We must drop the jsonb version we just created and recreate it with uuid[].

-- 1. Drop ALL variations to be safe (including the jsonb one we just made)
DROP FUNCTION IF EXISTS public.create_transport_schedule(uuid, uuid, date, time, text, jsonb, uuid);
DROP FUNCTION IF EXISTS public.create_transport_schedule(uuid, uuid, date, time, text, uuid[], uuid);

-- 2. Recreate with CORRECT signature (uuid[] for passengers)
CREATE OR REPLACE FUNCTION public.create_transport_schedule(
  p_route_id uuid,
  p_provider_id uuid,
  p_scheduled_date date,
  p_departure_time time without time zone,
  p_vehicle_plate text DEFAULT NULL::text,
  p_passengers_manifest uuid[] DEFAULT ARRAY[]::uuid[], -- CORRECTED TYPE
  p_station_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb AS $$
DECLARE
  v_schedule_id uuid;
  v_driver_id uuid;
  v_vehicle_id uuid;
  v_route_price numeric;
BEGIN
  -- 1. Find Driver (based on provider)
  SELECT id INTO v_driver_id
  FROM public.transport_drivers
  WHERE provider_id = p_provider_id
  AND status = 'ACTIVE'
  LIMIT 1;

  -- 2. Find Vehicle (based on plate or provider)
  IF p_vehicle_plate IS NOT NULL THEN
     SELECT id INTO v_vehicle_id FROM public.transport_vehicles WHERE plate_number = p_vehicle_plate;
  ELSE
     SELECT id INTO v_vehicle_id
     FROM public.transport_vehicles
     WHERE provider_id = p_provider_id
     AND status = 'ACTIVE'
     LIMIT 1;
  END IF;

  -- 3. Get Route Price (Cost)
  SELECT base_price INTO v_route_price
  FROM public.transport_routes
  WHERE id = p_route_id;

  -- 4. Insert Schedule
  INSERT INTO public.transport_schedules (
    route_id,
    provider_id,
    station_id,
    driver_id,
    vehicle_id,
    scheduled_date,
    departure_time,
    status,
    passengers_manifest,
    created_at,
    updated_at,
    cost
  ) VALUES (
    p_route_id,
    p_provider_id,
    p_station_id,
    v_driver_id,
    v_vehicle_id,
    p_scheduled_date,
    p_departure_time,
    'PENDING',
    p_passengers_manifest, -- Now matches uuid[] type
    NOW(),
    NOW(),
    COALESCE(v_route_price, 0)
  )
  RETURNING id INTO v_schedule_id;

  -- 5. Return the created schedule
  RETURN (SELECT to_jsonb(s) FROM public.transport_schedules s WHERE s.id = v_schedule_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
