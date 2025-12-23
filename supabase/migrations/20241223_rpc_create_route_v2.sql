-- MIGRATION: 20241223_rpc_create_route_v2.sql
-- OBJECTIVE: Fix NULL station_id error by accepting p_station_id param
-- DATE: 2024-12-23

BEGIN;

-- Drop old signature just in case
DROP FUNCTION IF EXISTS public.create_transport_route(text, uuid, transport_billing_type, numeric, boolean);

CREATE OR REPLACE FUNCTION public.create_transport_route(
  p_name text,
  p_organization_id uuid,
  p_billing_type transport_billing_type,
  p_base_price numeric,
  p_active boolean,
  p_station_id uuid -- Added Parameter
)
RETURNS jsonb AS $$
DECLARE
  v_user_role text;
  v_user_station uuid;
  v_final_station_id uuid;
  v_new_route_id uuid;
  v_result jsonb;
BEGIN
  -- 1. Get User Context
  SELECT role, station_id INTO v_user_role, v_user_station
  FROM public.system_users
  WHERE id = auth.uid();

  -- 2. Validate Permissions
  IF v_user_role NOT IN ('ADMIN', 'SUPERVISOR', 'SUPERADMIN') THEN
     RAISE EXCEPTION 'Access Denied: You do not have permission to create routes.';
  END IF;

  -- 3. Determine Station
  IF v_user_role = 'SUPERADMIN' OR (v_user_station IS NULL) THEN
      -- Global user: Must use the provided station_id
      IF p_station_id IS NULL THEN
          RAISE EXCEPTION 'Station ID is required for Global/Super Admins';
      END IF;
      v_final_station_id := p_station_id;
  ELSE
      -- Station user: Must use their own station strictly
      v_final_station_id := v_user_station;
  END IF;

  -- 4. Insert
  INSERT INTO public.transport_routes (
    name, 
    organization_id, 
    billing_type, 
    base_price, 
    active, 
    station_id
  ) VALUES (
    p_name,
    p_organization_id,
    p_billing_type,
    p_base_price,
    p_active,
    v_final_station_id
  )
  RETURNING id INTO v_new_route_id;

  -- Return Result
  SELECT to_jsonb(r) INTO v_result FROM public.transport_routes r WHERE id = v_new_route_id;
  
  RETURN v_result;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_transport_route(text, uuid, transport_billing_type, numeric, boolean, uuid) TO authenticated;

COMMIT;
