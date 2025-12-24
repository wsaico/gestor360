-- SCRIPT: EMERGENCY_OPEN_ACCESS.sql
-- OBJECTIVE: Temporarily allow ALL operations on employees table to unblock creation.
-- WARNING: This allows any logged-in user to create/edit employees. Revert once validated.

BEGIN;

-- Drop restricting policies
DROP POLICY IF EXISTS "Admin Insert Employees Policy" ON public.employees;
DROP POLICY IF EXISTS "Admin Manage Employees" ON public.employees;

-- Create PERMISSIVE policy
CREATE POLICY "Emergency Open Access"
ON public.employees
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

COMMIT;
