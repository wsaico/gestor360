-- =====================================================
-- MIGRACIÓN: Módulo de Seguridad y Salud en el Trabajo (SST)
-- Fecha: 2025-01-XX
-- Descripción: Crea tablas para inventario EPPs, entregas e incidentes
-- =====================================================

-- =====================================================
-- 1. TABLA: epp_inventory (Inventario de EPPs)
-- =====================================================
CREATE TABLE IF NOT EXISTS epp_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,

  -- Información del EPP
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL, -- CASCO, BOTAS, GUANTES, CHALECO, LENTES, etc.
  size VARCHAR(50), -- S, M, L, XL, UNICO, 38, 40, etc.
  unit VARCHAR(50) NOT NULL DEFAULT 'UNIDAD', -- UNIDAD, PAR, KIT, etc.

  -- Control de stock
  stock_current INTEGER NOT NULL DEFAULT 0,
  stock_min INTEGER NOT NULL DEFAULT 10,
  stock_max INTEGER NOT NULL DEFAULT 100,

  -- Información adicional
  brand VARCHAR(100),
  model VARCHAR(100),
  certification VARCHAR(255), -- Certificación de seguridad

  -- Metadatos
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT stock_non_negative CHECK (stock_current >= 0),
  CONSTRAINT stock_min_positive CHECK (stock_min >= 0),
  CONSTRAINT stock_max_greater_than_min CHECK (stock_max >= stock_min)
);

-- Índices para epp_inventory
CREATE INDEX IF NOT EXISTS idx_epp_inventory_station ON epp_inventory(station_id);
CREATE INDEX IF NOT EXISTS idx_epp_inventory_category ON epp_inventory(category);
CREATE INDEX IF NOT EXISTS idx_epp_inventory_active ON epp_inventory(is_active);
CREATE INDEX IF NOT EXISTS idx_epp_inventory_low_stock ON epp_inventory(station_id, stock_current)
  WHERE stock_current < stock_min;

COMMENT ON TABLE epp_inventory IS 'Inventario de Equipos de Protección Personal (EPPs)';
COMMENT ON COLUMN epp_inventory.category IS 'Categoría del EPP: CASCO, BOTAS, GUANTES, etc.';
COMMENT ON COLUMN epp_inventory.unit IS 'Unidad de medida: UNIDAD, PAR, KIT, etc.';

-- =====================================================
-- 2. TABLA: epp_deliveries (Entregas de EPPs)
-- =====================================================
CREATE TABLE IF NOT EXISTS epp_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  delivered_by UUID REFERENCES system_users(id) ON DELETE SET NULL, -- Usuario que entrega

  -- Información de la entrega
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_time TIME DEFAULT CURRENT_TIME,

  -- Items entregados (JSONB array)
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Formato: [{"epp_id": "uuid", "epp_name": "Casco", "quantity": 2, "size": "M"}]

  -- Firma digital
  signature_data TEXT, -- Base64 de la imagen de firma
  signature_ip VARCHAR(45), -- IP desde donde se firmó
  signature_timestamp TIMESTAMP WITH TIME ZONE,

  -- Observaciones
  notes TEXT,
  delivery_reason VARCHAR(255), -- NUEVO_INGRESO, REPOSICION, DETERIORO, etc.

  -- Estado
  status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, SIGNED, CANCELLED

  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT delivery_status_valid CHECK (status IN ('PENDING', 'SIGNED', 'CANCELLED'))
);

-- Índices para epp_deliveries
CREATE INDEX IF NOT EXISTS idx_epp_deliveries_station ON epp_deliveries(station_id);
CREATE INDEX IF NOT EXISTS idx_epp_deliveries_employee ON epp_deliveries(employee_id);
CREATE INDEX IF NOT EXISTS idx_epp_deliveries_date ON epp_deliveries(delivery_date);
CREATE INDEX IF NOT EXISTS idx_epp_deliveries_status ON epp_deliveries(status);

COMMENT ON TABLE epp_deliveries IS 'Registro de entregas de EPPs a empleados con firma digital';
COMMENT ON COLUMN epp_deliveries.items IS 'Array JSON de items entregados';
COMMENT ON COLUMN epp_deliveries.signature_data IS 'Firma digital en formato Base64';
COMMENT ON COLUMN epp_deliveries.delivery_reason IS 'Motivo: NUEVO_INGRESO, REPOSICION, DETERIORO, etc.';

-- =====================================================
-- 3. TABLA: sst_incidents (Incidentes SST)
-- =====================================================
CREATE TABLE IF NOT EXISTS sst_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL, -- Empleado involucrado
  reported_by UUID REFERENCES system_users(id) ON DELETE SET NULL, -- Quien reporta

  -- Información del incidente
  incident_date DATE NOT NULL,
  incident_time TIME NOT NULL,
  incident_location VARCHAR(255) NOT NULL,

  -- Clasificación
  incident_type VARCHAR(100) NOT NULL, -- ACCIDENTE, INCIDENTE, CUASI_ACCIDENTE
  severity VARCHAR(50) NOT NULL, -- LEVE, MODERADO, GRAVE, MUY_GRAVE
  category VARCHAR(100), -- CAIDA, GOLPE, CORTE, QUEMADURA, etc.

  -- Descripción
  description TEXT NOT NULL,
  immediate_action TEXT, -- Acción inmediata tomada

  -- Estado y seguimiento
  status VARCHAR(50) DEFAULT 'REPORTED', -- REPORTED, UNDER_INVESTIGATION, CLOSED

  -- Lesiones (si aplica)
  injury_type VARCHAR(100), -- NINGUNA, LEVE, INCAPACITANTE, MORTAL
  medical_attention BOOLEAN DEFAULT FALSE,
  days_lost INTEGER DEFAULT 0, -- Días perdidos por el incidente

  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT incident_type_valid CHECK (incident_type IN ('ACCIDENTE', 'INCIDENTE', 'CUASI_ACCIDENTE')),
  CONSTRAINT severity_valid CHECK (severity IN ('LEVE', 'MODERADO', 'GRAVE', 'MUY_GRAVE')),
  CONSTRAINT status_valid CHECK (status IN ('REPORTED', 'UNDER_INVESTIGATION', 'CLOSED'))
);

-- Índices para sst_incidents
CREATE INDEX IF NOT EXISTS idx_sst_incidents_station ON sst_incidents(station_id);
CREATE INDEX IF NOT EXISTS idx_sst_incidents_employee ON sst_incidents(employee_id);
CREATE INDEX IF NOT EXISTS idx_sst_incidents_date ON sst_incidents(incident_date);
CREATE INDEX IF NOT EXISTS idx_sst_incidents_type ON sst_incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_sst_incidents_status ON sst_incidents(status);

COMMENT ON TABLE sst_incidents IS 'Registro de incidentes y accidentes de seguridad y salud en el trabajo';
COMMENT ON COLUMN sst_incidents.incident_type IS 'Tipo: ACCIDENTE, INCIDENTE, CUASI_ACCIDENTE';
COMMENT ON COLUMN sst_incidents.severity IS 'Severidad: LEVE, MODERADO, GRAVE, MUY_GRAVE';
COMMENT ON COLUMN sst_incidents.injury_type IS 'Tipo de lesión: NINGUNA, LEVE, INCAPACITANTE, MORTAL';

-- =====================================================
-- 4. TABLA: epp_stock_movements (Movimientos de stock)
-- =====================================================
CREATE TABLE IF NOT EXISTS epp_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epp_id UUID NOT NULL REFERENCES epp_inventory(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,

  -- Información del movimiento
  movement_type VARCHAR(50) NOT NULL, -- ENTRADA, SALIDA, AJUSTE, ENTREGA
  quantity INTEGER NOT NULL,

  -- Stock antes y después
  stock_before INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,

  -- Referencias
  reference_type VARCHAR(50), -- DELIVERY, PURCHASE, ADJUSTMENT, etc.
  reference_id UUID, -- ID de la entrega, compra, etc.

  -- Información adicional
  reason TEXT,
  performed_by UUID REFERENCES system_users(id) ON DELETE SET NULL,

  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT movement_type_valid CHECK (movement_type IN ('ENTRADA', 'SALIDA', 'AJUSTE', 'ENTREGA'))
);

-- Índices para epp_stock_movements
CREATE INDEX IF NOT EXISTS idx_epp_stock_movements_epp ON epp_stock_movements(epp_id);
CREATE INDEX IF NOT EXISTS idx_epp_stock_movements_station ON epp_stock_movements(station_id);
CREATE INDEX IF NOT EXISTS idx_epp_stock_movements_type ON epp_stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_epp_stock_movements_date ON epp_stock_movements(created_at);

COMMENT ON TABLE epp_stock_movements IS 'Historial de movimientos de stock de EPPs';
COMMENT ON COLUMN epp_stock_movements.movement_type IS 'Tipo: ENTRADA, SALIDA, AJUSTE, ENTREGA';

-- =====================================================
-- 5. TRIGGER: Actualizar updated_at automáticamente
-- =====================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para epp_inventory
DROP TRIGGER IF EXISTS update_epp_inventory_updated_at ON epp_inventory;
CREATE TRIGGER update_epp_inventory_updated_at
    BEFORE UPDATE ON epp_inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Triggers para epp_deliveries
DROP TRIGGER IF EXISTS update_epp_deliveries_updated_at ON epp_deliveries;
CREATE TRIGGER update_epp_deliveries_updated_at
    BEFORE UPDATE ON epp_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Triggers para sst_incidents
DROP TRIGGER IF EXISTS update_sst_incidents_updated_at ON sst_incidents;
CREATE TRIGGER update_sst_incidents_updated_at
    BEFORE UPDATE ON sst_incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. DATOS INICIALES: Categorías de EPPs
-- =====================================================

-- Nota: Los datos iniciales se insertarán por estación según necesidad

-- =====================================================
-- 7. VERIFICACIÓN FINAL
-- =====================================================
SELECT
  'epp_inventory' as tabla,
  COUNT(*) as registros
FROM epp_inventory
UNION ALL
SELECT
  'epp_deliveries' as tabla,
  COUNT(*) as registros
FROM epp_deliveries
UNION ALL
SELECT
  'sst_incidents' as tabla,
  COUNT(*) as registros
FROM sst_incidents
UNION ALL
SELECT
  'epp_stock_movements' as tabla,
  COUNT(*) as registros
FROM epp_stock_movements;

-- FIN DE LA MIGRACIÓN
