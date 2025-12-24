-- =====================================================
-- ÍNDICES RLS - BASADO EN SCHEMA REAL VERIFICADO
-- =====================================================
-- Fecha: 2025-12-24
-- TODAS las columnas han sido verificadas
-- =====================================================

-- =====================================================
-- TABLA: food_orders
-- =====================================================
-- Columnas verificadas: station_id, employee_id, menu_date, status

CREATE INDEX IF NOT EXISTS idx_food_orders_station_id 
  ON food_orders(station_id);

CREATE INDEX IF NOT EXISTS idx_food_orders_employee_id 
  ON food_orders(employee_id);

CREATE INDEX IF NOT EXISTS idx_food_orders_menu_date 
  ON food_orders(menu_date);

CREATE INDEX IF NOT EXISTS idx_food_orders_status 
  ON food_orders(status);

-- Índices compuestos para queries comunes
CREATE INDEX IF NOT EXISTS idx_food_orders_station_date 
  ON food_orders(station_id, menu_date DESC);

CREATE INDEX IF NOT EXISTS idx_food_orders_employee_date 
  ON food_orders(employee_id, menu_date DESC);

CREATE INDEX IF NOT EXISTS idx_food_orders_station_status 
  ON food_orders(station_id, status);

-- Índice parcial: solo pedidos activos
CREATE INDEX IF NOT EXISTS idx_food_orders_active 
  ON food_orders(station_id, menu_date) 
  WHERE status != 'CANCELLED';

-- =====================================================
-- TABLA: menus
-- =====================================================
-- Columnas verificadas: station_id, provider_id, serve_date

CREATE INDEX IF NOT EXISTS idx_menus_station_id 
  ON menus(station_id);

CREATE INDEX IF NOT EXISTS idx_menus_provider_id 
  ON menus(provider_id);

CREATE INDEX IF NOT EXISTS idx_menus_serve_date 
  ON menus(serve_date);

-- Índices compuestos
CREATE INDEX IF NOT EXISTS idx_menus_station_date 
  ON menus(station_id, serve_date DESC);

CREATE INDEX IF NOT EXISTS idx_menus_provider_date 
  ON menus(provider_id, serve_date DESC);

-- =====================================================
-- TABLA: employees
-- =====================================================
-- Columnas verificadas: station_id, status, full_name, dni

CREATE INDEX IF NOT EXISTS idx_employees_station_id 
  ON employees(station_id);

CREATE INDEX IF NOT EXISTS idx_employees_status 
  ON employees(status);

CREATE INDEX IF NOT EXISTS idx_employees_dni 
  ON employees(dni);

-- Búsqueda case-insensitive por nombre
CREATE INDEX IF NOT EXISTS idx_employees_full_name_lower 
  ON employees(LOWER(full_name));

-- Índice parcial: solo empleados activos
CREATE INDEX IF NOT EXISTS idx_employees_active 
  ON employees(station_id, full_name) 
  WHERE status = 'ACTIVO';

-- =====================================================
-- TABLA: deliveries
-- =====================================================
-- Columnas verificadas: station_id, employee_id, delivery_date

CREATE INDEX IF NOT EXISTS idx_deliveries_station_id 
  ON deliveries(station_id);

CREATE INDEX IF NOT EXISTS idx_deliveries_employee_id 
  ON deliveries(employee_id);

CREATE INDEX IF NOT EXISTS idx_deliveries_delivery_date 
  ON deliveries(delivery_date);

-- Índice compuesto
CREATE INDEX IF NOT EXISTS idx_deliveries_station_date 
  ON deliveries(station_id, delivery_date DESC);

-- =====================================================
-- TABLA: transport_schedules
-- =====================================================
-- Columnas verificadas: station_id, provider_id, driver_id, scheduled_date

CREATE INDEX IF NOT EXISTS idx_transport_schedules_station_id 
  ON transport_schedules(station_id);

CREATE INDEX IF NOT EXISTS idx_transport_schedules_provider_id 
  ON transport_schedules(provider_id);

CREATE INDEX IF NOT EXISTS idx_transport_schedules_driver_id 
  ON transport_schedules(driver_id);

CREATE INDEX IF NOT EXISTS idx_transport_schedules_scheduled_date 
  ON transport_schedules(scheduled_date);

-- Índices compuestos
CREATE INDEX IF NOT EXISTS idx_transport_schedules_station_date 
  ON transport_schedules(station_id, scheduled_date DESC);

CREATE INDEX IF NOT EXISTS idx_transport_schedules_driver_date 
  ON transport_schedules(driver_id, scheduled_date DESC);

-- =====================================================
-- ANÁLISIS DE RENDIMIENTO
-- =====================================================

ANALYZE food_orders;
ANALYZE menus;
ANALYZE employees;
ANALYZE deliveries;
ANALYZE transport_schedules;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
