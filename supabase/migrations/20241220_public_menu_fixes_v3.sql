-- ==========================================
-- SCRIPT "NUCLEAR" V3 - CORRECCIÓN TOTAL
-- ==========================================

-- 1. HABILITAR LECTURA PÚBLICA (Para que salga la alerta)
--    Si esto no está, el frontend "no ve" el pedido y te deja intentar crearlo de nuevo (Error 409).
DROP POLICY IF EXISTS "Anon can view orders" ON food_orders;
CREATE POLICY "Anon can view orders" ON food_orders FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Anon can update orders" ON food_orders;
CREATE POLICY "Anon can update orders" ON food_orders FOR UPDATE TO anon USING (true);


-- 2. ELIMINAR RESTRICCIONES REBELDES (Para permitir re-pedir tras cancelar)
--    Vamos a ser muy agresivos para borrar cualquier constraint de unicidad que esté estorbando.

DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Borrar constraints UNIQUE formales
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'food_orders'::regclass 
        AND contype = 'u'
    ) LOOP
        EXECUTE 'ALTER TABLE food_orders DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;

    -- Borrar índices UNIQUE (A veces los indices quedan huerfanos y actuan como constraints)
    FOR r IN (
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'food_orders' 
        AND indexdef LIKE '%UNIQUE%'
    ) LOOP
        EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(r.indexname);
    END LOOP;
END $$;

-- 3. CREAR LA ÚNICA RESTRICCIÓN VÁLIDA (Indice Parcial)
--    Solo bloquea si el estado NO es Cancelado ni Rechazado.
CREATE UNIQUE INDEX unique_active_order_per_date 
ON food_orders (employee_id, menu_date) 
WHERE status NOT IN ('CANCELLED', 'REJECTED');


-- 4. VERIFICACIÓN DE CASTING EN RPC (Para evitar errores de tipo)
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
