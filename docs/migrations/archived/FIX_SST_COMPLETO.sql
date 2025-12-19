-- =====================================================
-- FIX COMPLETO MÓDULO SST
-- Este script elimina y recrea las tablas correctamente
-- EJECUTA ESTE ARCHIVO EN TU SQL EDITOR DE SUPABASE
-- =====================================================

-- 1. Eliminar tablas existentes en orden (respetando dependencias)
DROP TABLE IF EXISTS epp_stock_movements CASCADE;
DROP TABLE IF EXISTS employee_epp_assignments CASCADE;
DROP TABLE IF EXISTS epp_deliveries CASCADE;
DROP TABLE IF EXISTS epp_items CASCADE;
DROP TABLE IF EXISTS epp_inventory CASCADE;

-- 2. TABLA: epp_items (Catálogo de EPPs/Uniformes/Equipos)
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

-- 3. TABLA: epp_deliveries (Entregas y Renovaciones)
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

-- 4. TABLA: employee_epp_assignments
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

-- 5. TABLA: epp_stock_movements
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

-- 6. TABLA: sst_incidents (solo si no existe)
CREATE TABLE IF NOT EXISTS sst_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  reported_by UUID REFERENCES system_users(id) ON DELETE SET NULL,
  incident_date DATE NOT NULL,
  incident_time TIME NOT NULL,
  incident_location VARCHAR(255) NOT NULL,
  incident_type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) NOT NULL,
  category VARCHAR(100),
  description TEXT NOT NULL,
  immediate_action TEXT,
  status VARCHAR(50) DEFAULT 'REPORTED',
  injury_type VARCHAR(100),
  medical_attention BOOLEAN DEFAULT FALSE,
  days_lost INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT incident_type_valid CHECK (incident_type IN ('ACCIDENTE', 'INCIDENTE', 'CUASI_ACCIDENTE')),
  CONSTRAINT severity_valid CHECK (severity IN ('LEVE', 'MODERADO', 'GRAVE', 'MUY_GRAVE')),
  CONSTRAINT status_valid CHECK (status IN ('REPORTED', 'UNDER_INVESTIGATION', 'CLOSED'))
);

-- 7. VISTA: vw_renewals_pending (elementos próximos a renovar)
DROP VIEW IF EXISTS vw_renewals_pending;
CREATE VIEW vw_renewals_pending AS
SELECT
  ea.id,
  ea.station_id,
  ea.employee_id,
  ea.item_id,
  ea.delivery_id,
  ea.quantity,
  ea.size,
  ea.delivery_date,
  ea.renewal_date,
  ea.status,
  ea.renewal_notified,
  ea.notification_date,
  ea.created_at,
  ea.updated_at,
  -- Extraemos first_name y last_name de full_name para compatibilidad
  SPLIT_PART(e.full_name, ' ', 1) as first_name,
  SUBSTRING(e.full_name FROM POSITION(' ' IN e.full_name) + 1) as last_name,
  e.full_name,
  e.dni,
  e.role_name,
  e.role_name as area, -- Usamos role_name como area ya que no existe columna area
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

-- 7. TRIGGERS para updated_at
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

-- 8. FUNCIÓN para generar código de documento
CREATE OR REPLACE FUNCTION generate_document_code()
RETURNS TEXT AS $$
BEGIN
  RETURN substring(md5(random()::text) from 1 for 8);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_document_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.document_code IS NULL THEN
    NEW.document_code := generate_document_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_delivery_document_code
    BEFORE INSERT ON epp_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION set_document_code();

-- 9. HABILITAR RLS y POLÍTICAS
ALTER TABLE epp_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE epp_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_epp_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE epp_stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "epp_items_public_access" ON epp_items FOR ALL USING (true);
CREATE POLICY "epp_deliveries_public_access" ON epp_deliveries FOR ALL USING (true);
CREATE POLICY "employee_epp_assignments_public_access" ON employee_epp_assignments FOR ALL USING (true);
CREATE POLICY "epp_stock_movements_public_access" ON epp_stock_movements FOR ALL USING (true);

-- 10. VERIFICACIÓN
SELECT 'epp_items' as tabla, COUNT(*) as registros FROM epp_items
UNION ALL
SELECT 'epp_deliveries', COUNT(*) FROM epp_deliveries
UNION ALL
SELECT 'employee_epp_assignments', COUNT(*) FROM employee_epp_assignments
UNION ALL
SELECT 'epp_stock_movements', COUNT(*) FROM epp_stock_movements
UNION ALL
SELECT 'sst_incidents', COUNT(*) FROM sst_incidents;

-- ¡LISTO! Todas las tablas creadas correctamente
