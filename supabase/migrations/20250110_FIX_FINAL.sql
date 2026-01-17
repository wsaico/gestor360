-- ================================================================
-- SCRIPT DE CORRECCIÓN FINAL - POLÍTICAS DE SEGURIDAD (RLS)
-- ================================================================
-- Ejecuta todo este script en el Editor SQL de Supabase.
-- ================================================================

BEGIN;

-- 1. EMPLEADOS: Permitir que TODOS los usuarios vean los nombres
-- Esto soluciona el error de "ID: ..." en rojo.
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON employees;
DROP POLICY IF EXISTS "public_employees_read" ON employees;
-- Política simple: Si estás logueado, puedes leer la tabla employees.
CREATE POLICY "Enable read access for authenticated users" ON employees
FOR SELECT TO authenticated USING (true); 


-- 2. USUARIOS DEL SISTEMA: Permitir lectura para validación de roles
-- Necesario para saber si eres ADMIN o SUPERVISOR.
ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON system_users;
CREATE POLICY "Enable read access for authenticated users" ON system_users
FOR SELECT TO authenticated USING (true);


-- 3. PEDIDOS (Food Orders): Permitir ELIMINAR
-- Soluciona que no aparezca el botón de borrar o falle al usarlo.
ALTER TABLE food_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow delete food_orders" ON food_orders;
CREATE POLICY "Allow delete food_orders" ON food_orders FOR DELETE TO authenticated
USING (
    -- Opción A: Eres Admin, Supervisor, Proveedor o Superadmin
    (EXISTS (SELECT 1 FROM system_users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPERVISOR', 'PROVIDER', 'SUPERADMIN')))
    OR
    -- Opción B: Es TU pedido y está PENDIENTE
    (auth.uid() = manual_entry_by AND status = 'PENDING')
);


-- 4. MENÚS: Permitir ELIMINAR
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow delete menus" ON menus;
CREATE POLICY "Allow delete menus" ON menus FOR DELETE TO authenticated
USING (
    -- Solo Admins y Supervisores pueden borrar menús
    EXISTS (SELECT 1 FROM system_users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPERVISOR', 'SUPERADMIN'))
);

COMMIT;
