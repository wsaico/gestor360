-- Make authorize_admin even more robust
-- 1. Trust 'admin@gestor360.com' explicitly as a fallback superuser (Bootstrap mode).
-- 2. Continue to check diverse roles.

CREATE OR REPLACE FUNCTION authorize_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_email text;
BEGIN
  -- Get current user details directly
  SELECT role, email INTO v_role, v_email
  FROM system_users
  WHERE id = auth.uid();

  -- Superuser Override by Email (Safety Net)
  IF v_email = 'admin@gestor360.com' THEN
    RETURN TRUE;
  END IF;

  -- Role Check
  IF TRIM(UPPER(v_role)) IN ('ADMIN', 'SUPERADMIN', 'SUPERVISOR') THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;
