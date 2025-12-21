-- FINAL FIX FOR PASSWORD UPDATE
-- 1. Enable pgcrypto extension explicitly in the public schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA public;

-- 2. Drop the function to recreate it ensuring it sees the extension
DROP FUNCTION IF EXISTS admin_update_user_password(uuid, text);

-- 3. Re-create the function with explicit schema usage and robust security
CREATE OR REPLACE FUNCTION admin_update_user_password(target_user_id uuid, new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions -- Ensure we can find gen_salt (in public)
AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Check if the executor is an Admin/Superadmin
  SELECT role INTO current_user_role
  FROM public.system_users
  WHERE id = auth.uid();

  IF current_user_role NOT IN ('ADMIN', 'SUPERADMIN') THEN
    RAISE EXCEPTION 'Access Denied: Only Administrators can update other users passwords.';
  END IF;

  -- Update the password using pgcrypto functions explicitly from public schema
  UPDATE auth.users
  SET encrypted_password = public.crypt(new_password, public.gen_salt('bf'))
  WHERE id = target_user_id;
END;
$$;
