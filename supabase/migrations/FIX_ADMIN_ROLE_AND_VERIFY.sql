-- SCRIPT: FIX_ADMIN_ROLE_AND_VERIFY.sql
-- OBJECTIVE: Force update admin role and verify it propagates to system_users
-- DATE: 2025-12-24

BEGIN;

-- 1. Force Update employees table
UPDATE public.employees
SET role_name = 'ADMIN',
    updated_at = NOW()
WHERE email = 'admin@gestor360.com';

-- 2. Force Update profiles table if it exists (sometimes system_users reads from here)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    UPDATE public.profiles
    SET role = 'ADMIN'
    WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@gestor360.com');
  END IF;
END $$;

-- 3. Show System Users View Definition (to understand where it gets data)
SELECT definition 
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname = 'system_users';

-- 4. Verify result using our debug function
SELECT public.get_debug_role();

COMMIT;
