-- ==========================================
-- SCRIPT "QUIRÚRGICO" V4 - CORRECCIÓN SEGURA
-- ==========================================

-- 1. HABILITAR LECTURA PÚBLICA (RLS)
DROP POLICY IF EXISTS "Anon can view orders" ON food_orders;
CREATE POLICY "Anon can view orders" ON food_orders FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Anon can update orders" ON food_orders;
CREATE POLICY "Anon can update orders" ON food_orders FOR UPDATE TO anon USING (true);


-- 2. ELIMINAR SOLO RESTRICCIONES DE UNICIDAD (Respetando la Primary Key)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Borrar constraints UNIQUE formales (Excluyendo Primary Key que suele ser 'p')
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'food_orders'::regclass 
        AND contype = 'u' -- Solo Unique, no Primary Key ('p')
    ) LOOP
        -- Borramos la constraint
        EXECUTE 'ALTER TABLE food_orders DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;

    -- Borrar índices UNIQUE rebeldes (Excluyendo PKEY explícitamente)
    FOR r IN (
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'food_orders' 
        AND indexdef LIKE '%UNIQUE%'
        AND indexname NOT LIKE '%pkey' -- IMPORTANTE: No tocar la Primary Key
    ) LOOP
        EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(r.indexname);
    END LOOP;
END $$;

-- 3. CREAR LA ÚNICA RESTRICCIÓN VÁLIDA (Indice Parcial)
--    Solo bloquea si el estado NO es Cancelado ni Rechazado.
DROP INDEX IF EXISTS unique_active_order_per_date;
CREATE UNIQUE INDEX unique_active_order_per_date 
ON food_orders (employee_id, menu_date) 
WHERE status NOT IN ('CANCELLED', 'REJECTED');


-- 4. VERIFICACIÓN FINAL DE RPC
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
