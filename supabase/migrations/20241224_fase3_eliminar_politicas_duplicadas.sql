-- =====================================================
-- FASE 3: Eliminar Políticas RLS Duplicadas
-- =====================================================
-- IMPORTANTE: Crear backup antes de ejecutar
-- Este script elimina políticas redundantes identificadas
-- =====================================================

-- =====================================================
-- 1. app_settings: 8 políticas → 2 políticas
-- =====================================================
-- Eliminar políticas duplicadas y conflictivas

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON app_settings;
DROP POLICY IF EXISTS "Enable read access for all users" ON app_settings;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON app_settings;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON app_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON app_settings;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON app_settings;
DROP POLICY IF EXISTS "Enable write access for admins only" ON app_settings;

-- Mantener solo estas 2:
-- "Allow read access for authenticated users" (lectura)
-- "Allow write access for admins" (escritura solo admins)

-- =====================================================
-- 2. announcements: 5 políticas → 3 políticas
-- =====================================================

DROP POLICY IF EXISTS "Authenticated manage announcements" ON announcements;
DROP POLICY IF EXISTS "Authenticated read all announcements" ON announcements;

-- Mantener:
-- "Admins can manage announcements" (admins gestionan)
-- "Anyone can read announcements" (todos leen)
-- "Public read active announcements" (anon lee activos)

-- =====================================================
-- 3. food_orders: 8 políticas → 6 políticas
-- =====================================================

DROP POLICY IF EXISTS "Allow all for authenticated users" ON food_orders;
DROP POLICY IF EXISTS "Allow public insert" ON food_orders;

-- Mantener:
-- "Anon can insert orders"
-- "Anon can view orders"
-- "Anon can update orders"
-- "Allow delete food_orders"
-- "Global Admin sees all orders"
-- "Users see orders in their station"

-- =====================================================
-- 4. employees: Eliminar duplicadas
-- =====================================================

DROP POLICY IF EXISTS "admin_employee_crud_policy" ON employees;

-- Mantener:
-- "Global Admin sees all employees"
-- "Station Users see station employees"
-- "multibranch_employee_modify"
-- "multibranch_employee_select"

-- =====================================================
-- 5. areas: Eliminar duplicadas
-- =====================================================

DROP POLICY IF EXISTS "admin_areas_crud_policy" ON areas;

-- Mantener:
-- "admins_manage_areas"
-- "multibranch_area_select"

-- =====================================================
-- 6. master_products: Consolidar en una sola
-- =====================================================

DROP POLICY IF EXISTS "Delete products" ON master_products;
DROP POLICY IF EXISTS "Insert products" ON master_products;
DROP POLICY IF EXISTS "Update products" ON master_products;
DROP POLICY IF EXISTS "Select products" ON master_products;

-- Mantener:
-- "Enable unrestricted access for authenticated users"

-- =====================================================
-- 7. menus: Eliminar duplicadas
-- =====================================================

DROP POLICY IF EXISTS "Allow all for authenticated users" ON menus;
DROP POLICY IF EXISTS "Allow public read access" ON menus;
DROP POLICY IF EXISTS "Public read menus" ON menus;

-- Mantener:
-- "Anon can read public menus"
-- "Global Admin manages menus"
-- "Station Admin manages station menus"

-- =====================================================
-- 8. product_categories: Consolidar
-- =====================================================

DROP POLICY IF EXISTS "Delete categories" ON product_categories;
DROP POLICY IF EXISTS "Insert categories" ON product_categories;
DROP POLICY IF EXISTS "Update categories" ON product_categories;
DROP POLICY IF EXISTS "Select categories" ON product_categories;

-- Mantener:
-- "Enable unrestricted access for authenticated users"

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Ver políticas restantes por tabla
SELECT 
    tablename,
    COUNT(*) as num_policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
HAVING COUNT(*) > 3
ORDER BY num_policies DESC;

-- =====================================================
-- RESULTADO ESPERADO
-- =====================================================
-- app_settings: 8 → 2 (6 eliminadas)
-- announcements: 5 → 3 (2 eliminadas)
-- food_orders: 8 → 6 (2 eliminadas)
-- employees: 5 → 4 (1 eliminada)
-- areas: 3 → 2 (1 eliminada)
-- master_products: 5 → 1 (4 eliminadas)
-- menus: 6 → 3 (3 eliminadas)
-- product_categories: 5 → 1 (4 eliminadas)
-- 
-- TOTAL: ~23 políticas eliminadas
