-- MIGRATION: 20241223_rpc_create_route.sql
-- OBJECTIVE: Bypass RLS using a SECURITY DEFINER function for Route Creation
-- DATE: 2024-12-23

BEGIN;

CREATE OR REPLACE FUNCTION public.create_transport_route(
  p_name text,
  p_organization_id uuid,
  p_billing_type transport_billing_type,
  p_base_price numeric,
  p_active boolean
)
RETURNS jsonb AS $$
DECLARE
  v_user_role text;
  v_user_station uuid;
  v_new_route_id uuid;
  v_result jsonb;
BEGIN
  -- 1. Get User Context (Securely)
  SELECT role, station_id INTO v_user_role, v_user_station
  FROM public.system_users
  WHERE id = auth.uid();

  -- 2. Validate Permissions
  -- Only ADMIN, SUPERVISOR, SUPERADMIN can create
  IF v_user_role NOT IN ('ADMIN', 'SUPERVISOR', 'SUPERADMIN') THEN
     RAISE EXCEPTION 'Access Denied: You do not have permission to create routes.';
  END IF;

  -- 3. Perform Insert (Bypassing RLS because function is SECURITY DEFINER by default/inheritance or we force it)
  -- Actually, to truly bypass, we should ensure the function owns the table or we rely on the fact that 
  -- SECURITY DEFINER uses the function creator's rights (usually postgres/superadmin in Supabase SQL editor).
  
  -- Force station_id to be the user's station (or allow NULL if Superadmin/Global)
  -- If Global Admin (station is NULL), they can create for any station? 
  -- For now, let's assume they are creating for *their* context or we default to the station they are assigned.
  -- Simpler: We insert using the user's station_id. 
  
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
    v_user_station -- Automatically assign the creator's station
  )
  RETURNING id INTO v_new_route_id;

  -- Return the created record as JSON
  SELECT to_jsonb(r) INTO v_result FROM public.transport_routes r WHERE id = v_new_route_id;
  
  RETURN v_result;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_transport_route(text, uuid, transport_billing_type, numeric, boolean) TO authenticated;

COMMIT;
