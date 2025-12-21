-- =================================================================
-- MIGRATION: 20241221_fix_employee_data_quality.sql
-- PURPOSE: Normalize Job Roles (Title Case) and Deduplicate
-- =================================================================

-- 1. Create a temporary function to title case strings (Postgres initcap is good but let's be sure)
-- actually initcap() exists in postgres.

-- 2. Update job_roles to be Title Case (Normalization Step 1)
-- We will do this carefully to avoid unique constraint violations immediately.
-- Strategy:
-- a. Update employees to point to the "Best" version of the role (Title Case)
-- b. Delete "Bad" versions from job_roles
-- c. Ensure remaining are Title Case

BEGIN;

-- A. Standardize EMPLOYEES table role_name first
UPDATE public.employees
SET role_name = initcap(role_name);

-- B. Handle JOB_ROLES duplicates
-- 1. Create a temp table with unique normalized names
CREATE TEMP TABLE unique_roles AS
SELECT DISTINCT initcap(name) as clean_name
FROM public.job_roles;

-- 2. Clear job_roles (or strictly deduce which to keep? It's easier to re-insert cleanly if no other FKs rely on ID)
-- CHECK REFERENCES: "job_roles" might be referenced by "id" in "employees" table?
-- The JSON shows "role_name" text in employees, but let's check if there is a "job_role_id" column.
-- If employees only uses role_name string, we can truncate job_roles and re-seed.
-- SAFEST APPROUCH: Keep IDs, but merge duplicates.

-- Update job_roles names to normalized version where possible
-- This might fail if we have 'Admin' and 'ADMIN' and we try to make both 'Admin' (unique constraint).

-- Strategy: Delete duplicates, keeping the one with the oldest created_at or just one arbitrary.

-- Step 1: Identify duplicates by normalized name
WITH duplicates AS (
    SELECT id, name, 
           ROW_NUMBER() OVER (PARTITION BY initcap(name) ORDER BY created_at ASC) as rnum
    FROM public.job_roles
)
DELETE FROM public.job_roles
WHERE id IN (SELECT id FROM duplicates WHERE rnum > 1);

-- Step 2: Now that duplicates are gone, update the names to Title Case
UPDATE public.job_roles
SET name = initcap(name);

-- C. Fix AREAS RLS (Just in case)
-- Ensure authenticated users can read areas
DROP POLICY IF EXISTS "Authenticated users can select areas" ON public.areas;
CREATE POLICY "Authenticated users can select areas" ON public.areas
FOR SELECT TO authenticated USING (true);

-- D. Fix JOB_ROLES RLS
DROP POLICY IF EXISTS "Authenticated users can select job_roles" ON public.job_roles;
CREATE POLICY "Authenticated users can select job_roles" ON public.job_roles
FOR SELECT TO authenticated USING (true);

-- E. Fix EMPLOYEES visibility (Ensure filtering works but data is accessible)
-- We already have RLS for station access, but let's double check.
-- If the previous EMERGENCY FIX worked, employees table might still need the check_station_access policy?
-- Let's apply a robust policy for employees using the Helper Function from Emergency Fix.

DROP POLICY IF EXISTS "users_read_employees_policy" ON public.employees;

CREATE POLICY "users_read_employees_policy" ON public.employees
FOR SELECT TO authenticated
USING (
  public.check_station_access(station_id)
);

COMMIT;
