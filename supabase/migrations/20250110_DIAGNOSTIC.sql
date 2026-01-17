-- SCRIPT DE DIAGNÓSTICO
-- Ejecuta esto en el SQL Editor y envíame una captura de los RESULTADOS.

-- 1. Verificar si el empleado exsite en la base de datos
SELECT id, full_name, role_name 
FROM employees 
WHERE id = '23f74ed3-b44a-43f8-af64-5e761c973e54';

-- 2. Ver qué políticas están activas realmente
SELECT policyname, cmd, roles, qual 
FROM pg_policies 
WHERE tablename = 'employees';
