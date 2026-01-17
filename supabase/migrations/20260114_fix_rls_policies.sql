-- =================================================================
-- MIGRATION: 20260114_fix_rls_policies.sql
-- PURPOSE: Fix RLS Policies to allow ADMINs to Create/Edit Users
-- STRATEGY: Use JWT Metadata to avoid recursion (Infinite loop)
-- =================================================================

-- 1. SYSTEM_USERS POLICIES
ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;

-- 1.1 Allow Read for Authenticated Users (Keep existing or recreate)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.system_users;
CREATE POLICY "Enable read access for authenticated users" ON public.system_users
    FOR SELECT TO authenticated USING (true);

-- 1.2 Allow Full Management for ADMINs
-- We check the role from the JWT metadata to safeguard against recursion
DROP POLICY IF EXISTS "Admins can manage system_users" ON public.system_users;
CREATE POLICY "Admins can manage system_users" ON public.system_users
    FOR ALL TO authenticated
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN'
    )
    WITH CHECK (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN'
    );


-- 2. APP_ROLES POLICIES
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;

-- 2.1 Allow Read for Authenticated Users
DROP POLICY IF EXISTS "read_roles_authenticated" ON public.app_roles;
CREATE POLICY "read_roles_authenticated" ON public.app_roles
    FOR SELECT TO authenticated USING (true);

-- 2.2 Allow Management for ADMINs
DROP POLICY IF EXISTS "super_admin_manage_roles" ON public.app_roles;
CREATE POLICY "super_admin_manage_roles" ON public.app_roles
    FOR ALL TO authenticated
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN'
    )
    WITH CHECK (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN'
    );
