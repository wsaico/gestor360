-- RPC for Driver Kiosk Login
-- Validates DNI and returns driver details without requiring Auth User
-- SECURITY: SECURITY DEFINER to allow public/anon role (or authenticated) to check DNI.
-- We must restrict what it returns to minimal info.

CREATE OR REPLACE FUNCTION public.validate_driver_dni(p_dni text)
RETURNS jsonb AS $$
DECLARE
  v_driver jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', d.id,
    'first_name', d.first_name,
    'last_name', d.last_name,
    'provider_id', d.provider_id,
    'license_number', d.license_number
  ) INTO v_driver
  FROM public.transport_drivers d
  WHERE d.dni = p_dni
  LIMIT 1;

  IF v_driver IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN v_driver;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to anon/public so unauthenticated kiosk can call it
GRANT EXECUTE ON FUNCTION public.validate_driver_dni(text) TO anon, authenticated, service_role;
