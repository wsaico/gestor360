-- SCRIPT: NUCLEAR_DISABLE_RLS.sql
-- OBJECTIVE: Disable RLS completely on employees table.
-- WARNING: This removes all permission checks. Use only for debugging/emergency.
-- DATE: 2025-12-24

BEGIN;

-- 1. DESACTIVAR LA SEGURIDAD (RLS) EN LA TABLA EMPLEADOS
-- Esto permitirá que insertes SIN NINGUNA RESTRICCIÓN.
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;

-- 2. Asegurarse de que el usuario ADMIN tenga el rol correcto (por si acaso)
UPDATE public.employees
SET role_name = 'ADMIN'
WHERE email = 'admin@gestor360.com';

COMMIT;
