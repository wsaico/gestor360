-- =====================================================
-- FIX: Agregar columnas faltantes a epp_deliveries
-- =====================================================

-- Agregar document_code si no existe
ALTER TABLE epp_deliveries 
ADD COLUMN IF NOT EXISTS document_code VARCHAR(50) UNIQUE;

-- Agregar columnas de firma del responsable si no existen
ALTER TABLE epp_deliveries 
ADD COLUMN IF NOT EXISTS employee_signature_data TEXT;

ALTER TABLE epp_deliveries 
ADD COLUMN IF NOT EXISTS employee_signature_ip VARCHAR(45);

ALTER TABLE epp_deliveries 
ADD COLUMN IF NOT EXISTS employee_signature_timestamp TIMESTAMP WITH TIME ZONE;

ALTER TABLE epp_deliveries 
ADD COLUMN IF NOT EXISTS responsible_signature_data TEXT;

ALTER TABLE epp_deliveries 
ADD COLUMN IF NOT EXISTS responsible_name VARCHAR(255);

ALTER TABLE epp_deliveries 
ADD COLUMN IF NOT EXISTS responsible_position VARCHAR(255);

ALTER TABLE epp_deliveries 
ADD COLUMN IF NOT EXISTS responsible_signature_timestamp TIMESTAMP WITH TIME ZONE;

-- FUNCIÓN para generar código único de documento
CREATE OR REPLACE FUNCTION generate_document_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
BEGIN
  code := substring(md5(random()::text) from 1 for 8);
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER para generar código de documento automáticamente
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

-- Verificar que la tabla epp_items existe, si no, crearla
CREATE TABLE IF NOT EXISTS epp_items (
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

CREATE INDEX IF NOT EXISTS idx_epp_items_station ON epp_items(station_id);
CREATE INDEX IF NOT EXISTS idx_epp_items_type ON epp_items(item_type);
CREATE INDEX IF NOT EXISTS idx_epp_items_active ON epp_items(is_active);

-- Trigger para epp_items
DROP TRIGGER IF EXISTS update_epp_items_updated_at ON epp_items;
CREATE TRIGGER update_epp_items_updated_at
    BEFORE UPDATE ON epp_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Tabla employee_epp_assignments si no existe
CREATE TABLE IF NOT EXISTS employee_epp_assignments (
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

CREATE INDEX IF NOT EXISTS idx_employee_epp_assignments_employee ON employee_epp_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_epp_assignments_item ON employee_epp_assignments(item_id);
CREATE INDEX IF NOT EXISTS idx_employee_epp_assignments_renewal ON employee_epp_assignments(renewal_date);

-- Tabla epp_stock_movements si no existe
CREATE TABLE IF NOT EXISTS epp_stock_movements (
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

CREATE INDEX IF NOT EXISTS idx_epp_stock_movements_item ON epp_stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_epp_stock_movements_station ON epp_stock_movements(station_id);

-- Habilitar RLS
ALTER TABLE epp_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE epp_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_epp_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE epp_stock_movements ENABLE ROW LEVEL SECURITY;

-- Políticas para acceso público (desarrollo)
DROP POLICY IF EXISTS "epp_items_public_access" ON epp_items;
CREATE POLICY "epp_items_public_access" ON epp_items FOR ALL USING (true);

DROP POLICY IF EXISTS "epp_deliveries_public_access" ON epp_deliveries;
CREATE POLICY "epp_deliveries_public_access" ON epp_deliveries FOR ALL USING (true);

DROP POLICY IF EXISTS "employee_epp_assignments_public_access" ON employee_epp_assignments;
CREATE POLICY "employee_epp_assignments_public_access" ON employee_epp_assignments FOR ALL USING (true);

DROP POLICY IF EXISTS "epp_stock_movements_public_access" ON epp_stock_movements;
CREATE POLICY "epp_stock_movements_public_access" ON epp_stock_movements FOR ALL USING (true);

-- Verificación
SELECT 'FIX Completado' as status;
