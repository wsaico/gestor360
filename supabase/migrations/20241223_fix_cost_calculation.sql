-- FIX: Populate Cost for Schedules (CORRECTED COLUMN NAME)
-- Column in transport_routes is 'base_price', not 'default_price'

-- 1. Backfill existing schedules with 0 cost using the route's base_price
UPDATE public.transport_schedules s
SET cost = r.base_price
FROM public.transport_routes r
WHERE s.route_id = r.id
  AND (s.cost IS NULL OR s.cost = 0);

-- 2. Update create_transport_schedule RPC to automatically set cost using base_price
CREATE OR REPLACE FUNCTION public.create_transport_schedule(
  p_route_id uuid,
  p_provider_id uuid,
  p_scheduled_date date,
  p_departure_time time without time zone,
  p_vehicle_plate text DEFAULT NULL::text,
  p_passengers_manifest jsonb DEFAULT '[]'::jsonb,
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

  -- 3. Get Route Price (Cost) - CORRECTED COLUMN
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
    cost -- Insert calculated cost
  ) VALUES (
    p_route_id,
    p_provider_id,
    p_station_id,
    v_driver_id,
    v_vehicle_id,
    p_scheduled_date,
    p_departure_time,
    'PENDING',
    p_passengers_manifest,
    NOW(),
    NOW(),
    COALESCE(v_route_price, 0) -- Use route price or 0
  )
  RETURNING id INTO v_schedule_id;

  -- 5. Return the created schedule (using the existing getter for full details)
  RETURN (SELECT to_jsonb(s) FROM public.transport_schedules s WHERE s.id = v_schedule_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
