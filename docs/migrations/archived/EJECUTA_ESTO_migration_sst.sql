-- =====================================================
-- MIGRACIÓN COMPLETA MÓDULO SST
-- EJECUTA ESTE ARCHIVO EN TU SQL EDITOR DE SUPABASE
-- =====================================================

-- 1. Crear tabla epp_inventory
CREATE TABLE IF NOT EXISTS epp_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  size VARCHAR(50),
  unit VARCHAR(50) NOT NULL DEFAULT 'UNIDAD',
  stock_current INTEGER NOT NULL DEFAULT 0,
  stock_min INTEGER NOT NULL DEFAULT 10,
  stock_max INTEGER NOT NULL DEFAULT 100,
  brand VARCHAR(100),
  model VARCHAR(100),
  certification VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT stock_non_negative CHECK (stock_current >= 0),
  CONSTRAINT stock_min_positive CHECK (stock_min >= 0),
  CONSTRAINT stock_max_greater_than_min CHECK (stock_max >= stock_min)
);

CREATE INDEX IF NOT EXISTS idx_epp_inventory_station ON epp_inventory(station_id);
CREATE INDEX IF NOT EXISTS idx_epp_inventory_category ON epp_inventory(category);
CREATE INDEX IF NOT EXISTS idx_epp_inventory_active ON epp_inventory(is_active);

-- 2. Crear tabla epp_deliveries
CREATE TABLE IF NOT EXISTS epp_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  delivered_by UUID REFERENCES system_users(id) ON DELETE SET NULL,
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_time TIME DEFAULT CURRENT_TIME,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  signature_data TEXT,
  signature_ip VARCHAR(45),
  signature_timestamp TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  delivery_reason VARCHAR(255),
  status VARCHAR(50) DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT delivery_status_valid CHECK (status IN ('PENDING', 'SIGNED', 'CANCELLED'))
);

CREATE INDEX IF NOT EXISTS idx_epp_deliveries_station ON epp_deliveries(station_id);
CREATE INDEX IF NOT EXISTS idx_epp_deliveries_employee ON epp_deliveries(employee_id);
CREATE INDEX IF NOT EXISTS idx_epp_deliveries_date ON epp_deliveries(delivery_date);

-- 3. Crear tabla sst_incidents
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

-- 4. Crear tabla epp_stock_movements
CREATE TABLE IF NOT EXISTS epp_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epp_id UUID NOT NULL REFERENCES epp_inventory(id) ON DELETE CASCADE,
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
  CONSTRAINT movement_type_valid CHECK (movement_type IN ('ENTRADA', 'SALIDA', 'AJUSTE', 'ENTREGA'))
);

CREATE INDEX IF NOT EXISTS idx_epp_stock_movements_epp ON epp_stock_movements(epp_id);
CREATE INDEX IF NOT EXISTS idx_epp_stock_movements_station ON epp_stock_movements(station_id);

-- 5. Crear triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_epp_inventory_updated_at ON epp_inventory;
CREATE TRIGGER update_epp_inventory_updated_at
    BEFORE UPDATE ON epp_inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_epp_deliveries_updated_at ON epp_deliveries;
CREATE TRIGGER update_epp_deliveries_updated_at
    BEFORE UPDATE ON epp_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sst_incidents_updated_at ON sst_incidents;
CREATE TRIGGER update_sst_incidents_updated_at
    BEFORE UPDATE ON sst_incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Verificar que las tablas se crearon correctamente
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
