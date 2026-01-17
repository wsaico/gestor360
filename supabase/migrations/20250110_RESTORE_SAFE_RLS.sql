-- ================================================================
-- SCRIPT DE BUENAS PRÁCTICAS (RESTAURACIÓN SEGURA)
-- ================================================================
-- Ahora que sabemos que funciona, volvemos a activar la seguridad (RLS)
-- pero con la configuración CORRECTA y LIMPIA.
-- ================================================================

BEGIN;

-- 1. EMPLEADOS: Reactivar RLS pero permitir lectura GLOBAL (Autenticados)
-- Es una "Master Table", por lo que todos los usuarios logueados deben poder leerla.
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON employees;
CREATE POLICY "Enable read access for authenticated users" ON employees
FOR SELECT TO authenticated USING (true);


-- 2. FOOD_ORDERS: Restringir el borrado correctamente
-- Eliminamos el permiso "borrar todo" que pusimos temporalmente.
ALTER TABLE food_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow delete food_orders" ON food_orders;

CREATE POLICY "Allow delete food_orders" ON food_orders FOR DELETE TO authenticated
USING (
    -- Regla de Negocio Real:
    -- 1. Admins y Supervisores pueden borrar CUALQUIER pedido
    (EXISTS (SELECT 1 FROM system_users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPERVISOR', 'SUPERADMIN')))
    OR
    -- 2. Usuarios normales solo borran SUS pedidos si están PENDIENTES
    (auth.uid() = manual_entry_by AND status = 'PENDING')
);

COMMIT;
