-- SCRIPT: FIX_PROVIDER_LOGIN.sql
-- OBJECTIVE: Fix 403 on Provider Login.
-- ROOT CAUSE: Users likely cannot read their own 'employees' record to verify their role.
-- SOLUTION: Allow any authenticated user to read their own record in public.employees.

BEGIN;

-- 1. Asegurarse de que RLS esté activo (para aplicar políticas específicas)
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas que podrían estar entrando en conflicto (limpieza)
DROP POLICY IF EXISTS "Authenticated users can read own profile" ON public.employees;
DROP POLICY IF EXISTS "Users can read own data" ON public.employees;

-- 3. CREAR POLÍTICA DE AUTO-LECTURA (CRÍTICA PARA EL LOGIN)
-- Permite que CUALQUIER usuario logueado lea su propia fila en employees.
-- Esto es necesario para que el frontend sepa "Ah, soy Proveedor y estoy en la estación X".
CREATE POLICY "Authenticated users can read own profile"
ON public.employees
FOR SELECT
TO authenticated
USING (
  id = auth.uid() -- Solo puede leer su propia fila
  OR
  -- También mantenemos el acceso para Admins (leemos roles desde la misma tabla con la funcion security definer si es necesario, 
  -- pero para lectura directa esta regla cubre al propio usuario).
  -- Si queremos que el ADMIN lea todo, añadimos:
  (SELECT role_name FROM public.employees WHERE id = auth.uid()) IN ('ADMIN', 'SUPERADMIN', 'SUPERVISOR')
);

-- 4. Asegurar acceso a ESTACIONES para Proveedores
-- (Ya se hizo en scripts anteriores, pero reforzamos)
DROP POLICY IF EXISTS "Providers can view stations" ON public.stations;
CREATE POLICY "Providers can view stations"
ON public.stations
FOR SELECT
TO authenticated
USING (true); -- Permitimos ver todas las estaciones para simplificar (o filtrar si es estricto)

COMMIT;
