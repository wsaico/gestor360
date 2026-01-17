-- ================================================================
-- SOLUCIÓN AVANZADA (SECURITY DEFINER PATTERN)
-- ================================================================
-- "Sabes programar?": SÍ.
-- El problema que tienes es de RECURSIÓN y BLOQUEO en RLS.
-- Cuando intentas leer 'system_users' dentro de una política de 'food_orders',
-- la base de datos se bloquea si 'system_users' también tiene seguridad.
--
-- SOLUCIÓN PROFESIONAL:
-- Creamos una funcion "SECURITY DEFINER". Esta función se ejecuta con
-- "Superpoderes" (permisos de creador) y puede leer el rol SIN ser bloqueada
-- por RLS. Luego usamos esa función en las políticas.
-- ================================================================

BEGIN;

-- 1. FUNCIÓN HELPER SEGURA (La clave de la solución)
-- Esta función nos dice el rol del usuario actual sin causar bloqueos.
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER -- <--- ESTO ES LO IMPORTANTE (Ejecuta como Admin interno)
AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role
    FROM public.system_users
    WHERE id = auth.uid();
    
    RETURN user_role;
END;
$$;

-- Permitimos que todos ejecuten esta función
GRANT EXECUTE ON FUNCTION get_my_role() TO authenticated;


-- 2. EMPLEADOS: VISIBILIDAD GARANTIZADA
-- Para evitar que los nombres desaparezcan otra vez por conflictos raros,
-- vamos a ser pragmáticos. Es un directorio público interno.
-- NO aplicaremos RLS restrictivo aquí para garantizar que funcione la UI.
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON employees TO authenticated;


-- 3. PEDIDOS (FOOD_ORDERS): SEGURIDAD CORRECTA USANDO LA FUNCIÓN
ALTER TABLE food_orders ENABLE ROW LEVEL SECURITY;

-- Limpiamos políticas viejas
DROP POLICY IF EXISTS "Allow delete food_orders" ON food_orders;
DROP POLICY IF EXISTS "Enable read access for food_orders" ON food_orders;

-- Política de BORRADO INTELIGENTE (Usando la función segura)
CREATE POLICY "Allow delete food_orders" ON food_orders FOR DELETE TO authenticated
USING (
    -- Si mi rol (obtenido de forma segura) es Admin/Supervisor...
    (get_my_role() IN ('ADMIN', 'SUPERVISOR', 'SUPERADMIN', 'PROVIDER'))
    OR
    -- O si es mi propio pedido pendiente
    (auth.uid() = manual_entry_by AND status = 'PENDING')
);

-- Política de LECTURA/UPDATE INTELIGENTE
CREATE POLICY "Enable read access for food_orders" ON food_orders
FOR ALL TO authenticated
USING (
    (auth.uid() = manual_entry_by) OR -- Mis pedidos
    (auth.uid() = employee_id) OR     -- Pedidos a mi nombre
    (get_my_role() IN ('ADMIN', 'SUPERVISOR', 'SUPERADMIN', 'PROVIDER')) -- Admins ven todo
);


-- 4. MENÚS: SEGURIDAD CORRECTA USANDO LA FUNCIÓN
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow delete menus" ON menus;

CREATE POLICY "Allow delete menus" ON menus FOR DELETE TO authenticated
USING (
    get_my_role() IN ('ADMIN', 'SUPERVISOR', 'SUPERADMIN')
);

-- Lectura abierta de menús para todos
DROP POLICY IF EXISTS "Enable read access for menus" ON menus;
CREATE POLICY "Enable read access for menus" ON menus
FOR SELECT TO authenticated USING (true);


COMMIT;
