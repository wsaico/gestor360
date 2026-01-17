-- ================================================================
-- GOLDEN STANDARD SECURITY SCRIPT
-- ================================================================
-- Cumpliendo con las BUENAS PRÁCTICAS:
-- 1. Activamos RLS (Row Level Security) en todas las tablas sensibles.
-- 2. Definimos políticas claras y específicas.
-- 3. Evitamos bucles infinitos en permisos.
-- ================================================================

BEGIN;

-- ================================================================
-- TABLA 1: SYSTEM_USERS (La base de los roles)
-- ================================================================
ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;

-- Limpieza previa
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON system_users;
DROP POLICY IF EXISTS "Authenticated users can read own profile" ON system_users;

-- Política: Todo usuario autenticado debe poder leer usuarios del sistema 
-- (Necesario para saber quién es Admin, Supervisor, etc.)
CREATE POLICY "Enable read access for authenticated users" ON system_users
FOR SELECT TO authenticated USING (true);


-- ================================================================
-- TABLA 2: EMPLOYEES (Maestra de empleados)
-- ================================================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Limpieza previa
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON employees;
DROP POLICY IF EXISTS "admin_can_read_all_employees" ON employees;

-- Política: Lista de lectura pública para usuarios del sistema
CREATE POLICY "Enable read access for authenticated users" ON employees
FOR SELECT TO authenticated USING (true);


-- ================================================================
-- TABLA 3: MENUS (Configuración diaria)
-- ================================================================
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;

-- Limpieza previa
DROP POLICY IF EXISTS "Allow delete menus" ON menus;

-- Política de BORRADO: Solo Admins y Supervisores
CREATE POLICY "Allow delete menus" ON menus FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM system_users 
        WHERE id = auth.uid() 
        AND role IN ('ADMIN', 'SUPERVISOR', 'SUPERADMIN')
    )
);

-- Política de LECTURA: Todos pueden ver los menús
CREATE POLICY "Enable read access for menus" ON menus
FOR SELECT TO authenticated USING (true);


-- ================================================================
-- TABLA 4: FOOD_ORDERS (Transaccional)
-- ================================================================
ALTER TABLE food_orders ENABLE ROW LEVEL SECURITY;

-- Limpieza previa
DROP POLICY IF EXISTS "Allow delete food_orders" ON food_orders;

-- Política de BORRADO: 
-- 1. Admins/Supervisores borran cualquiera.
-- 2. Usuario normal borra SOLO el suyo y SOLO si está PENDIENTE.
CREATE POLICY "Allow delete food_orders" ON food_orders FOR DELETE TO authenticated
USING (
    (EXISTS (
        SELECT 1 FROM system_users 
        WHERE id = auth.uid() 
        AND role IN ('ADMIN', 'SUPERVISOR', 'SUPERADMIN', 'PROVIDER')
    ))
    OR
    (auth.uid() = manual_entry_by AND status = 'PENDING')
);

-- Política de LECTURA: Ver mis pedidos o si soy admin
CREATE POLICY "Enable read access for food_orders" ON food_orders
FOR SELECT TO authenticated USING (
    (auth.uid() = manual_entry_by)
    OR
    (auth.uid() = employee_id) -- Por si acaso
    OR
    (EXISTS (
        SELECT 1 FROM system_users 
        WHERE id = auth.uid() 
        AND role IN ('ADMIN', 'SUPERVISOR', 'SUPERADMIN', 'PROVIDER')
    ))
);

COMMIT;
