-- MIGRATION: 20241223_rpc_get_routes.sql
-- OBJECTIVE: Bypass RLS for READING Routes (Fix "Empty Panel" issue)
-- DATE: 2024-12-23

BEGIN;

CREATE OR REPLACE FUNCTION public.get_transport_routes()
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
  -- Retorna JSON con las relaciones (Station, Organization)
  SELECT jsonb_agg(
    to_jsonb(r) || jsonb_build_object(
       'station', jsonb_build_object('id', s.id, 'name', s.name),
       'organization', jsonb_build_object('id', o.id, 'name', o.name)
    )
  ) INTO v_result
  FROM public.transport_routes r
  LEFT JOIN public.stations s ON r.station_id = s.id
  LEFT JOIN public.organizations o ON r.organization_id = o.id
  WHERE 
    -- 3. Filter Logic (Security)
    -- If Superadmin or Global Admin (station is NULL) -> See ALL
    (v_user_role = 'SUPERADMIN' OR v_user_station IS NULL)
    OR
    -- If Station Admin/Supervisor -> See OWN Station
    (r.station_id = v_user_station);

  -- Handle empty result (return empty array instead of null)
  IF v_result IS NULL THEN
    v_result := '[]'::jsonb;
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_transport_routes() TO authenticated;

COMMIT;
