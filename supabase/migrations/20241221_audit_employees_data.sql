-- =================================================================
-- DIAGNOSTIC: 20241221_audit_employees_data.sql
-- PURPOSE: Check data quality for Job Roles, Areas, and Employees
-- =================================================================

-- 1. Check for Duplicate Job Roles (Case Insensitive)
SELECT 
    lower(name) as normalized_name, 
    count(*) as count,
    array_agg(name) as variants,
    array_agg(id) as ids
FROM public.job_roles
GROUP BY lower(name)
HAVING count(*) > 1;

-- 2. Check Areas Data
SELECT count(*) as total_areas FROM public.areas;
SELECT * FROM public.areas LIMIT 5;

-- 3. Check Employees Data (RLS Check implicitly via count if run as user, but here just raw count)
SELECT count(*) as total_employees FROM public.employees;

-- 4. Check RLS Policies on these tables
SELECT tablename, policyname, cmd, roles 
FROM pg_policies 
WHERE tablename IN ('job_roles', 'areas', 'employees');
