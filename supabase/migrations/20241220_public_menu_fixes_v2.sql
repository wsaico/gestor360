-- ==========================================
-- SCRIPT DE CORRECCIÓN DEFINITIVA V2
-- ==========================================

-- 1. SOLUCIÓN "NO SALE ALERTA"
--    Causa: El usuario público (anon) no tenía permiso para LEER (SELECT) la tabla food_orders,
--    por lo tanto el frontend pensaba que no había pedidos previos.
--    Aquí habilitamos la lectura para que el sistema pueda detectar si ya pediste.

DROP POLICY IF EXISTS "Anon can view orders" ON food_orders;
CREATE POLICY "Anon can view orders" ON food_orders FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Anon can update orders" ON food_orders;
CREATE POLICY "Anon can update orders" ON food_orders FOR UPDATE TO anon USING (true);


-- 2. SOLUCIÓN "ERROR CONFLICTO / NO DEJA RE-PEDIR"
--    Causa: Existe una restricción UNIQUE antigua que impide duplicados incluso si cancelaste.
--    Este bloque busca y elimina CUALQUIER restricción unique sobre (employee_id, menu_date)
--    para dejar solo nuestro índice parcial que permite re-pedir tras cancelar.

DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Busca constraints únicas en la tabla food_orders que involucren employee_id y menu_date
    FOR r IN (
        SELECT conname 
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attnum = ANY(c.conkey)
        WHERE c.conrelid = 'food_orders'::regclass
        AND c.contype = 'u'
        AND a.attname = 'employee_id'
        -- No podemos filtrar fácilmente por ambas columnas en SQL simple sin joins complejos,
        -- pero borrar constraints duplicados por nombre "key" es seguro.
    ) LOOP
        -- Borramos cualquier constraint que huela a unicidad de fecha/empleado
        -- Típicamente se llaman food_orders_employee_id_menu_date_key
        IF r.conname LIKE '%employee_id_menu_date_key%' THEN
            EXECUTE 'ALTER TABLE food_orders DROP CONSTRAINT ' || quote_ident(r.conname);
        END IF;
    END LOOP;
END $$;

-- 3. APLICAR INDICE INTELIGENTE (Permite duplicados SOLO si el anterior está cancelado)
DROP INDEX IF EXISTS unique_active_order_per_date;
CREATE UNIQUE INDEX unique_active_order_per_date 
ON food_orders (employee_id, menu_date) 
WHERE status NOT IN ('CANCELLED', 'REJECTED');


-- 4. RE-VALIDAR RPC (Por seguridad, aseguramos que esté correcta)
CREATE OR REPLACE FUNCTION get_employee_by_dni_public(p_dni text)
RETURNS TABLE (
  id uuid,
  full_name text,
  dni text,
  role_name text,
  status text,
  station_id uuid,
  station_start_time time,
  station_end_time time,
  station_name text
) 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.full_name::text,
    e.dni::text,
    e.role_name::text,
    e.status::text,
    e.station_id,
    s.order_start_time,
    s.order_end_time,
    s.name::text
  FROM employees e
  JOIN stations s ON e.station_id = s.id
  WHERE e.dni = p_dni
  AND e.status != 'CESADO'
  ORDER BY e.created_at DESC;
END;
$$;
