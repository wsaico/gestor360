-- MIGRATION: 20241223_rpc_get_schedules.sql
-- OBJECTIVE: Bypass RLS for READING Schedules (Admin & Provider)
-- DATE: 2024-12-23

BEGIN;

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
  -- 1. Get User Context
  SELECT role, station_id INTO v_user_role, v_user_station
  FROM public.system_users
  WHERE id = auth.uid();

  -- 2. Build Query
  -- Aggregate result with all relations (Route, Provider, Station, Execution)
  SELECT jsonb_agg(
    to_jsonb(s) || jsonb_build_object(
       'route', (SELECT to_jsonb(r) FROM public.transport_routes r WHERE r.id = s.route_id),
       'provider', (SELECT jsonb_build_object('id', u.id, 'username', u.username) FROM public.system_users u WHERE u.id = s.provider_id),
       'station', (SELECT jsonb_build_object('id', st.id, 'name', st.name) FROM public.stations st WHERE st.id = s.station_id),
       'execution', (SELECT to_jsonb(e) FROM public.transport_execution e WHERE e.schedule_id = s.id LIMIT 1)
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

  -- Handle empty result
  IF v_result IS NULL THEN
    v_result := '[]'::jsonb;
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_transport_schedules(date, date, uuid, uuid) TO authenticated;

COMMIT;
