-- MIGRATION: 20251224_fix_employee_creation_policy.sql
-- OBJECTIVE: Allow ADMIN and SUPERVISOR to create employees
-- DATE: 2025-12-24

BEGIN;

-- Drop existing restricted policies if likely to conflict, or just add a permissive one.
-- RLS policies are OR'ed together (permissive), so adding a new one is sufficient.
-- However, let's try to keep it clean.

DROP POLICY IF EXISTS "Admins can insert employees" ON public.employees;

CREATE POLICY "Admins can insert employees"
ON public.employees
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.system_users u
    WHERE u.id = auth.uid()
    AND u.role IN ('SUPERADMIN', 'ADMIN', 'SUPERVISOR')
  )
);

-- Also ensure they can UPDATE the employees they created (auth.uid matches? No, usually station based)
-- For now, let's focus on unlocking the "Creation" which is the reported error.

COMMIT;
