-- FUNCTION: get_my_role
-- OBJECTIVE: Diagnostic tool to see what role the current user has in system_users
-- RUN THIS IN SUPABASE SQL EDITOR

CREATE OR REPLACE FUNCTION public.get_debug_role()
RETURNS text AS $$
DECLARE
  v_role text;
  v_email text;
BEGIN
  -- Get role from system_users
  SELECT role INTO v_role
  FROM public.system_users
  WHERE id = auth.uid();
  
  -- Get email from auth.users (just to be sure who we are)
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = auth.uid();

  RETURN 'User: ' || COALESCE(v_email, 'Unknown') || ' | Role: ' || COALESCE(v_role, 'NULL');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Usage:
-- SELECT public.get_debug_role();
