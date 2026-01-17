-- Create a secure function to check admin status
-- SECURITY DEFINER allows this function to bypass RLS on system_users
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
    AND role IN ('ADMIN', 'SUPERADMIN')
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION authorize_admin() TO authenticated;

-- Re-apply policies on areas table using the secure function
-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage areas" ON areas;

-- Recreate Policy for FULL MANAGEMENT (Insert/Update/Delete)
CREATE POLICY "Admins can manage areas"
ON areas FOR ALL
TO authenticated
USING (authorize_admin())
WITH CHECK (authorize_admin());
