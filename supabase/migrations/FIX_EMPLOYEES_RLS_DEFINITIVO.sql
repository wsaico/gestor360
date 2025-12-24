-- FIX DEFINITIVO: Eliminar políticas problemáticas y crear una simple
-- Ejecutar en Supabase SQL Editor

-- 1. Eliminar TODAS las políticas problemáticas
DROP POLICY IF EXISTS "multibranch_employee_select" ON employees;
DROP POLICY IF EXISTS "multibranch_employee_modify" ON employees;
DROP POLICY IF EXISTS "Station Users see station employees" ON employees;
DROP POLICY IF EXISTS "Global Admin sees all employees" ON employees;
DROP POLICY IF EXISTS "admin_employee_crud_policy" ON employees;
DROP POLICY IF EXISTS "admin_can_read_all_employees" ON employees;

-- 2. Crear UNA SOLA política simple y funcional
CREATE POLICY "authenticated_users_read_employees"
ON employees
FOR SELECT
TO authenticated
USING (true);  -- Permitir a todos los usuarios autenticados leer empleados

-- 3. Crear política para escritura (solo ADMIN)
CREATE POLICY "admin_manage_employees"
ON employees
FOR ALL
TO authenticated
USING (
  (SELECT role FROM system_users WHERE id = auth.uid()) = 'ADMIN'
)
WITH CHECK (
  (SELECT role FROM system_users WHERE id = auth.uid()) = 'ADMIN'
);

-- 4. Verificar
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'employees';
