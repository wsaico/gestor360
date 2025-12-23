-- RPC to get schedules for a specific driver (Kiosk Mode)
-- Returns JSONB with necessary details

CREATE OR REPLACE FUNCTION public.get_driver_schedules(p_driver_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(
    to_jsonb(s) || jsonb_build_object(
       'route', (SELECT to_jsonb(r) FROM public.transport_routes r WHERE r.id = s.route_id),
       'vehicle', (SELECT to_jsonb(v) FROM public.transport_vehicles v WHERE v.id = s.vehicle_id),
       'driver', (SELECT to_jsonb(d) FROM public.transport_drivers d WHERE d.id = s.driver_id),
       'execution', (SELECT to_jsonb(e) FROM public.transport_execution e WHERE e.schedule_id = s.id LIMIT 1)
    )
  ) INTO v_result
  FROM public.transport_schedules s
  WHERE s.driver_id = p_driver_id
    AND s.scheduled_date = CURRENT_DATE
    AND s.status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED');

  IF v_result IS NULL THEN
    v_result := '[]'::jsonb;
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_driver_schedules(uuid) TO anon, authenticated, service_role;
