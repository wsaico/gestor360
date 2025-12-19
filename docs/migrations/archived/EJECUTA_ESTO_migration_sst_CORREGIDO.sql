-- =====================================================
-- MIGRACIÓN COMPLETA MÓDULO SST - VERSIÓN CORREGIDA
-- Sistema de EPPs/Uniformes con Renovación Inteligente
-- EJECUTA ESTE ARCHIVO EN TU SQL EDITOR DE SUPABASE
-- =====================================================

-- 1. TABLA: epp_items (Catálogo de EPPs/Uniformes/Equipos)
CREATE TABLE IF NOT EXISTS epp_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,

  -- Información del elemento
  name VARCHAR(255) NOT NULL, -- Ej: "CASACA TASLAN SEMI-TEJIDO ENG"
  description TEXT,

  -- Tipo de elemento (NO es categoría, es tipo)
  item_type VARCHAR(50) NOT NULL, -- EPP, UNIFORME, EQUIPO_EMERGENCIA

  -- Especificaciones
  size VARCHAR(50), -- S, M, L, XL, UNICO, 38, 40, etc.
  brand VARCHAR(100),
  model VARCHAR(100),

  -- Vida útil y renovación
  useful_life_months INTEGER NOT NULL DEFAULT 12, -- Meses de vida útil (configurable)

  -- Control de stock
  stock_current INTEGER NOT NULL DEFAULT 0,
  stock_min INTEGER NOT NULL DEFAULT 10,
  stock_max INTEGER NOT NULL DEFAULT 100,
  unit VARCHAR(50) NOT NULL DEFAULT 'UNIDAD', -- UNIDAD, PAR, KIT, etc.

  -- Metadatos
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT stock_non_negative CHECK (stock_current >= 0),
  CONSTRAINT item_type_valid CHECK (item_type IN ('EPP', 'UNIFORME', 'EQUIPO_EMERGENCIA'))
);

CREATE INDEX IF NOT EXISTS idx_epp_items_station ON epp_items(station_id);
CREATE INDEX IF NOT EXISTS idx_epp_items_type ON epp_items(item_type);
CREATE INDEX IF NOT EXISTS idx_epp_items_active ON epp_items(is_active);

COMMENT ON TABLE epp_items IS 'Catálogo de EPPs, Uniformes y Equipos de Emergencia';
COMMENT ON COLUMN epp_items.item_type IS 'Tipo: EPP, UNIFORME, EQUIPO_EMERGENCIA';
COMMENT ON COLUMN epp_items.useful_life_months IS 'Vida útil en meses para calcular renovación automática';

-- 2. TABLA: epp_deliveries (Entregas y Renovaciones)
CREATE TABLE IF NOT EXISTS epp_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  delivered_by UUID REFERENCES system_users(id) ON DELETE SET NULL,

  -- Información de la entrega
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_time TIME DEFAULT CURRENT_TIME,

  -- Código único del documento (para PDF)
  document_code VARCHAR(50) UNIQUE, -- Ej: "90bd2c33"

  -- Items entregados (JSONB array)
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Formato: [{
  --   "item_id": "uuid",
  --   "item_name": "CASACA TASLAN",
  --   "item_type": "UNIFORME",
  --   "size": "M",
  --   "quantity": 1,
  --   "motivo": "Renovación",
  --   "fecha_renovacion": "2026-11-24",
  --   "observacion": ""
  -- }]

  -- Firma digital del empleado
  employee_signature_data TEXT, -- Base64 de la imagen de firma
  employee_signature_ip VARCHAR(45),
  employee_signature_timestamp TIMESTAMP WITH TIME ZONE,

  -- Firma digital del responsable
  responsible_signature_data TEXT,
  responsible_name VARCHAR(255), -- Ej: "QUISPE ALLCCA ROLY"
  responsible_position VARCHAR(255), -- Ej: "Técnico Senior"
  responsible_signature_timestamp TIMESTAMP WITH TIME ZONE,

  -- Observaciones generales
  notes TEXT,
  delivery_reason VARCHAR(255), -- NUEVO_INGRESO, RENOVACION, DETERIORO, PERDIDA, OTRO

  -- Estado
  status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, SIGNED, CANCELLED

  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT delivery_status_valid CHECK (status IN ('PENDING', 'SIGNED', 'CANCELLED'))
);

CREATE INDEX IF NOT EXISTS idx_epp_deliveries_station ON epp_deliveries(station_id);
CREATE INDEX IF NOT EXISTS idx_epp_deliveries_employee ON epp_deliveries(employee_id);
CREATE INDEX IF NOT EXISTS idx_epp_deliveries_date ON epp_deliveries(delivery_date);
CREATE INDEX IF NOT EXISTS idx_epp_deliveries_status ON epp_deliveries(status);

COMMENT ON TABLE epp_deliveries IS 'Registro de entregas y renovaciones de EPPs/Uniformes con firma digital';
COMMENT ON COLUMN epp_deliveries.document_code IS 'Código único del documento para validación';

-- 3. TABLA: employee_epp_assignments (Asignaciones activas a empleados)
-- Esta tabla mantiene el estado actual de qué EPPs tiene cada empleado
CREATE TABLE IF NOT EXISTS employee_epp_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES epp_items(id) ON DELETE RESTRICT,
  delivery_id UUID REFERENCES epp_deliveries(id) ON DELETE SET NULL,

  -- Información de la asignación
  quantity INTEGER NOT NULL DEFAULT 1,
  size VARCHAR(50),

  -- Fechas importantes para renovación
  delivery_date DATE NOT NULL,
  renewal_date DATE NOT NULL, -- Calculado automáticamente: delivery_date + useful_life_months

  -- Estado
  status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, RENEWED, RETURNED, LOST

  -- Notificaciones
  renewal_notified BOOLEAN DEFAULT FALSE, -- Si ya se envió notificación de renovación
  notification_date DATE, -- Fecha en que se notificó

  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT assignment_status_valid CHECK (status IN ('ACTIVE', 'RENEWED', 'RETURNED', 'LOST'))
);

CREATE INDEX IF NOT EXISTS idx_employee_epp_assignments_employee ON employee_epp_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_epp_assignments_item ON employee_epp_assignments(item_id);
CREATE INDEX IF NOT EXISTS idx_employee_epp_assignments_renewal ON employee_epp_assignments(renewal_date);
CREATE INDEX IF NOT EXISTS idx_employee_epp_assignments_active ON employee_epp_assignments(status)
  WHERE status = 'ACTIVE';

COMMENT ON TABLE employee_epp_assignments IS 'Asignaciones activas de EPPs/Uniformes a empleados con control de renovación';
COMMENT ON COLUMN employee_epp_assignments.renewal_date IS 'Fecha calculada para renovación automática';

-- 4. TABLA: epp_stock_movements (Movimientos de stock)
CREATE TABLE IF NOT EXISTS epp_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES epp_items(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,

  -- Información del movimiento
  movement_type VARCHAR(50) NOT NULL, -- ENTRADA, SALIDA, AJUSTE, ENTREGA, RENOVACION
  quantity INTEGER NOT NULL,

  -- Stock antes y después
  stock_before INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,

  -- Referencias
  reference_type VARCHAR(50), -- DELIVERY, RENEWAL, PURCHASE, ADJUSTMENT
  reference_id UUID, -- ID de la entrega, renovación, etc.

  -- Información adicional
  reason TEXT,
  performed_by UUID REFERENCES system_users(id) ON DELETE SET NULL,

  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT movement_type_valid CHECK (movement_type IN ('ENTRADA', 'SALIDA', 'AJUSTE', 'ENTREGA', 'RENOVACION'))
);

CREATE INDEX IF NOT EXISTS idx_epp_stock_movements_item ON epp_stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_epp_stock_movements_station ON epp_stock_movements(station_id);
CREATE INDEX IF NOT EXISTS idx_epp_stock_movements_type ON epp_stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_epp_stock_movements_date ON epp_stock_movements(created_at);

-- 5. TABLA: sst_incidents (Incidentes SST - sin cambios)
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

CREATE INDEX IF NOT EXISTS idx_sst_incidents_station ON sst_incidents(station_id);
CREATE INDEX IF NOT EXISTS idx_sst_incidents_employee ON sst_incidents(employee_id);
CREATE INDEX IF NOT EXISTS idx_sst_incidents_date ON sst_incidents(incident_date);

-- 6. TRIGGERS para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_epp_items_updated_at ON epp_items;
CREATE TRIGGER update_epp_items_updated_at
    BEFORE UPDATE ON epp_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_epp_deliveries_updated_at ON epp_deliveries;
CREATE TRIGGER update_epp_deliveries_updated_at
    BEFORE UPDATE ON epp_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_employee_epp_assignments_updated_at ON employee_epp_assignments;
CREATE TRIGGER update_employee_epp_assignments_updated_at
    BEFORE UPDATE ON employee_epp_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sst_incidents_updated_at ON sst_incidents;
CREATE TRIGGER update_sst_incidents_updated_at
    BEFORE UPDATE ON sst_incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. FUNCIÓN para generar código único de documento
CREATE OR REPLACE FUNCTION generate_document_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
BEGIN
  -- Genera un código aleatorio de 8 caracteres (similar a "90bd2c33")
  code := substring(md5(random()::text) from 1 for 8);
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- 8. TRIGGER para generar código de documento automáticamente
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

-- 9. VISTA para elementos próximos a renovar
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

COMMENT ON VIEW vw_renewals_pending IS 'Vista de EPPs/Uniformes que requieren renovación (vencidos o próximos a vencer)';

-- 10. Verificación final
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

-- FIN DE LA MIGRACIÓN CORREGIDA
