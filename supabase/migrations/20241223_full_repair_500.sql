-- FULL REPAIR SCRIPT
-- Objective: Ensure all dependent tables exist and fix RPC 500 Error
-- Date: 2025-12-23

BEGIN;

-- 1. Ensure Dependent Tables Exist
CREATE TABLE IF NOT EXISTS public.transport_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    provider_id UUID REFERENCES public.system_users(id),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    dni TEXT,
    license_number TEXT,
    phone TEXT,
    status TEXT DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS public.transport_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    provider_id UUID REFERENCES public.system_users(id),
    plate_number TEXT NOT NULL,
    model TEXT,
    brand TEXT,
    year INTEGER,
    status TEXT DEFAULT 'ACTIVE'
);

-- 2. Ensure transport_schedules has FK columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_schedules' AND column_name = 'driver_id') THEN
        ALTER TABLE public.transport_schedules ADD COLUMN driver_id UUID REFERENCES public.transport_drivers(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_schedules' AND column_name = 'vehicle_id') THEN
        ALTER TABLE public.transport_schedules ADD COLUMN vehicle_id UUID REFERENCES public.transport_vehicles(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_schedules' AND column_name = 'is_provider_validated') THEN
        ALTER TABLE public.transport_schedules ADD COLUMN is_provider_validated BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_schedules' AND column_name = 'provider_validated_at') THEN
        ALTER TABLE public.transport_schedules ADD COLUMN provider_validated_at TIMESTAMPTZ;
    END IF;
END $$;

-- 3. Replace Function safely
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
  -- Get User Context
  SELECT role, station_id INTO v_user_role, v_user_station
  FROM public.system_users
  WHERE id = auth.uid();

  -- Build Query
  -- Note: We use LEFT JOIN logic via subqueries (which act as Left Join if result is null).
  -- If table doesn't exist or row doesn't exist, it returns null, which is valid JSON null.
  SELECT jsonb_agg(
    to_jsonb(s) || jsonb_build_object(
       -- Relations
       'route', (
           SELECT to_jsonb(r) || jsonb_build_object(
               'organization', (SELECT jsonb_build_object('id', o.id, 'name', o.name) FROM public.organizations o WHERE o.id = r.organization_id)
           )
           FROM public.transport_routes r WHERE r.id = s.route_id
       ),
       'provider', (SELECT jsonb_build_object('id', u.id, 'username', u.username) FROM public.system_users u WHERE u.id = s.provider_id),
       'station', (SELECT jsonb_build_object('id', st.id, 'name', st.name) FROM public.stations st WHERE st.id = s.station_id),
       'execution', (SELECT to_jsonb(e) FROM public.transport_execution e WHERE e.schedule_id = s.id LIMIT 1),
       'driver', (SELECT to_jsonb(d) FROM public.transport_drivers d WHERE d.id = s.driver_id),
       'vehicle', (SELECT to_jsonb(v) FROM public.transport_vehicles v WHERE v.id = s.vehicle_id)
    )
  ) INTO v_result
  FROM public.transport_schedules s
  WHERE 
    -- Security Filter
    (
        -- Global Admin: See All
        (v_user_role = 'SUPERADMIN' OR v_user_station IS NULL)
        OR
        -- Station Admin/Supervisor: See Own Station
        (s.station_id = v_user_station AND v_user_role IN ('ADMIN', 'SUPERVISOR'))
        OR
        -- Provider: See Own Schedules
        (s.provider_id = auth.uid())
    )
    AND
    -- Optional Params
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

GRANT EXECUTE ON FUNCTION public.get_transport_schedules(date, date, uuid, uuid) TO authenticated;

COMMIT;
