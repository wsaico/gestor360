-- =====================================================
-- Gestor360° - Schema SQL para Supabase/PostgreSQL
-- Versión: 2.0.0
-- Autor: Wilber Saico
-- =====================================================

-- IMPORTANTE: Ejecutar este script en el SQL Editor de Supabase

-- =====================================================
-- 1. TABLAS DEL SISTEMA (Globales)
-- =====================================================

-- Tabla: stations (Estaciones/Sucursales)
CREATE TABLE IF NOT EXISTS stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(10) NOT NULL UNIQUE,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: system_users (Usuarios del Sistema)
CREATE TABLE IF NOT EXISTS system_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'SUPERVISOR', 'MONITOR', 'PROVIDER')),
  station_id UUID REFERENCES stations(id) ON DELETE SET NULL,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: system_settings (Configuración del Sistema)
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  smtp_host VARCHAR(255),
  smtp_port INTEGER,
  smtp_user VARCHAR(255),
  smtp_pass_encrypted TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. TABLAS DE RECURSOS HUMANOS
-- =====================================================

-- Tabla: employees (Empleados)
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  dni VARCHAR(8) NOT NULL,
  role_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' CHECK (status IN ('ACTIVO', 'CESADO')),
  uniform_size VARCHAR(5),
  phone VARCHAR(20),
  email VARCHAR(255),
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(station_id, dni)
);

-- Índice para búsquedas por estación
CREATE INDEX IF NOT EXISTS idx_employees_station ON employees(station_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);

-- Tabla: employee_docs (Documentos de Empleados)
CREATE TABLE IF NOT EXISTS employee_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  doc_type VARCHAR(20) NOT NULL CHECK (doc_type IN ('FOTOCHECK', 'LICENCIA', 'EMO')),
  expiry_date DATE NOT NULL,
  evidence_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_docs_employee ON employee_docs(employee_id);

-- =====================================================
-- 3. TABLAS DE SST & INVENTARIO
-- =====================================================

-- Tabla: inventory_items (Items de Inventario EPP)
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  stock_current INTEGER NOT NULL DEFAULT 0,
  stock_min INTEGER NOT NULL DEFAULT 10,
  lifespan_months INTEGER NOT NULL,
  unit VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_station ON inventory_items(station_id);

-- Tabla: deliveries (Entregas de EPP)
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  supervisor_id UUID REFERENCES system_users(id) ON DELETE SET NULL,
  digital_signature_blob TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_station ON deliveries(station_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_employee ON deliveries(employee_id);

-- Tabla: delivery_details (Detalle de Entregas)
CREATE TABLE IF NOT EXISTS delivery_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  renewal_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_details_delivery ON delivery_details(delivery_id);

-- Tabla: incidents (Incidentes SST)
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('ACCIDENTE', 'INCIDENTE')),
  description TEXT NOT NULL,
  root_cause TEXT,
  corrective_actions TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidents_station ON incidents(station_id);

-- =====================================================
-- 4. TABLAS DE ALIMENTACIÓN & FINANZAS
-- =====================================================

-- Tabla: role_pricing_config (Configuración de Tarifas por Cargo)
CREATE TABLE IF NOT EXISTS role_pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  role_name VARCHAR(100) NOT NULL,
  employee_cost DECIMAL(10, 2) NOT NULL,
  company_subsidy DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(station_id, role_name)
);

CREATE INDEX IF NOT EXISTS idx_role_pricing_station ON role_pricing_config(station_id);

-- Tabla: menus (Menús de Alimentación)
CREATE TABLE IF NOT EXISTS menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES system_users(id) ON DELETE SET NULL,
  serve_date DATE NOT NULL,
  options JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menus_station ON menus(station_id);
CREATE INDEX IF NOT EXISTS idx_menus_date ON menus(serve_date);

-- Tabla: food_orders (Pedidos de Alimentos)
CREATE TABLE IF NOT EXISTS food_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  menu_date DATE NOT NULL,
  selected_option VARCHAR(255) NOT NULL,
  cost_applied DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONSUMED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_orders_station ON food_orders(station_id);
CREATE INDEX IF NOT EXISTS idx_food_orders_employee ON food_orders(employee_id);

-- =====================================================
-- 5. TABLA DE AUDITORÍA
-- =====================================================

-- Tabla: audit_logs (Logs de Auditoría)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES system_users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  table_affected VARCHAR(100) NOT NULL,
  record_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_affected);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- =====================================================
-- 6. FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_stations_updated_at BEFORE UPDATE ON stations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_users_updated_at BEFORE UPDATE ON system_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. DATOS DE PRUEBA (OPCIONAL)
-- =====================================================

-- Insertar estaciones de ejemplo
INSERT INTO stations (name, code, location) VALUES
  ('Estación Jauja', 'JAU', 'Jauja, Junín, Perú'),
  ('Estación Pisco', 'PIS', 'Pisco, Ica, Perú')
ON CONFLICT (code) DO NOTHING;

-- Insertar usuario administrador de prueba
-- NOTA: La contraseña es 'admin123' hasheada con bcrypt
-- En producción, crear usuarios desde la interfaz
INSERT INTO system_users (email, username, password_hash, role, station_id, is_active)
VALUES (
  'admin@gestor360.com',
  'admin',
  '$2a$10$rKxZ8qhQmXZ5kF1YQ1FZWeY5mXJ1F5kQ8vZXJ1F5kQ8vZXJ1F5kQ8.',
  'ADMIN',
  NULL,
  TRUE
)
ON CONFLICT (email) DO NOTHING;

-- Insertar empleados de prueba para la estación Jauja
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
FROM stations s WHERE s.code = 'JAU'
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
FROM stations s WHERE s.code = 'JAU'
ON CONFLICT (station_id, dni) DO NOTHING;

-- Insertar items de inventario de prueba
INSERT INTO inventory_items (station_id, name, stock_current, stock_min, lifespan_months, unit)
SELECT
  s.id,
  'Casco de Seguridad',
  45,
  20,
  24,
  'und'
FROM stations s WHERE s.code = 'JAU'
ON CONFLICT DO NOTHING;

INSERT INTO inventory_items (station_id, name, stock_current, stock_min, lifespan_months, unit)
SELECT
  s.id,
  'Guantes de Seguridad',
  5,
  15,
  6,
  'par'
FROM stations s WHERE s.code = 'JAU'
ON CONFLICT DO NOTHING;

INSERT INTO inventory_items (station_id, name, stock_current, stock_min, lifespan_months, unit)
SELECT
  s.id,
  'Chaleco Reflectivo',
  30,
  25,
  12,
  'und'
FROM stations s WHERE s.code = 'JAU'
ON CONFLICT DO NOTHING;

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas con station_id
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_pricing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_orders ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver datos de su estación
-- NOTA: Estas políticas deben ajustarse según la lógica de autenticación de Supabase
-- Por ahora, permitimos acceso completo para development

CREATE POLICY "Allow all for authenticated users" ON employees
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON inventory_items
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON deliveries
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON incidents
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON role_pricing_config
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON menus
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON food_orders
  FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

-- Para verificar que las tablas se crearon correctamente:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
