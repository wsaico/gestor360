-- FINAL REPAIR SCRIPT 2024-12-23
-- Fixes 500 Error in get_transport_schedules
-- Adds missing columns (cost, validation)
-- Re-creates RPC safely

-- 1. Ensure Columns Exist in transport_schedules
DO $$ 
BEGIN 
    -- Add cost if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_schedules' AND column_name = 'cost') THEN 
        ALTER TABLE public.transport_schedules ADD COLUMN cost NUMERIC DEFAULT 0; 
    END IF;

    -- Add validation columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_schedules' AND column_name = 'is_provider_validated') THEN 
        ALTER TABLE public.transport_schedules ADD COLUMN is_provider_validated BOOLEAN DEFAULT FALSE; 
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_schedules' AND column_name = 'provider_validated_at') THEN 
        ALTER TABLE public.transport_schedules ADD COLUMN provider_validated_at TIMESTAMPTZ; 
    END IF;
END $$;

-- 2. Validate Foreign Keys (Drivers/Vehicles)
-- Ensure tables exist just in case
CREATE TABLE IF NOT EXISTS public.transport_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    provider_id UUID REFERENCES auth.users(id),
    first_name TEXT,
    last_name TEXT,
    dni TEXT,
    license_number TEXT,
    phone TEXT,
    status TEXT DEFAULT 'ACTIVE',
    photo_url TEXT
);

CREATE TABLE IF NOT EXISTS public.transport_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    provider_id UUID REFERENCES auth.users(id),
    plate_number TEXT,
    model TEXT,
    brand TEXT,
    year INTEGER,
    status TEXT DEFAULT 'ACTIVE',
    photo_url TEXT
);

-- 3. Re-Create RPC Function (The likely culprit of 500 error if schema was mismatch)
DROP FUNCTION IF EXISTS public.get_transport_schedules(date, date, uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_transport_schedules(
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_provider_id uuid DEFAULT NULL,
  p_station_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_user_role text;
  v_user_station uuid;
  v_result jsonb;
BEGIN
  -- Get context
  SELECT role, station_id INTO v_user_role, v_user_station
  FROM public.system_users
  WHERE id = auth.uid();

  -- Safe default if user not found (e.g. if auth issues)
  IF v_user_role IS NULL THEN
     v_user_role := 'GUEST'; 
  END IF;

  SELECT jsonb_agg(
    to_jsonb(s) || jsonb_build_object(
       -- Explicitly ensure these fields are in the JSON even if table defaults missed them
       'is_provider_validated', COALESCE(s.is_provider_validated, false),
       'provider_validated_at', s.provider_validated_at,
       'cost', COALESCE(s.cost, 0),
       'route', (
           SELECT to_jsonb(r) || jsonb_build_object(
               'organization', (SELECT jsonb_build_object('id', o.id, 'name', o.name) FROM public.organizations o WHERE o.id = r.organization_id)
           )
           FROM public.transport_routes r WHERE r.id = s.route_id
       ),
       'provider', (SELECT jsonb_build_object('id', u.id, 'username', u.username) FROM public.system_users u WHERE u.id = s.provider_id),
       'station', (SELECT jsonb_build_object('id', st.id, 'name', st.name) FROM public.stations st WHERE st.id = s.station_id),
       'execution', (SELECT to_jsonb(e) FROM public.transport_execution e WHERE e.schedule_id = s.id LIMIT 1),
       'driver', (
           SELECT to_jsonb(d) 
           FROM public.transport_drivers d 
           WHERE d.id = s.driver_id
       ),
       'vehicle', (
           SELECT to_jsonb(v) 
           FROM public.transport_vehicles v 
           WHERE v.id = s.vehicle_id
       )
    )
  ) INTO v_result
  FROM public.transport_schedules s
  WHERE 
    (
        -- Permissions Logic
        (v_user_role = 'SUPERADMIN' OR v_user_station IS NULL)
        OR
        (s.station_id = v_user_station AND v_user_role IN ('ADMIN', 'SUPERVISOR'))
        OR
        (s.provider_id = auth.uid())
        OR
        -- Allow if user is 'PROVIDER' role
        (EXISTS (SELECT 1 FROM public.system_users u WHERE u.id = auth.uid() AND u.role = 'PROVIDER' AND s.provider_id = auth.uid()))
    )
    AND
    (p_date_from IS NULL OR s.scheduled_date >= p_date_from)
    AND
    (p_date_to IS NULL OR s.scheduled_date <= p_date_to)
    AND
    (p_provider_id IS NULL OR s.provider_id = p_provider_id)
    AND
    (p_station_id IS NULL OR s.station_id = p_station_id);

  IF v_result IS NULL THEN
    v_result := '[]'::jsonb;
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_transport_schedules(date, date, uuid, uuid) TO authenticated, service_role;
