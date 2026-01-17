-- ================================================================
-- SCRIPT DE LIMPIEZA TOTAL V2 (CORREGIDO Y AMPLIADO)
-- ================================================================
-- Este script ELIMINA TODAS las políticas conflictivas detectadas.
-- Ejecútalo COMPLETO en el SQL Editor de Supabase.
-- ================================================================

BEGIN;

-- 1. LIMPIAR EMPLOYEES (La causa de "Role Unknown")
-- Eliminamos TODAS las variantes encontradas en tu diagnóstico
DROP POLICY IF EXISTS "admin_can_read_all_employees" ON employees;
DROP POLICY IF EXISTS "Emergency Open Access" ON employees;
DROP POLICY IF EXISTS "Authenticated users can read own profile" ON employees;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON employees;
DROP POLICY IF EXISTS "public_employees_read" ON employees;
DROP POLICY IF EXISTS "multibranch_employee_select" ON employees;

-- Creamos LA ÚNICA política necesaria:
CREATE POLICY "Enable read access for authenticated users" ON employees
FOR SELECT TO authenticated USING (true);


-- 2. LIMPIAR SYSTEM_USERS (Para evitar errores de recursión)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON system_users;
CREATE POLICY "Enable read access for authenticated users" ON system_users
FOR SELECT TO authenticated USING (true);


-- 3. LIMPIAR FOOD_ORDERS (Para permitir borrar)
DROP POLICY IF EXISTS "Allow delete food_orders" ON food_orders;
DROP POLICY IF EXISTS "Users can delete their own pending orders" ON food_orders;
DROP POLICY IF EXISTS "Allow delete for admins" ON food_orders;

CREATE POLICY "Allow delete food_orders" ON food_orders FOR DELETE TO authenticated
USING (
    -- Admins/Supervisores borran todo
    (EXISTS (SELECT 1 FROM system_users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPERVISOR', 'PROVIDER', 'SUPERADMIN')))
    OR
    -- Usuarios borran sus pendientes
    (auth.uid() = manual_entry_by AND status = 'PENDING')
);


-- 4. LIMPIAR MENUS
DROP POLICY IF EXISTS "Allow delete menus" ON menus;
CREATE POLICY "Allow delete menus" ON menus FOR DELETE TO authenticated
USING (
    EXISTS (SELECT 1 FROM system_users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPERVISOR', 'SUPERADMIN'))
);

COMMIT;
