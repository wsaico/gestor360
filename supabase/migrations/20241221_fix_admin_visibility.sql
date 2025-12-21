-- =================================================================
-- FIX: Restore Global Access for Admin
-- =================================================================

-- 1. Identify the user "admin" (admin@gestor360.com) and set station_id to NULL
-- This effectively makes them a "Global Admin" again, bypassing RLS station restrictions.

UPDATE public.system_users 
SET station_id = NULL 
WHERE email = 'admin@gestor360.com';

-- 2. Ensure Role is 'ADMIN' (Just in case)
UPDATE public.system_users
SET role = 'ADMIN'
WHERE email = 'admin@gestor360.com';
