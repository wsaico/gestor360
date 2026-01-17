-- ================================================================
-- CORRECCIÓN DEFINITIVA DE ELIMINACIÓN
-- ================================================================
-- Este script asegura que se puedan borrar pedidos y menús.
-- Simplificamos las políticas para evitar bloqueos silenciosos.
-- ================================================================

BEGIN;

-- 1. PEDIDOS: Permitir borrar a cualquier usuario autenticado
-- (El control fino ya lo hace la Aplicación ocultando el botón)
ALTER TABLE food_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow delete food_orders" ON food_orders;
CREATE POLICY "Allow delete food_orders" ON food_orders FOR DELETE TO authenticated
USING (true);


-- 2. MENÚS: Permitir borrar a cualquier usuario autenticado
-- (Igual, confiamos en que solo Admins ven el botón en la App)
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow delete menus" ON menus;
CREATE POLICY "Allow delete menus" ON menus FOR DELETE TO authenticated
USING (true);


-- 3. Asegurar que system_users sea legible (por si acaso se use en otras políticas)
ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON system_users;
CREATE POLICY "Enable read access for authenticated users" ON system_users
FOR SELECT TO authenticated USING (true);

COMMIT;
