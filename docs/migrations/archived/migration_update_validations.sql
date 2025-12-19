-- =====================================================
-- Migración: Validaciones y Configuración de Horarios
-- =====================================================

-- 1. Restricción de Unicidad (1 pedido por empleado por día por tipo de comida)
-- Primero, eliminamos duplicados si existen (opcional, por seguridad)
-- DELETE FROM food_orders a USING food_orders b
-- WHERE a.id < b.id
-- AND a.employee_id = b.employee_id
-- AND a.menu_date = b.menu_date
-- AND a.meal_type = b.meal_type;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'food_orders_employee_date_unique'
  ) THEN
    ALTER TABLE food_orders
      ADD CONSTRAINT food_orders_employee_date_unique
      UNIQUE (employee_id, menu_date);
  END IF;
END $$;

-- 2. Configuración de Horarios en Estaciones
DO $$
BEGIN
  -- Hora de apertura
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stations' AND column_name = 'order_start_time'
  ) THEN
    ALTER TABLE stations ADD COLUMN order_start_time TIME DEFAULT '00:00:00';
    COMMENT ON COLUMN stations.order_start_time IS 'Hora de inicio para realizar pedidos';
  END IF;

  -- Hora de cierre
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stations' AND column_name = 'order_end_time'
  ) THEN
    ALTER TABLE stations ADD COLUMN order_end_time TIME DEFAULT '23:59:59';
    COMMENT ON COLUMN stations.order_end_time IS 'Hora límite para realizar pedidos';
  END IF;
END $$;

-- 3. Actualizar la función RPC para devolver también los horarios de la estación
-- Dropeamos la anterior
DROP FUNCTION IF EXISTS get_employee_by_dni_public(TEXT);

CREATE OR REPLACE FUNCTION get_employee_by_dni_public(p_dni TEXT)
RETURNS TABLE (
  employee_id UUID,
  fullname VARCHAR,
  station_id UUID,
  role_name VARCHAR,
  station_start_time TIME,
  station_end_time TIME
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as employee_id,
    e.full_name as fullname,
    e.station_id,
    e.role_name,
    s.order_start_time,
    s.order_end_time
  FROM employees e
  JOIN stations s ON e.station_id = s.id
  WHERE e.dni = p_dni
  AND e.status = 'ACTIVO'
  LIMIT 1;
END;
$$;

-- Otorgar permisos nuevamente
GRANT EXECUTE ON FUNCTION get_employee_by_dni_public(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_employee_by_dni_public(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_employee_by_dni_public(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_employee_by_dni_public(TEXT) TO public;
