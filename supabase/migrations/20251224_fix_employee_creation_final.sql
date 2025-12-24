-- MIGRATION: 20251224_fix_employee_creation_final.sql
-- OBJECTIVE: Fix 403 Permission Denied and Syntax Errors
-- DATE: 2025-12-24 17:35

BEGIN;

-- 1. Helper Function (Security Definer to bypass RLS on system_users)
CREATE OR REPLACE FUNCTION public.check_user_role(required_roles text[])
RETURNS boolean AS $$
DECLARE
  v_role text;
BEGIN
  -- Safe select using SECURITY DEFINER privileges
  SELECT role INTO v_role
  FROM public.system_users
  WHERE id = auth.uid();
  
  IF v_role = ANY(required_roles) THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 

-- 2. Drop potential conflict policies
DROP POLICY IF EXISTS "Admins can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Enable insert for authenticated users with role" ON public.employees;
DROP POLICY IF EXISTS "Users can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Admin Insert Employees Policy" ON public.employees;
DROP POLICY IF EXISTS "Admin Manage Employees" ON public.employees;

-- 3. Create INSERT Policy
CREATE POLICY "Admin Insert Employees Policy"
ON public.employees
FOR INSERT
TO authenticated
WITH CHECK (
  public.check_user_role(ARRAY['SUPERADMIN', 'ADMIN', 'SUPERVISOR'])
);

-- 4. Create SELECT/UPDATE/DELETE Policy
CREATE POLICY "Admin Manage Employees"
ON public.employees
FOR ALL
TO authenticated
USING (
  public.check_user_role(ARRAY['SUPERADMIN', 'ADMIN', 'SUPERVISOR'])
)
WITH CHECK (
  public.check_user_role(ARRAY['SUPERADMIN', 'ADMIN', 'SUPERVISOR'])
);

COMMIT;
