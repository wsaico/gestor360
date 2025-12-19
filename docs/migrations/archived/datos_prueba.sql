-- =====================================================
-- Datos de Prueba para Gestor360°
-- Ejecuta este script si el dashboard aparece vacío
-- =====================================================

-- 1. Verificar que las tablas existen
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Insertar estación de prueba (si no existe)
INSERT INTO stations (name, code, location)
VALUES ('Estación Jauja', 'JAU', 'Jauja, Junín, Perú')
ON CONFLICT (code) DO NOTHING;

-- 3. Verificar que la estación se creó
SELECT * FROM stations;

-- 4. Insertar empleados de prueba
INSERT INTO employees (station_id, full_name, dni, role_name, status, uniform_size, phone, email)
SELECT
  s.id,
  'Juan Carlos Pérez García',
  '12345678',
  'Operario',
  'ACTIVO',
  'M',
  '987654321',
  'juan.perez@ejemplo.com'
FROM stations s
WHERE s.code = 'JAU'
ON CONFLICT (station_id, dni) DO NOTHING;

INSERT INTO employees (station_id, full_name, dni, role_name, status, uniform_size, phone, email)
SELECT
  s.id,
  'María Isabel García López',
  '23456789',
  'Supervisor',
  'ACTIVO',
  'S',
  '987654322',
  'maria.garcia@ejemplo.com'
FROM stations s
WHERE s.code = 'JAU'
ON CONFLICT (station_id, dni) DO NOTHING;

-- 5. Verificar empleados
SELECT * FROM employees;

-- 6. Insertar items de inventario
INSERT INTO inventory_items (station_id, name, stock_current, stock_min, lifespan_months, unit)
SELECT
  s.id,
  'Casco de Seguridad',
  45,
  20,
  24,
  'und'
FROM stations s
WHERE s.code = 'JAU';

INSERT INTO inventory_items (station_id, name, stock_current, stock_min, lifespan_months, unit)
SELECT
  s.id,
  'Guantes de Seguridad',
  5,
  15,
  6,
  'par'
FROM stations s
WHERE s.code = 'JAU';

INSERT INTO inventory_items (station_id, name, stock_current, stock_min, lifespan_months, unit)
SELECT
  s.id,
  'Chaleco Reflectivo',
  30,
  25,
  12,
  'und'
FROM stations s
WHERE s.code = 'JAU';

-- 7. Verificar inventario
SELECT * FROM inventory_items;

-- 8. Verificar que tu usuario admin existe
SELECT id, email, username, role, station_id FROM system_users WHERE email = 'admin@gestor360.com';

-- =====================================================
-- Si todo está bien, deberías ver:
-- - 1 estación (Jauja)
-- - 2 empleados
-- - 3 items de inventario
-- - 1 usuario admin
-- =====================================================
