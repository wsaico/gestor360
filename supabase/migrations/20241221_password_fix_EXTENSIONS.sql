-- SOLUTION: Handle authentication extension schema properly
-- The error "public.gen_salt does not exist" happens because pgcrypto is likely in the 'extensions' schema, not 'public'.

-- 1. Create the 'extensions' schema if it doesn't exist (Standard Supabase practice)
CREATE SCHEMA IF NOT EXISTS extensions;

-- 2. Enable pgcrypto in the 'extensions' schema
-- We use CASCADE to ensuring it installs correctly
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions CASCADE;

-- 3. Drop existing function to clear old search_path issues
DROP FUNCTION IF EXISTS admin_update_user_password(uuid, text);

-- 4. Re-create function with the CORRECT search_path including 'extensions'
CREATE OR REPLACE FUNCTION admin_update_user_password(target_user_id uuid, new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
-- IMPORTANT: Add 'extensions' to the search path so it finds gen_salt
SET search_path = public, auth, extensions
AS $$
DECLARE
  current_user_role text;
BEGIN
  -- 1. Verify Admin Permissions
  SELECT role INTO current_user_role
  FROM public.system_users
  WHERE id = auth.uid();

  IF current_user_role NOT IN ('ADMIN', 'SUPERADMIN') THEN
    RAISE EXCEPTION 'Access Denied: Only Administrators can update other users passwords.';
  END IF;

  -- 2. Update Password
  -- Now we call crypt() and gen_salt() WITHOUT the schema prefix.
  -- The 'SET search_path' above will find them in 'extensions'.
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;
END;
$$;
