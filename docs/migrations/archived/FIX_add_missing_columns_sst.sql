-- =====================================================
-- FIX: Agregar columnas faltantes y crear nuevas tablas
-- Ejecuta esto DESPUÉS de la primera migración
-- =====================================================

-- 1. Eliminar las tablas viejas y crear todo desde cero
DROP TABLE IF EXISTS epp_stock_movements CASCADE;
DROP TABLE IF EXISTS employee_epp_assignments CASCADE;
DROP TABLE IF EXISTS epp_deliveries CASCADE;
DROP TABLE IF EXISTS epp_inventory CASCADE;
DROP TABLE IF EXISTS epp_items CASCADE;

-- 2. Crear tabla epp_items
CREATE TABLE epp_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  item_type VARCHAR(50) NOT NULL,
  size VARCHAR(50),
  brand VARCHAR(100),
  model VARCHAR(100),
  useful_life_months INTEGER NOT NULL DEFAULT 12,
  stock_current INTEGER NOT NULL DEFAULT 0,
  stock_min INTEGER NOT NULL DEFAULT 10,
  stock_max INTEGER NOT NULL DEFAULT 100,
  unit VARCHAR(50) NOT NULL DEFAULT 'UNIDAD',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT stock_non_negative CHECK (stock_current >= 0),
  CONSTRAINT item_type_valid CHECK (item_type IN ('EPP', 'UNIFORME', 'EQUIPO_EMERGENCIA'))
);

CREATE INDEX idx_epp_items_station ON epp_items(station_id);
CREATE INDEX idx_epp_items_type ON epp_items(item_type);
CREATE INDEX idx_epp_items_active ON epp_items(is_active);

-- 3. Crear tabla epp_deliveries
CREATE TABLE epp_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  delivered_by UUID REFERENCES system_users(id) ON DELETE SET NULL,
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_time TIME DEFAULT CURRENT_TIME,
  document_code VARCHAR(50) UNIQUE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  employee_signature_data TEXT,
  employee_signature_ip VARCHAR(45),
  employee_signature_timestamp TIMESTAMP WITH TIME ZONE,
  responsible_signature_data TEXT,
  responsible_name VARCHAR(255),
  responsible_position VARCHAR(255),
  responsible_signature_timestamp TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  delivery_reason VARCHAR(255),
  status VARCHAR(50) DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT delivery_status_valid CHECK (status IN ('PENDING', 'SIGNED', 'CANCELLED'))
);

CREATE INDEX idx_epp_deliveries_station ON epp_deliveries(station_id);
CREATE INDEX idx_epp_deliveries_employee ON epp_deliveries(employee_id);
CREATE INDEX idx_epp_deliveries_date ON epp_deliveries(delivery_date);
CREATE INDEX idx_epp_deliveries_status ON epp_deliveries(status);

-- 4. Crear tabla employee_epp_assignments
CREATE TABLE employee_epp_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES epp_items(id) ON DELETE RESTRICT,
  delivery_id UUID REFERENCES epp_deliveries(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  size VARCHAR(50),
  delivery_date DATE NOT NULL,
  renewal_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  renewal_notified BOOLEAN DEFAULT FALSE,
  notification_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT assignment_status_valid CHECK (status IN ('ACTIVE', 'RENEWED', 'RETURNED', 'LOST'))
);

CREATE INDEX idx_employee_epp_assignments_employee ON employee_epp_assignments(employee_id);
CREATE INDEX idx_employee_epp_assignments_item ON employee_epp_assignments(item_id);
CREATE INDEX idx_employee_epp_assignments_renewal ON employee_epp_assignments(renewal_date);

-- 5. Crear tabla epp_stock_movements
CREATE TABLE epp_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES epp_items(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  movement_type VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL,
  stock_before INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,
  reference_type VARCHAR(50),
  reference_id UUID,
  reason TEXT,
  performed_by UUID REFERENCES system_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT movement_type_valid CHECK (movement_type IN ('ENTRADA', 'SALIDA', 'AJUSTE', 'ENTREGA', 'RENOVACION'))
);

CREATE INDEX idx_epp_stock_movements_item ON epp_stock_movements(item_id);
CREATE INDEX idx_epp_stock_movements_station ON epp_stock_movements(station_id);

-- 6. Función para generar código de documento
CREATE OR REPLACE FUNCTION generate_document_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
BEGIN
  code := substring(md5(random()::text) from 1 for 8);
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger para código de documento
CREATE OR REPLACE FUNCTION set_document_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.document_code IS NULL THEN
    NEW.document_code := generate_document_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_delivery_document_code ON epp_deliveries;
CREATE TRIGGER set_delivery_document_code
    BEFORE INSERT ON epp_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION set_document_code();

-- 8. Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_epp_items_updated_at
    BEFORE UPDATE ON epp_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_epp_deliveries_updated_at
    BEFORE UPDATE ON epp_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_epp_assignments_updated_at
    BEFORE UPDATE ON employee_epp_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. Vista de renovaciones pendientes
CREATE OR REPLACE VIEW vw_renewals_pending AS
SELECT
  ea.*,
  e.first_name,
  e.last_name,
  e.dni,
  e.role_name,
  e.area,
  ei.name as item_name,
  ei.item_type,
  ei.useful_life_months,
  CURRENT_DATE - ea.renewal_date as days_overdue,
  CASE
    WHEN ea.renewal_date < CURRENT_DATE THEN 'VENCIDO'
    WHEN ea.renewal_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'POR_VENCER'
    ELSE 'VIGENTE'
  END as renewal_status
FROM employee_epp_assignments ea
JOIN employees e ON ea.employee_id = e.id
JOIN epp_items ei ON ea.item_id = ei.id
WHERE ea.status = 'ACTIVE'
  AND ea.renewal_date <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY ea.renewal_date ASC;

-- 10. Verificación
SELECT
  'epp_items' as tabla,
  COUNT(*) as registros
FROM epp_items
UNION ALL
SELECT
  'epp_deliveries' as tabla,
  COUNT(*) as registros
FROM epp_deliveries
UNION ALL
SELECT
  'employee_epp_assignments' as tabla,
  COUNT(*) as registros
FROM employee_epp_assignments
UNION ALL
SELECT
  'epp_stock_movements' as tabla,
  COUNT(*) as registros
FROM epp_stock_movements
UNION ALL
SELECT
  'sst_incidents' as tabla,
  COUNT(*) as registros
FROM sst_incidents;

-- FIN
