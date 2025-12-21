-- 1. Agregar columna 'notes' a food_orders si no existe
ALTER TABLE food_orders 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Actualizar (o crear) la función RPC para buscar empleados por DNI de forma pública
-- IMPORTANTE: Eliminamos la función previa para poder cambiar su tipo de retorno sin errores
DROP FUNCTION IF EXISTS get_employee_by_dni_public(text);

-- SECURITY DEFINER permite que 'anon' la ejecute con permisos del creador (bypass RLS parcial para lectura)
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
    e.full_name::text,      -- Cast explícito a text para evitar error 42804
    e.dni::text,            -- Cast explícito
    e.role_name::text,      -- Cast explícito
    e.status::text,         -- Cast explícito
    e.station_id,
    s.order_start_time,
    s.order_end_time,
    s.name::text            -- Cast explícito
  FROM employees e
  JOIN stations s ON e.station_id = s.id
  WHERE e.dni = p_dni
  AND e.status != 'CESADO'
  ORDER BY e.created_at DESC; -- PRIORIDAD: El registro más reciente primero
END;
$$;

-- 3. Asegurar permisos para el rol 'anon' y 'authenticated'
GRANT EXECUTE ON FUNCTION get_employee_by_dni_public(text) TO anon;
GRANT EXECUTE ON FUNCTION get_employee_by_dni_public(text) TO authenticated;

-- 4. Actualizar políticas RLS para food_orders
DROP POLICY IF EXISTS "Anon can insert orders" ON food_orders;
CREATE POLICY "Anon can insert orders" ON food_orders FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can read public menus" ON menus;
CREATE POLICY "Anon can read public menus" ON menus FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Anon can read pricing" ON role_pricing_config;
CREATE POLICY "Anon can read pricing" ON role_pricing_config FOR SELECT TO anon USING (true);
