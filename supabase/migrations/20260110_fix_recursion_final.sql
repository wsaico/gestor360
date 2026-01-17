-- FIX INFINITE RECURSION IN system_users
-- The previous policy 'admins_view_all' attempted to query system_users while protecting system_users, causing a loop.
-- Solution: Use the SECURITY DEFINER function 'authorize_admin()' which bypasses RLS internally.

-- 1. Drop the recursive policy
DROP POLICY IF EXISTS "admins_view_all" ON system_users;

-- 2. Recreate it using the secure function
-- This works because authorize_admin() runs as the function owner (superuser), ignoring RLS for its internal check.
CREATE POLICY "admins_view_all" ON system_users
FOR SELECT TO authenticated
USING (authorize_admin());

-- Ensure the function allows supervisors too if needed (it was updated in previous migration)
-- Just to be safe, let's affirm authorize_admin definition here again to ensure it covers what we need
CREATE OR REPLACE FUNCTION authorize_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Direct check with case insensitivity and trim
  RETURN EXISTS (
    SELECT 1
    FROM system_users
    WHERE id = auth.uid()
    AND TRIM(UPPER(role)) IN ('ADMIN', 'SUPERADMIN', 'SUPERVISOR') 
  );
END;
$$;
