-- =====================================================
-- Script para corregir políticas RLS del módulo de alimentación
-- =====================================================
-- Este script deshabilita RLS temporalmente o crea políticas permisivas

-- OPCIÓN 1: Deshabilitar RLS completamente (para desarrollo/testing)
ALTER TABLE role_pricing_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE menus DISABLE ROW LEVEL SECURITY;
ALTER TABLE food_orders DISABLE ROW LEVEL SECURITY;

-- OPCIÓN 2: Crear políticas permisivas (si prefieres mantener RLS)
-- Descomentar las siguientes líneas si quieres usar RLS con políticas permisivas

/*
-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Allow all for authenticated users" ON role_pricing_config;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON menus;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON food_orders;

-- Crear políticas permisivas que permitan todo acceso
CREATE POLICY "Enable all access for all users" ON role_pricing_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for all users" ON menus FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for all users" ON food_orders FOR ALL USING (true) WITH CHECK (true);
*/

-- Verificar que RLS está deshabilitado
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('role_pricing_config', 'menus', 'food_orders')
ORDER BY tablename;
