-- SMART RLS POLICIES: GLOBAL VS STATION ACCESS (PUBLIC SCHEMA FIX)
-- Defines clear access rules:
-- 1. SUPERADMIN/GLOBAL ADMIN: access EVERYTHING (station_id is null or ignored)
-- 2. STATION ADMIN: access ONLY their station
-- 3. USERS/PROVIDERS: access ONLY their station/context

-- HELPER FUNCTIONS (IN PUBLIC SCHEMA)

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT role FROM public.system_users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_station()
RETURNS uuid AS $$
  SELECT station_id FROM public.system_users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_global_admin()
RETURNS boolean AS $$
BEGIN
  -- Returns true if user is SUPERADMIN or an ADMIN with NO station assigned (Global)
  RETURN EXISTS (
    SELECT 1 FROM public.system_users 
    WHERE id = auth.uid() 
    AND (role = 'SUPERADMIN' OR (role = 'ADMIN' AND station_id IS NULL))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 1. SYSTEM USERS (Security: High)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON system_users;
DROP POLICY IF EXISTS "Enable full access for admins" ON system_users;
DROP POLICY IF EXISTS "Global Admin sees all" ON system_users; 
DROP POLICY IF EXISTS "Station Admin sees station users" ON system_users;
DROP POLICY IF EXISTS "Read own profile" ON system_users;

-- Policy: Everyone can read their own profile
CREATE POLICY "Read own profile" 
ON system_users FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- Policy: Global Admins see ALL users
CREATE POLICY "Global Admin sees all" 
ON system_users FOR SELECT 
TO authenticated 
USING (public.is_global_admin());

-- Policy: Station Admins see users in their station only
CREATE POLICY "Station Admin sees station users" 
ON system_users FOR SELECT 
TO authenticated 
USING (
  role = 'ADMIN' 
  AND station_id IS NOT NULL 
  AND station_id = public.get_user_station()
);


-- 2. EMPLOYEES (Security: Medium)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON employees;
DROP POLICY IF EXISTS "Enable modification for admins" ON employees;
DROP POLICY IF EXISTS "Global Admin sees all employees" ON employees;
DROP POLICY IF EXISTS "Station Users see station employees" ON employees;

-- Policy: Global Admin sees ALL
CREATE POLICY "Global Admin sees all employees" 
ON employees FOR ALL 
TO authenticated 
USING (public.is_global_admin());

-- Policy: Station Admin/Users see employees in their station
CREATE POLICY "Station Users see station employees" 
ON employees FOR SELECT 
TO authenticated 
USING (
  station_id = public.get_user_station()
);
-- Note: Global admins are covered by the first policy.


-- 3. FOOD ORDERS (Security: High - Transactional)
DROP POLICY IF EXISTS "Orders viewable by station" ON food_orders;
DROP POLICY IF EXISTS "Global Admin sees all orders" ON food_orders;
DROP POLICY IF EXISTS "Users see orders in their station" ON food_orders;

CREATE POLICY "Global Admin sees all orders" 
ON food_orders FOR SELECT 
TO authenticated 
USING (public.is_global_admin());

CREATE POLICY "Users see orders in their station" 
ON food_orders FOR SELECT 
TO authenticated 
USING (
  station_id = public.get_user_station()
);

-- Grant perms to public functions
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_station() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_global_admin() TO authenticated;
