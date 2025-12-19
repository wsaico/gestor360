-- =====================================================
-- Migración: Módulo de Alimentación Completo
-- =====================================================
-- Tablas: role_pricing_config, menus, food_orders

-- =====================================================
-- 1. Tabla: role_pricing_config
-- =====================================================
-- Configuración de precios por cargo (rol)
-- Ejemplo: Supervisor paga S/5, empresa subsidia S/10 (total S/15)

CREATE TABLE IF NOT EXISTS role_pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  role_name VARCHAR(100) NOT NULL,
  employee_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  company_subsidy DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT role_pricing_station_role_unique UNIQUE (station_id, role_name),
  CONSTRAINT employee_cost_positive CHECK (employee_cost >= 0),
  CONSTRAINT company_subsidy_positive CHECK (company_subsidy >= 0)
);

-- Comentarios
COMMENT ON TABLE role_pricing_config IS 'Configuración de precios de alimentación por cargo (aporte empleado vs empresa)';
COMMENT ON COLUMN role_pricing_config.role_name IS 'Debe coincidir con employees.role_name';
COMMENT ON COLUMN role_pricing_config.employee_cost IS 'Monto que paga el empleado por el menú';
COMMENT ON COLUMN role_pricing_config.company_subsidy IS 'Monto que subsidia la empresa';

-- Índices
CREATE INDEX IF NOT EXISTS idx_role_pricing_station ON role_pricing_config(station_id);
CREATE INDEX IF NOT EXISTS idx_role_pricing_role ON role_pricing_config(role_name);

-- =====================================================
-- 2. Tabla: menus
-- =====================================================
-- Menús diarios cargados por proveedores

CREATE TABLE IF NOT EXISTS menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES system_users(id) ON DELETE RESTRICT,
  serve_date DATE NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT menu_station_date_unique UNIQUE (station_id, serve_date),
  CONSTRAINT options_not_empty CHECK (jsonb_array_length(options) > 0)
);

-- Comentarios
COMMENT ON TABLE menus IS 'Menús diarios ofrecidos por proveedores';
COMMENT ON COLUMN menus.provider_id IS 'Usuario del sistema con rol PROVIDER';
COMMENT ON COLUMN menus.serve_date IS 'Fecha para la cual se ofrece el menú';
COMMENT ON COLUMN menus.options IS 'Array JSONB con opciones del menú ["Lomo saltado", "Pollo a la plancha", "Pescado frito"]';

-- Índices
CREATE INDEX IF NOT EXISTS idx_menus_station ON menus(station_id);
CREATE INDEX IF NOT EXISTS idx_menus_provider ON menus(provider_id);
CREATE INDEX IF NOT EXISTS idx_menus_date ON menus(serve_date);
CREATE INDEX IF NOT EXISTS idx_menus_station_date ON menus(station_id, serve_date);

-- =====================================================
-- 3. Tabla: food_orders
-- =====================================================
-- Pedidos de alimentación de empleados

-- Primero eliminar la tabla si existe para recrearla correctamente
DROP TABLE IF EXISTS food_orders CASCADE;

CREATE TABLE food_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE RESTRICT,
  menu_date DATE NOT NULL,
  selected_option VARCHAR(255) NOT NULL,
  cost_applied DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT order_employee_date_unique UNIQUE (employee_id, menu_date),
  CONSTRAINT cost_applied_positive CHECK (cost_applied >= 0),
  CONSTRAINT status_valid CHECK (status IN ('PENDING', 'CONFIRMED', 'CONSUMED', 'CANCELLED'))
);

-- Comentarios
COMMENT ON TABLE food_orders IS 'Pedidos de alimentación de empleados';
COMMENT ON COLUMN food_orders.menu_date IS 'Fecha del menú (denormalizado para consultas rápidas)';
COMMENT ON COLUMN food_orders.selected_option IS 'Opción seleccionada del array JSONB del menú';
COMMENT ON COLUMN food_orders.cost_applied IS 'Snapshot del costo al momento de pedir (employee_cost + company_subsidy)';
COMMENT ON COLUMN food_orders.status IS 'PENDING: Pedido realizado | CONFIRMED: Confirmado por proveedor | CONSUMED: Servido | CANCELLED: Cancelado';

-- Índices
CREATE INDEX IF NOT EXISTS idx_food_orders_station ON food_orders(station_id);
CREATE INDEX IF NOT EXISTS idx_food_orders_employee ON food_orders(employee_id);
CREATE INDEX IF NOT EXISTS idx_food_orders_menu ON food_orders(menu_id);
CREATE INDEX IF NOT EXISTS idx_food_orders_date ON food_orders(menu_date);
CREATE INDEX IF NOT EXISTS idx_food_orders_status ON food_orders(status);
CREATE INDEX IF NOT EXISTS idx_food_orders_station_date ON food_orders(station_id, menu_date);

-- =====================================================
-- 4. Triggers para updated_at
-- =====================================================

-- Trigger para role_pricing_config
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_role_pricing_updated_at'
  ) THEN
    CREATE TRIGGER trigger_update_role_pricing_updated_at
      BEFORE UPDATE ON role_pricing_config
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Trigger para menus
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_menus_updated_at'
  ) THEN
    CREATE TRIGGER trigger_update_menus_updated_at
      BEFORE UPDATE ON menus
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Trigger para food_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_food_orders_updated_at'
  ) THEN
    CREATE TRIGGER trigger_update_food_orders_updated_at
      BEFORE UPDATE ON food_orders
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =====================================================
-- 5. Políticas RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS
ALTER TABLE role_pricing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_orders ENABLE ROW LEVEL SECURITY;

-- Políticas para role_pricing_config
DROP POLICY IF EXISTS "Allow all for authenticated users" ON role_pricing_config;
CREATE POLICY "Allow all for authenticated users" ON role_pricing_config
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Políticas para menus
DROP POLICY IF EXISTS "Allow all for authenticated users" ON menus;
CREATE POLICY "Allow all for authenticated users" ON menus
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Políticas para food_orders
DROP POLICY IF EXISTS "Allow all for authenticated users" ON food_orders;
CREATE POLICY "Allow all for authenticated users" ON food_orders
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- =====================================================
-- 6. Datos de ejemplo (opcional para testing)
-- =====================================================

-- Insertar configuraciones de precios por defecto
-- (Descomentar si deseas datos de prueba)

/*
-- Obtener el ID de una estación de ejemplo
DO $$
DECLARE
  example_station_id UUID;
BEGIN
  SELECT id INTO example_station_id FROM stations LIMIT 1;

  IF example_station_id IS NOT NULL THEN
    INSERT INTO role_pricing_config (station_id, role_name, employee_cost, company_subsidy) VALUES
      (example_station_id, 'Supervisor de Estación', 5.00, 10.00),
      (example_station_id, 'Auxiliar de Rampa', 3.00, 12.00),
      (example_station_id, 'Operador 1', 3.00, 12.00),
      (example_station_id, 'Operador 2', 3.00, 12.00),
      (example_station_id, 'Operador 3', 3.00, 12.00),
      (example_station_id, 'Supervisor de Tráfico', 5.00, 10.00),
      (example_station_id, 'Agente de Tráfico', 3.00, 12.00),
      (example_station_id, 'Técnico de Mantenimiento OMA', 4.00, 11.00),
      (example_station_id, 'Técnico Senior 1', 4.00, 11.00)
    ON CONFLICT (station_id, role_name) DO NOTHING;
  END IF;
END $$;
*/

-- =====================================================
-- 7. Verificación
-- =====================================================

-- Verificar que las tablas se crearon correctamente
SELECT
  table_name,
  (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('role_pricing_config', 'menus', 'food_orders')
ORDER BY table_name;

-- Verificar RLS
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('role_pricing_config', 'menus', 'food_orders')
ORDER BY tablename;

-- Verificar políticas
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('role_pricing_config', 'menus', 'food_orders')
ORDER BY tablename, policyname;
