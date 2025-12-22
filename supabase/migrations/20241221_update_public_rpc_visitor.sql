-- ACTUALIZAR RPC PARA INCLUIR CAMPOS DE VISITANTE Y FECHA INGRESO
-- Esto soluciona el problema de visualización de precios en el Portal de Empleado (PublicMenuPage)

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
  station_name text,
  is_visitor boolean,
  visitor_discount_type text,
  hire_date date
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
    s.name::text,
    COALESCE(e.is_visitor, false) as is_visitor,
    e.visitor_discount_type::text,
    e.hire_date
  FROM employees e
  LEFT JOIN stations s ON e.station_id = s.id
  WHERE e.dni = p_dni
  AND e.status != 'CESADO';
END;
$$;

GRANT EXECUTE ON FUNCTION get_employee_by_dni_public(text) TO anon;
GRANT EXECUTE ON FUNCTION get_employee_by_dni_public(text) TO authenticated;
