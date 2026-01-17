-- =================================================================
-- MIGRATION: 20260114_fix_role_constraints.sql
-- PURPOSE: Remove restrictive role CHECK and enforce FK to app_roles
-- =================================================================

-- 1. Drop the legacy/restrictive Check Constraint
ALTER TABLE public.system_users DROP CONSTRAINT IF EXISTS system_users_role_check;

-- 2. Ensure all used roles exist in app_roles before adding FK
-- Add 'MONITOR' and 'PROVIDER' if they are missing but used in system_users/legacy logic
INSERT INTO public.app_roles (name, label, description, is_system, permissions)
VALUES 
  ('MONITOR', 'Monitor', 'Acceso de monitoreo', true, '["OPERATIONS_VIEW"]'),
  ('PROVIDER', 'Proveedor', 'Acceso externo limitado', true, '["OPERATIONS_VIEW"]')
ON CONFLICT (name) DO NOTHING;

-- 3. Add Foreign Key Constraint (Safety check)
DO $$ BEGIN
    ALTER TABLE public.system_users 
    ADD CONSTRAINT system_users_role_fkey 
    FOREIGN KEY (role) 
    REFERENCES public.app_roles(name) 
    ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
