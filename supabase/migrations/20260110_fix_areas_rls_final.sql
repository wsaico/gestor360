-- Secure Helper Function (Case Insensitive + Security Definer)
CREATE OR REPLACE FUNCTION authorize_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM system_users
    WHERE id = auth.uid()
    AND UPPER(role) IN ('ADMIN', 'SUPERADMIN')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION authorize_admin() TO authenticated;

-- Enable RLS
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;

-- DROP ALL KNOWN POLICIES (Clean Slate)
DROP POLICY IF EXISTS "Admins can manage areas" ON areas;
DROP POLICY IF EXISTS "Authenticated users can read areas" ON areas;
DROP POLICY IF EXISTS "admins_manage_areas" ON areas;
DROP POLICY IF EXISTS "authenticated_can_read_areas" ON areas;
DROP POLICY IF EXISTS "Enable read access for all users" ON areas;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON areas;
DROP POLICY IF EXISTS "Enable update for users based on email" ON areas;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON areas;

-- CREATE CLEAN POLICIES

-- 1. Read Access: Anyone logged in can see areas (needed for dropdowns)
CREATE POLICY "areas_read_policy"
ON areas FOR SELECT
TO authenticated
USING (true);

-- 2. Write Access: Only Admins/Superadmins
CREATE POLICY "areas_write_policy"
ON areas FOR ALL
TO authenticated
USING (authorize_admin())
WITH CHECK (authorize_admin());
