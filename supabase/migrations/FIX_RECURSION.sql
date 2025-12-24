-- SCRIPT: FIX_RECURSION.sql
-- OBJECTIVE: Eliminate "infinite recursion" error in RLS policies.
-- PROBLEM: The policy on 'employees' queries 'employees' to check the role, creating a loop.
-- SOLUTION: Use a SECURITY DEFINER function to read the role 'outside' the RLS rules.

BEGIN;

-- 1. Crear función segura para leer el rol (Rompe el ciclo infinito)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER -- ¡Esta es la clave! Se ejecuta como superusuario, ignorando RLS.
SET search_path = public
STABLE
AS $$
  SELECT role_name FROM public.employees WHERE id = auth.uid();
$$;

-- 2. Recrear la política de empleados usando la función segura
DROP POLICY IF EXISTS "Authenticated users can read own profile" ON public.employees;

CREATE POLICY "Authenticated users can read own profile"
ON public.employees
FOR SELECT
TO authenticated
USING (
  id = auth.uid() -- El usuario puede ver su propia fila
  OR
  -- Usamos la función segura en lugar del SELECT directo
  public.get_current_user_role() IN ('ADMIN', 'SUPERADMIN', 'SUPERVISOR')
);

-- 3. (Opcional) Asegurar que la política de actualización también sea segura
-- Si hubiera una política de UPDATE, aplicaría lógica similar.
-- Por ahora la de SELECT es la que causaba el error de visualización.

COMMIT;
