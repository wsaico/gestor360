-- ================================================================
-- SCRIPT DE LIMPIEZA TOTAL (NUKE)
-- ================================================================
-- Tienes muchas políticas "basura" antiguas que están causando conflictos.
-- Este script ELIMINA ESPECÍFICAMENTE las que me mostraste.
-- ================================================================

BEGIN;

-- 1. LIMBIAR TABLA EMPLOYEES (Tienes 4 políticas, dejaremos 1)
DROP POLICY IF EXISTS "admin_can_read_all_employees" ON employees;
DROP POLICY IF EXISTS "Emergency Open Access" ON employees;
DROP POLICY IF EXISTS "Authenticated users can read own profile" ON employees;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON employees;

-- Recrear la ÚNICA necesaria (Simple y abierta para lectura)
CREATE POLICY "Enable read access for authenticated users" ON employees
FOR SELECT TO authenticated USING (true);


-- 2. LIMPIAR TABLA FOOD_ORDERS (Asegurar limpieza)
DROP POLICY IF EXISTS "Allow delete food_orders" ON food_orders;
DROP POLICY IF EXISTS "Users can delete their own pending orders" ON food_orders;
DROP POLICY IF EXISTS "Allow delete for admins" ON food_orders;
-- (Añade aquí cualquier otra que veas duplicada si es necesario, pero estas son las comunes)

CREATE POLICY "Allow delete food_orders" ON food_orders FOR DELETE TO authenticated
USING (
    -- Admin, Supervisor, Provider, Superadmin
    (EXISTS (SELECT 1 FROM system_users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPERVISOR', 'PROVIDER', 'SUPERADMIN')))
    OR
    -- Dueño del pedido (si está pendiente)
    (auth.uid() = manual_entry_by AND status = 'PENDING')
);

COMMIT;
