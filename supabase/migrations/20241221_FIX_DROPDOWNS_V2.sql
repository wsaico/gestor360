-- =================================================================
-- SCRIPT: 20241221_FIX_DROPDOWNS_V2.sql
-- PURPOSE: FORCE FIX for Duplicates with "Delete First" strategy
-- =================================================================

-- 1. CLEANUP DUPLICATES (SMARTER WAY)
-- We cannot simply UPDATE first because it hits standard unique constraints.
-- We must identify "groups" of names that result in the same Title Case,
-- and delete all but one BEFORE updating.

-- A. Disable RLS to ensure full access for maintenance
ALTER TABLE public.job_roles DISABLE ROW LEVEL SECURITY;

-- B. Delete "Duplicate Candidates"
-- We group by what the name WILL BE (initcap(name)).
-- We keep the one with the smallest ID (MIN(id)).
-- We delete everyone else.
DELETE FROM public.job_roles
WHERE id IN (
    SELECT id
    FROM (
        SELECT 
            id,
            -- Partition by the TARGET normalized name
            ROW_NUMBER() OVER (PARTITION BY initcap(name) ORDER BY id ASC) as rn
        FROM public.job_roles
    ) t
    WHERE t.rn > 1
);

-- C. Apply Normalization
-- Now it is safe to update because duplicates are gone.
UPDATE public.job_roles SET name = initcap(name);

-- D. Re-Enable RLS and Open Access
ALTER TABLE public.job_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_job_roles" ON public.job_roles;
CREATE POLICY "read_job_roles" ON public.job_roles 
FOR SELECT TO authenticated 
USING (true); -- Everyone can read roles

-- 2. FIX AREAS (ÁREAS) - GLOBAL ADMIN VISIBILITY
-- Ensure Global Admin (station_id IS NULL) can see ALL areas
DROP POLICY IF EXISTS "areas_isolation_policy" ON public.areas;
DROP POLICY IF EXISTS "read_areas_policy" ON public.areas;

CREATE POLICY "read_areas_policy" ON public.areas
FOR SELECT TO authenticated
USING (
  -- Option 1: User is Global Admin (station_id is NULL)
  (SELECT station_id FROM public.system_users WHERE id = auth.uid()) IS NULL
  OR
  -- Option 2: User belongs to the same station as the area
  station_id = (SELECT station_id FROM public.system_users WHERE id = auth.uid())
);

-- 3. FIX EMPLOYEES DATA
-- Normalize the stored role names in employees table too, to match the new job_roles
UPDATE public.employees SET role_name = initcap(role_name);

-- Ensure RLS allows visibility
DROP POLICY IF EXISTS "users_read_employees_policy" ON public.employees;
CREATE POLICY "users_read_employees_policy" ON public.employees
FOR SELECT TO authenticated
USING (
  -- Option 1: Global Admin
  (SELECT station_id FROM public.system_users WHERE id = auth.uid()) IS NULL
  OR
  -- Option 2: Same Station
  station_id = (SELECT station_id FROM public.system_users WHERE id = auth.uid())
);

-- 4. VERIFICATION
SELECT 'DUPLICATES_REMAINING' as check_type, count(*) as count 
FROM (
    SELECT initcap(name) 
    FROM public.job_roles 
    GROUP BY initcap(name) 
    HAVING count(*) > 1
) sub;
