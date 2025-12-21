-- =================================================================
-- MIGRATION: 20241221_create_role_management.sql
-- PURPOSE: Create support for Dynamic Role Management
-- =================================================================

-- 1. Create Roles Table
CREATE TABLE IF NOT EXISTS public.app_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- Internal ID (e.g. 'ADMIN', 'LOGISTICS_MANAGER')
    label TEXT NOT NULL,       -- Display Name (e.g. 'Administrador')
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb, -- Array of capabilities
    is_system BOOLEAN DEFAULT false, -- Protected roles cannot be deleted
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- READ: Authenticated users can read roles (for dropdowns/checking)
DROP POLICY IF EXISTS "read_roles_authenticated" ON public.app_roles;
CREATE POLICY "read_roles_authenticated" ON public.app_roles
FOR SELECT TO authenticated
USING (true);

-- MODIFY: Only Global Admin can create/edit/delete roles
DROP POLICY IF EXISTS "super_admin_manage_roles" ON public.app_roles;
CREATE POLICY "super_admin_manage_roles" ON public.app_roles
FOR ALL TO authenticated
USING (
  -- Re-use the logic from check_station_access for Global Admin
  EXISTS (SELECT 1 FROM public.system_users WHERE id = auth.uid() AND role = 'ADMIN' AND station_id IS NULL)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.system_users WHERE id = auth.uid() AND role = 'ADMIN' AND station_id IS NULL)
);

-- 4. Seed Standard Roles
INSERT INTO public.app_roles (name, label, description, is_system, permissions)
VALUES 
  ('ADMIN', 'Administrador', 'Acceso administrativo total a su estación (o global)', true, '["ALL_ACCESS"]'),
  ('OPERATOR', 'Operador', 'Acceso operativo básico', true, '["OPERATIONS_VIEW", "OPERATIONS_EDIT"]'),
  ('SUPERVISOR', 'Supervisor', 'Acceso de supervisión y reportes', true, '["OPERATIONS_VIEW", "REPORTS_VIEW", "EMPLOYEES_VIEW"]')
ON CONFLICT (name) DO UPDATE SET 
  is_system = EXCLUDED.is_system;
