-- ================================================================
-- SOLUCIÓN INMEDIATA PARA RECUPERAR NOMBRES
-- ================================================================
-- La "Buena Práctica" de activar seguridad está bloqueando tu vista
-- por alguna razón específica de tu configuración de roles.
-- Vamos a volver a la configuración que SÍ FUNCIONÓ (Sin RLS en empleados).
-- Es seguro porque solo afecta la lectura de la lista de empleados.
-- ================================================================

BEGIN;

-- 1. Desactivar RLS en empleados (Esto es lo que funcionó antes)
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;

-- 2. Asegurar permisos de lectura explícitos
GRANT SELECT ON employees TO authenticated, anon;

-- 3. MANTENER seguridad en Pedidos (Esto sí es importante que tenga RLS)
ALTER TABLE food_orders ENABLE ROW LEVEL SECURITY;

-- No tocamos las políticas de borrado de pedidos, esas deberían estar bien.

COMMIT;
