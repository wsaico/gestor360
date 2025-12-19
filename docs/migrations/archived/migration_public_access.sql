-- =====================================================
-- Migración: Acceso Público para Módulo de Alimentación
-- =====================================================
-- 1. Habilitar lectura pública para menus
-- 2. Habilitar inserción pública para food_orders
-- 3. Crear función segura para buscar empleado por DNI
-- 4. Habilitar lectura pública para stations (necesario para el frontend)

-- =====================================================
-- 1. Políticas RLS para Menús (Lectura Pública)
-- =====================================================

DO $$
BEGIN
  -- Eliminar política anterior si existe (para evitar conflictos)
  DROP POLICY IF EXISTS "Allow public read access" ON menus;
  
  -- Crear política para permitir lectura a todos (incluyendo anon)
  CREATE POLICY "Allow public read access" ON menus
    FOR SELECT
    USING (true); -- Permitir a cualquiera ver menús
END $$;

-- =====================================================
-- 2. Políticas RLS para Stations (Lectura Pública)
-- =====================================================

DO $$
BEGIN
  -- Habilitar RLS en stations si no está habilitado
  ALTER TABLE stations ENABLE ROW LEVEL SECURITY;

  -- Eliminar política anterior si existe
  DROP POLICY IF EXISTS "Allow public read access" ON stations;
  
  -- Crear política para permitir lectura a todos
  CREATE POLICY "Allow public read access" ON stations
    FOR SELECT
    USING (true);
END $$;

-- =====================================================
-- 3. Políticas RLS para Food Orders (Inserción Pública)
-- =====================================================

DO $$
BEGIN
  -- Permitir inserción pública (anon)
  DROP POLICY IF EXISTS "Allow public insert" ON food_orders;
  
  CREATE POLICY "Allow public insert" ON food_orders
    FOR INSERT
    WITH CHECK (true);
    
  -- Permitir lectura pública de sus propios pedidos (opcional, pero puede ser útil si guardan el ID en local storage)
  -- Por seguridad, mejor solo permitir SELECT si conocen el ID (pero RLS estándar no soporta "si conoces el ID" fácilmente sin autenticación)
  -- Dejaremos solo INSERT por ahora para anon.
END $$;

-- =====================================================
-- 4. Función Segura: Buscar Empleado por DNI
-- =====================================================
-- Esta función permite buscar solo la estación y el ID del empleado usando su DNI
-- Evita exponer toda la tabla employees al público.
-- SECURITY DEFINER: Se ejecuta con permisos del creador (admin), saltando-- Función Segura: Buscar Empleado por DNI
-- Primero eliminamos la función para evitar conflictos de firma
DROP FUNCTION IF EXISTS get_employee_by_dni_public(TEXT);

CREATE OR REPLACE FUNCTION get_employee_by_dni_public(p_dni TEXT)
RETURNS TABLE (
  employee_id UUID,
  fullname VARCHAR,
  station_id UUID,
  role_name VARCHAR
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
    e.role_name
  FROM employees e
  WHERE e.dni = p_dni
  AND e.status = 'ACTIVO' -- Solo empleados activos
  LIMIT 1;
END;
$$;

-- Otorgar permisos de ejecución a todos los roles relevantes
GRANT EXECUTE ON FUNCTION get_employee_by_dni_public(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_employee_by_dni_public(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_employee_by_dni_public(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_employee_by_dni_public(TEXT) TO public;
GRANT EXECUTE ON FUNCTION get_employee_by_dni_public(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_employee_by_dni_public(TEXT) TO public;

-- =====================================================
-- 5. Verificar
-- =====================================================
-- Intentar buscar un empleado (si existe alguno con DNI de prueba)
-- SELECT * FROM get_employee_by_dni_public('12345678');
