-- ================================================================
-- PRUEBA DEFINITIVA: DESACTIVAR SEGURIDAD (SOLO TEST)
-- ================================================================
-- Esto nos dirá si es un problema de PERMISOS o de DATOS FALTANTES.
-- ================================================================

BEGIN;

-- 1. Desactivamos la seguridad en la tabla empleados
-- Si después de esto NO ves los nombres, significa que esos empleados 
-- FUERON BORRADOS de la base de datos permanentemente.
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;

-- 2. Verificación rápida de existencia de uno de los IDs que fallan
DO $$ 
DECLARE
    found_name text;
BEGIN
    SELECT full_name INTO found_name FROM employees WHERE id = '23f74ed3-b44a-43f8-af64-5e761c973e54';
    
    IF found_name IS NOT NULL THEN
        RAISE NOTICE 'EL EMPLEADO EXISTE: %', found_name;
    ELSE
        RAISE NOTICE 'EL EMPLEADO NO EXISTE (Es un ID huérfano)';
    END IF;
END $$;

COMMIT;
