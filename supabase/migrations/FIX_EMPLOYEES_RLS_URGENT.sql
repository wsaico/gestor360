-- DIAGNÓSTICO Y FIX URGENTE: Empleados no visibles
-- Ejecutar en Supabase SQL Editor

-- 1. Ver políticas actuales de employees
SELECT policyname, cmd, qual::text as using_clause
FROM pg_policies
WHERE tablename = 'employees';

-- 2. SOLUCIÓN TEMPORAL: Crear política simple para que ADMIN vea todos los empleados
DROP POLICY IF EXISTS "admin_can_read_all_employees" ON employees;

CREATE POLICY "admin_can_read_all_employees"
ON employees
FOR SELECT
TO authenticated
USING (
  -- Permitir a todos los usuarios autenticados leer empleados
  -- (Esto es temporal para diagnosticar el problema)
  true
);

-- 3. Verificar que se creó
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'employees';
