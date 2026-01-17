-- Clean up system_users policies (Removing 7 duplicates)
ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON system_users;
DROP POLICY IF EXISTS "Global Admin sees all" ON system_users;
DROP POLICY IF EXISTS "Read own profile" ON system_users;
DROP POLICY IF EXISTS "Station Admin sees station users" ON system_users;
DROP POLICY IF EXISTS "admins_read_station_users" ON system_users;
DROP POLICY IF EXISTS "global_admin_read_all_users" ON system_users;
DROP POLICY IF EXISTS "users_read_own_profile" ON system_users;
-- Also drop any other potential legacy names
DROP POLICY IF EXISTS "Enable read access for all users" ON system_users;

-- Create CLEAN policies for system_users
-- 1. Read: Users can see themselves
CREATE POLICY "users_view_self" ON system_users
FOR SELECT TO authenticated
USING (auth.uid() = id);

-- 2. Read: Admins can see everyone
CREATE POLICY "admins_view_all" ON system_users
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM system_users u
    WHERE u.id = auth.uid()
    AND UPPER(u.role) IN ('ADMIN', 'SUPERADMIN')
  )
);

-- 3. Read: Station Admins/Supervisors see their station users? 
-- For now, let's allow Supervisors to see users in their station?
-- Keeping it simple: Admins see all. Users see self.

-- RECREATE authorize_admin to be extra robust
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

-- Grant execution
GRANT EXECUTE ON FUNCTION authorize_admin() TO authenticated;

-- RE-APPLY AREAS POLICIES (Just in case)
DROP POLICY IF EXISTS "areas_read_policy" ON areas;
DROP POLICY IF EXISTS "areas_write_policy" ON areas;

CREATE POLICY "areas_read_policy"
ON areas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "areas_write_policy"
ON areas FOR ALL
TO authenticated
USING (authorize_admin())
WITH CHECK (authorize_admin());
