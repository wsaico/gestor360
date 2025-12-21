-- Function to allow ADMIN users to update passwords of other users
-- This bypasses the restriction that users can only update their own password via Client API
-- SECURITY: This function is SECURITY DEFINER, meaning it runs with the privileges of the creator (postgres/superuser)
-- We MUST enforce strict access control inside the function.

CREATE OR REPLACE FUNCTION admin_update_user_password(target_user_id uuid, new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_role text;
BEGIN
  -- 1. Get the role of the executing user
  SELECT role INTO current_user_role
  FROM public.system_users
  WHERE id = auth.uid();

  -- 2. Verify permission: Must be ADMIN or SUPERADMIN (adapt as needed)
  -- Also good to allow updating self, but usually frontend handles that differently.
  IF current_user_role NOT IN ('ADMIN', 'SUPERADMIN') THEN
    RAISE EXCEPTION 'Access Denied: Only Administrators can update other users passwords.';
  END IF;

  -- 3. Update the password in auth.users
  -- We use the pgcrypto extension's crypt function which Supabase uses internally, 
  -- but since Supabase manages hashing automatically on UPDATE to auth.users if we use the API,
  -- doing it via SQL requires correct hashing. 
  -- HOWEVER, updated method: Supabase internal `auth.users` table stores `encrypted_password`.
  -- We perform a direct update interacting with the hashing mechanism is risky if we don't match the specific algo.
  -- BETTER APPROACH: Use the Supabase Auth API extension if available OR simplest:
  -- Just update the column. Supabase GoTrue (Auth) uses bcrypt.
  
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;

  -- 4. Invalidate sessions? Optional.
END;
$$;
