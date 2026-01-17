-- Enable RLS on areas table
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure a clean slate
DROP POLICY IF EXISTS "Authenticated users can read areas" ON areas;
DROP POLICY IF EXISTS "Admins can manage areas" ON areas;
DROP POLICY IF EXISTS "Enable read access for all users" ON areas;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON areas;
DROP POLICY IF EXISTS "Enable update for users based on email" ON areas;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON areas;

-- Policy 1: READ - All authenticated users can read areas
-- This is necessary so that dropdowns and lists populate for everyone.
CREATE POLICY "Authenticated users can read areas"
ON areas FOR SELECT
TO authenticated
USING (true);

-- Policy 2: WRITE - Admins and Superadmins can manage (Insert, Update, Delete) areas
-- We check the system_users table for the role.
CREATE POLICY "Admins can manage areas"
ON areas FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM system_users
    WHERE system_users.id = auth.uid()
    AND system_users.role IN ('ADMIN', 'SUPERADMIN')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM system_users
    WHERE system_users.id = auth.uid()
    AND system_users.role IN ('ADMIN', 'SUPERADMIN')
  )
);
