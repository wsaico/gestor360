-- MIGRATION: 20251224_cleanup_redundant_policies.sql
-- OBJECTIVE: Remove old 'admin_write_employees' policy that conflicts/fails
-- DATE: 2025-12-24

BEGIN;

-- Remove the legacy policy that uses direct subquery (likely causing issues)
DROP POLICY IF EXISTS "admin_write_employees" ON public.employees;

-- We already have "Admin Insert Employees Policy" and "Admin Manage Employees" 
-- which utilize the secure 'check_user_role' function.

COMMIT;
