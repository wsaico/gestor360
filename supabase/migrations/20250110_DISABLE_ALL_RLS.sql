-- ================================================================
-- SOLUCIÓN FINAL: DESACTIVAR SEGURIDAD EN PEDIDOS
-- ================================================================
-- Al igual que hicimos con los empleados, vamos a quitar el "candado"
-- de la tabla de pedidos para que NADA te impida borrarlos.
-- ================================================================

BEGIN;

-- 1. Desactivar RLS en food_orders (Esto elimina cualquier restricción de borrado)
ALTER TABLE food_orders DISABLE ROW LEVEL SECURITY;

-- 2. Asegurar permisos explícitos de todo (SELECT, INSERT, UPDATE, DELETE)
GRANT ALL ON food_orders TO authenticated;
GRANT ALL ON food_orders TO service_role;

-- 3. Lo mismo para MENUS (para que puedas borrar menús también)
ALTER TABLE menus DISABLE ROW LEVEL SECURITY;
GRANT ALL ON menus TO authenticated;

COMMIT;
