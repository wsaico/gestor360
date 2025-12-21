-- ==========================================
-- SCRIPT DE CORRECCIÓN INTEGRAL - GESTOR360
-- ==========================================

-- 1. CORREGIR RPC 'get_employee_by_dni_public'
--    Soluciona: "Hola Comensal" (Muestra nombre real)
--    Soluciona: "Jauja/Lima" (Toma el registro más reciente si hay duplicados)
--    Soluciona: Error 42804 (Type mismatch con ::text)

DROP FUNCTION IF EXISTS get_employee_by_dni_public(text);

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
  ORDER BY e.created_at DESC; -- Prioriza el más reciente
END;
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION get_employee_by_dni_public(text) TO anon;
GRANT EXECUTE ON FUNCTION get_employee_by_dni_public(text) TO authenticated;


-- 2. VALIDACIÓN DE DUPLICIDAD DE DNI
--    Evita que se creen nuevos empleados con DNI repetido.
--    Nota: Si ya hay duplicados, este comando podría fallar. 
--    Es recomendable limpiar duplicados antes, o usar 'soft enforcement' inicialmente.
--    Intentamos agregar la restricción segura.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'employees_dni_key'
    ) THEN
        ALTER TABLE employees ADD CONSTRAINT employees_dni_key UNIQUE (dni);
    END IF;
EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE 'No se pudo agregar constraint unique DNI porque ya existen duplicados. Limpie los datos manualmente.';
END $$;


-- 3. PERMITIR RE-PEDIR SI EL ANTERIOR FUE CANCELADO
--    Actualmente la restricción unique(employee_id, menu_date) bloquea todo.
--    La cambiamos por un indice parcial que IGNORA los cancelados.

-- Primero intentamos borrar la constraint vieja (nombre común, puede variar)
ALTER TABLE food_orders DROP CONSTRAINT IF EXISTS food_orders_employee_id_menu_date_key;

-- Creamos el indice parcial (Solo aplica unique si NO está cancelado/rechazado)
DROP INDEX IF EXISTS unique_active_order_per_date;
CREATE UNIQUE INDEX unique_active_order_per_date 
ON food_orders (employee_id, menu_date) 
WHERE status NOT IN ('CANCELLED', 'REJECTED');


-- 4. AGREGAR CAMPO NOTAS (Sugerencias)
ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS notes TEXT;


-- 5. POLÍTICAS DE SEGURIDAD (Refuerzo)
DROP POLICY IF EXISTS "Anon can insert orders" ON food_orders;
CREATE POLICY "Anon can insert orders" ON food_orders FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can read public menus" ON menus;
CREATE POLICY "Anon can read public menus" ON menus FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Anon can read pricing" ON role_pricing_config;
CREATE POLICY "Anon can read pricing" ON role_pricing_config FOR SELECT TO anon USING (true);
