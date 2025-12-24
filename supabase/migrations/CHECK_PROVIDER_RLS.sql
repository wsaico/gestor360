-- SCRIPT: CHECK_PROVIDER_RLS.sql
-- OBJECTIVE: Check what tables a "PROVIDER" likely touches on login and if RLS blocks them.
-- DATE: 2025-12-24

-- 1. Check if 'system_users' (our main view/table for roles) is readable by generic authenticated users
--    Providers are just 'authenticated' users with a specific roleclaim or metadata.
--    If RLS on underlying tables (employees? profiles?) is too strict, they can't see themselves.

-- Check policies on 'employees' (where system_users usually pulls from)
SELECT * FROM pg_policies WHERE tablename = 'employees';

-- Check policies on 'stations' (needed for context)
SELECT * FROM pg_policies WHERE tablename = 'stations';

-- 2. Try to verify if there is a policy allowing users to read THEIR OWN record
-- Look for "uid() = id" or "auth.uid() = id" in policies.

-- 3. Check if there is a 'provider_profiles' or similar specific table
SELECT * FROM pg_policies WHERE tablename LIKE '%provider%';
