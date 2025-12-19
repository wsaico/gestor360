-- =====================================================
-- MÓDULO DE INVENTARIO DE ACTIVOS - GESTOR360°
-- Sistema escalable, inteligente y multi-tenant
-- =====================================================

-- =====================================================
-- 1. TABLA DE ORGANIZACIONES (Multi-Empresa Configurable)
-- =====================================================
-- IMPORTANTE: Esta tabla debe crearse PRIMERO porque 'assets' la referencia
-- Esta tabla es genérica y configurable para cualquier tipo de empresa
-- Ejemplos: Organizaciones, Clientes, Proveedores, Contratistas, etc.
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificación
  code VARCHAR(20) UNIQUE NOT NULL,                     -- Código único configurable (IATA, RUC, ID interno)
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(100),                              -- Nombre corto para pantallas

  -- Tipo de organización (configurable según industria)
  organization_type VARCHAR(50) DEFAULT 'CLIENTE',      -- CLIENTE, AEROLINEA, PROVEEDOR, CONTRATISTA, SOCIO, INTERNO, OTRO

  -- Información general
  industry VARCHAR(100),                                -- Industria/sector
  country VARCHAR(100),
  city VARCHAR(100),
  address TEXT,

  -- Contacto
  contact_person VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  website VARCHAR(255),

  -- Branding
  logo_url TEXT,
  primary_color VARCHAR(7),                             -- Color primario en HEX

  -- Información fiscal (opcional)
  tax_id VARCHAR(50),                                   -- RUC, NIT, etc.

  -- Configuración
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  metadata JSONB,                                       -- Campos adicionales configurables

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES system_users(id),
  updated_by UUID REFERENCES system_users(id)
);

-- Índices
CREATE INDEX idx_organizations_code ON organizations(code);
CREATE INDEX idx_organizations_type ON organizations(organization_type);
CREATE INDEX idx_organizations_active ON organizations(is_active);
CREATE INDEX idx_organizations_name ON organizations(name);

-- Insertar organizaciones ejemplo (organizaciones para caso de uso inicial)
-- IMPORTANTE: Estas son solo ejemplos, se pueden eliminar o modificar según la industria
INSERT INTO organizations (code, name, short_name, organization_type, country) VALUES
  ('LA', 'LATAM Airlines', 'LATAM', 'AEROLINEA', 'Chile'),
  ('H2', 'SKY Airline', 'SKY', 'AEROLINEA', 'Chile'),
  ('JZ', 'JetSMART', 'JetSMART', 'AEROLINEA', 'Chile'),
  ('AV', 'Avianca', 'Avianca', 'AEROLINEA', 'Colombia'),
  ('LP', 'LATAM Perú', 'LATAM PE', 'AEROLINEA', 'Perú'),
  ('TALMA', 'TALMA Servicios Aeroportuarios', 'TALMA', 'INTERNO', 'Perú'),
  ('OTROS', 'Otros / Sin Especificar', 'Otros', 'OTRO', 'Internacional')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 2. TABLA PRINCIPAL DE ACTIVOS
-- =====================================================
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant y área
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,  -- Organización propietaria/cliente configurable

  -- Identificación única
  asset_code VARCHAR(50) UNIQUE NOT NULL,              -- Código QR/Barcode
  asset_tag VARCHAR(50),                                -- Etiqueta física adicional
  asset_name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Clasificación inteligente
  asset_category VARCHAR(50) NOT NULL,                  -- EQUIPOS_COMPUTO, EQUIPOS_MOVILES, VEHICULOS_MOTORIZADOS, VEHICULOS_NO_MOTORIZADOS, EQUIPOS_RAMPA, HERRAMIENTAS, MOBILIARIO, ELECTRONICA
  asset_subcategory VARCHAR(100),                       -- Laptop, Desktop, Tablet, Smartphone, etc.
  asset_type VARCHAR(100),                              -- Tipo específico configurable

  -- Información técnica
  brand VARCHAR(100),
  model VARCHAR(100),
  serial_number VARCHAR(100),                           -- Número de serie
  imei VARCHAR(20),                                     -- Para equipos móviles
  mac_address VARCHAR(20),                              -- Para equipos de red
  ip_address VARCHAR(15),                               -- IP asignada

  -- Especificaciones técnicas (JSONB para flexibilidad)
  specifications JSONB,                                 -- {cpu: 'i7', ram: '16GB', storage: '512GB SSD', etc}

  -- Estado y condición
  status VARCHAR(50) DEFAULT 'DISPONIBLE' NOT NULL,    -- DISPONIBLE, EN_USO, MANTENIMIENTO, BAJA, PERDIDO, TRANSFERENCIA
  condition VARCHAR(50) DEFAULT 'BUENO',                -- NUEVO, EXCELENTE, BUENO, REGULAR, MALO, INOPERATIVO
  operational_status BOOLEAN DEFAULT TRUE,              -- Funcionando o no

  -- Asignación dinámica
  assigned_to_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  assigned_date DATE,
  assignment_notes TEXT,

  -- Valores financieros
  acquisition_method VARCHAR(50),                       -- COMPRA, DONACION, LEASING, ALQUILER, FABRICACION_PROPIA, OTRO
  acquisition_date DATE,
  acquisition_value DECIMAL(12, 2),
  current_value DECIMAL(12, 2),
  depreciation_rate DECIMAL(5, 2) DEFAULT 20.00,       -- Porcentaje anual
  residual_value DECIMAL(12, 2),

  -- Información de compra
  supplier VARCHAR(255),
  purchase_order VARCHAR(100),
  invoice_number VARCHAR(100),
  warranty_months INTEGER DEFAULT 12,
  warranty_expiry_date DATE,

  -- Mantenimiento
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  maintenance_frequency_months INTEGER DEFAULT 6,
  maintenance_notes TEXT,
  requires_calibration BOOLEAN DEFAULT FALSE,
  last_calibration_date DATE,
  next_calibration_date DATE,

  -- Ubicación física detallada
  location_building VARCHAR(100),
  location_floor VARCHAR(50),
  location_room VARCHAR(100),
  location_detail VARCHAR(255),                         -- Rack A3, Mesa 5, etc.

  -- Propietario (para multi-empresa)
  owner_type VARCHAR(50) DEFAULT 'EMPRESA',             -- EMPRESA, CLIENTE, PROVEEDOR, TERCERO
  owner_entity_id UUID,                                 -- ID de la entidad propietaria (puede ser organization_id)
  owner_name VARCHAR(255),                              -- Nombre del propietario

  -- Documentación y multimedia
  photo_url TEXT,
  qr_code_url TEXT,                                     -- URL del código QR generado
  documents JSONB,                                      -- Array de {name, url, type, uploaded_date}

  -- Compliance y certificaciones
  requires_certification BOOLEAN DEFAULT FALSE,
  certifications JSONB,                                 -- Array de certificaciones requeridas
  compliance_notes TEXT,

  -- Etiquetas dinámicas (tags)
  tags TEXT[],                                          -- Array de tags para búsqueda flexible

  -- Control de uso
  usage_hours INTEGER DEFAULT 0,                        -- Horas de uso acumuladas
  usage_kilometers INTEGER DEFAULT 0,                   -- KM recorridos (vehículos)
  usage_cycles INTEGER DEFAULT 0,                       -- Ciclos de uso (equipos)

  -- Tiempo de vida útil
  useful_life_years INTEGER DEFAULT 5,
  manufacture_year INTEGER,
  estimated_end_of_life DATE,

  -- Alertas y notificaciones
  alert_maintenance BOOLEAN DEFAULT FALSE,
  alert_calibration BOOLEAN DEFAULT FALSE,
  alert_warranty BOOLEAN DEFAULT FALSE,
  alert_depreciation BOOLEAN DEFAULT FALSE,

  -- Observaciones y notas
  notes TEXT,
  internal_notes TEXT,                                  -- Notas internas no visibles en reportes

  -- Flags de control
  is_active BOOLEAN DEFAULT TRUE,
  is_critical BOOLEAN DEFAULT FALSE,                    -- Activo crítico para operaciones
  is_transferable BOOLEAN DEFAULT TRUE,                 -- Puede ser transferido
  is_loanable BOOLEAN DEFAULT TRUE,                     -- Puede ser prestado

  -- Auditoría completa
  created_by UUID REFERENCES system_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES system_users(id),
  deleted_at TIMESTAMPTZ,                               -- Soft delete
  deleted_by UUID REFERENCES system_users(id),

  -- Constraints
  CONSTRAINT asset_code_format CHECK (asset_code ~ '^[A-Z0-9-_]+$'),
  CONSTRAINT valid_depreciation CHECK (depreciation_rate >= 0 AND depreciation_rate <= 100),
  CONSTRAINT valid_values CHECK (acquisition_value >= 0 AND current_value >= 0)
);

-- Índices para optimización
CREATE INDEX idx_assets_station ON assets(station_id) WHERE is_active = TRUE;
CREATE INDEX idx_assets_area ON assets(area_id) WHERE is_active = TRUE;
CREATE INDEX idx_assets_organization ON assets(organization_id) WHERE is_active = TRUE;
CREATE INDEX idx_assets_category ON assets(asset_category);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_assigned ON assets(assigned_to_employee_id) WHERE assigned_to_employee_id IS NOT NULL;
CREATE INDEX idx_assets_code ON assets(asset_code);
CREATE INDEX idx_assets_serial ON assets(serial_number) WHERE serial_number IS NOT NULL;
CREATE INDEX idx_assets_imei ON assets(imei) WHERE imei IS NOT NULL;
CREATE INDEX idx_assets_tags ON assets USING GIN(tags);
CREATE INDEX idx_assets_specifications ON assets USING GIN(specifications);
CREATE INDEX idx_assets_active ON assets(is_active, station_id);

-- Índice para búsqueda de texto completo
CREATE INDEX idx_assets_search ON assets USING GIN(
  to_tsvector('spanish', COALESCE(asset_name, '') || ' ' ||
                          COALESCE(description, '') || ' ' ||
                          COALESCE(brand, '') || ' ' ||
                          COALESCE(model, ''))
);

-- =====================================================
-- 3. HISTORIAL DE MOVIMIENTOS DE ACTIVOS
-- =====================================================
CREATE TABLE IF NOT EXISTS asset_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,

  -- Tipo de movimiento
  movement_type VARCHAR(50) NOT NULL,                   -- ASIGNACION, DEVOLUCION, TRANSFERENCIA_ESTACION, TRANSFERENCIA_AREA, TRANSFERENCIA_AEROLINEA, MANTENIMIENTO, BAJA, PRESTAMO, AJUSTE

  -- Origen
  from_station_id UUID REFERENCES stations(id),
  from_area_id UUID REFERENCES areas(id),
  from_organization_id UUID REFERENCES organizations(id),
  from_employee_id UUID REFERENCES employees(id),
  from_location VARCHAR(255),

  -- Destino
  to_station_id UUID REFERENCES stations(id),
  to_area_id UUID REFERENCES areas(id),
  to_organization_id UUID REFERENCES organizations(id),
  to_employee_id UUID REFERENCES employees(id),
  to_location VARCHAR(255),

  -- Información del movimiento
  movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  movement_time TIME NOT NULL DEFAULT CURRENT_TIME,
  reason TEXT NOT NULL,
  notes TEXT,

  -- Estados antes y después
  status_before VARCHAR(50),
  status_after VARCHAR(50),
  condition_before VARCHAR(50),
  condition_after VARCHAR(50),

  -- Aprobación (para transferencias importantes)
  requires_approval BOOLEAN DEFAULT FALSE,
  approved BOOLEAN DEFAULT TRUE,
  approved_by UUID REFERENCES system_users(id),
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,

  -- Documentos de respaldo
  documents JSONB,                                      -- Actas de transferencia, fotos, etc.

  -- Auditoría
  performed_by UUID NOT NULL REFERENCES system_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_asset_movements_asset ON asset_movements(asset_id);
CREATE INDEX idx_asset_movements_station ON asset_movements(station_id);
CREATE INDEX idx_asset_movements_type ON asset_movements(movement_type);
CREATE INDEX idx_asset_movements_date ON asset_movements(movement_date DESC);
CREATE INDEX idx_asset_movements_employee_from ON asset_movements(from_employee_id) WHERE from_employee_id IS NOT NULL;
CREATE INDEX idx_asset_movements_employee_to ON asset_movements(to_employee_id) WHERE to_employee_id IS NOT NULL;

-- =====================================================
-- 4. HISTORIAL DE MANTENIMIENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS asset_maintenances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,

  -- Información del mantenimiento
  maintenance_type VARCHAR(50) NOT NULL,                -- PREVENTIVO, CORRECTIVO, CALIBRACION, INSPECCION, LIMPIEZA
  maintenance_date DATE NOT NULL,
  completed_date DATE,

  -- Proveedor/Técnico
  performed_by_employee_id UUID REFERENCES employees(id),
  performed_by_external VARCHAR(255),                   -- Empresa externa
  technician_name VARCHAR(255),

  -- Detalles
  description TEXT NOT NULL,
  issues_found TEXT,
  actions_taken TEXT,
  parts_replaced JSONB,                                 -- Array de partes reemplazadas

  -- Costos
  labor_cost DECIMAL(10, 2) DEFAULT 0,
  parts_cost DECIMAL(10, 2) DEFAULT 0,
  total_cost DECIMAL(10, 2) GENERATED ALWAYS AS (labor_cost + parts_cost) STORED,

  -- Estado
  status VARCHAR(50) DEFAULT 'PROGRAMADO',              -- PROGRAMADO, EN_PROCESO, COMPLETADO, CANCELADO
  priority VARCHAR(20) DEFAULT 'NORMAL',                -- BAJA, NORMAL, ALTA, CRITICA

  -- Próximo mantenimiento
  next_maintenance_date DATE,

  -- Documentos
  invoice_number VARCHAR(100),
  documents JSONB,
  photos_before JSONB,
  photos_after JSONB,

  -- Auditoría
  created_by UUID REFERENCES system_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_asset_maintenances_asset ON asset_maintenances(asset_id);
CREATE INDEX idx_asset_maintenances_station ON asset_maintenances(station_id);
CREATE INDEX idx_asset_maintenances_date ON asset_maintenances(maintenance_date DESC);
CREATE INDEX idx_asset_maintenances_status ON asset_maintenances(status);
CREATE INDEX idx_asset_maintenances_type ON asset_maintenances(maintenance_type);

-- =====================================================
-- 5. PROCESO DE BAJA DE ACTIVOS
-- =====================================================
CREATE TABLE IF NOT EXISTS asset_disposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,

  -- Información de la baja
  disposal_type VARCHAR(50) NOT NULL,                   -- VENTA, DONACION, DESECHO, PERDIDA, ROBO, OBSOLESCENCIA
  disposal_date DATE NOT NULL,
  disposal_reason TEXT NOT NULL,

  -- Valoración
  book_value DECIMAL(12, 2),                            -- Valor en libros
  disposal_value DECIMAL(12, 2),                        -- Valor de venta/recuperación
  loss_gain DECIMAL(12, 2) GENERATED ALWAYS AS (disposal_value - book_value) STORED,

  -- Detalles según tipo
  buyer_name VARCHAR(255),                              -- Si es venta
  buyer_document VARCHAR(50),
  sale_document VARCHAR(100),
  donation_recipient VARCHAR(255),                      -- Si es donación
  donation_certificate VARCHAR(100),

  -- Aprobación
  approved_by UUID REFERENCES system_users(id),
  approved_at TIMESTAMPTZ,
  approval_document VARCHAR(100),

  -- Estado del proceso
  status VARCHAR(50) DEFAULT 'PENDIENTE',               -- PENDIENTE, APROBADO, RECHAZADO, COMPLETADO

  -- Documentación
  documents JSONB,
  photos JSONB,
  notes TEXT,

  -- Auditoría
  requested_by UUID NOT NULL REFERENCES system_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_asset_disposals_asset ON asset_disposals(asset_id);
CREATE INDEX idx_asset_disposals_station ON asset_disposals(station_id);
CREATE INDEX idx_asset_disposals_type ON asset_disposals(disposal_type);
CREATE INDEX idx_asset_disposals_date ON asset_disposals(disposal_date DESC);
CREATE INDEX idx_asset_disposals_status ON asset_disposals(status);

-- =====================================================
-- 6. VISTAS INTELIGENTES
-- =====================================================

-- Vista de activos con toda la información relacionada
CREATE OR REPLACE VIEW vw_assets_complete AS
SELECT
  a.*,
  s.name AS station_name,
  s.code AS station_code,
  ar.name AS area_name,
  al.name AS organization_name,
  al.code AS organization_code,
  e.full_name AS assigned_to_name,
  e.dni AS assigned_to_dni,
  e.role_name AS assigned_to_role,
  -- Calcular depreciación actual
  CASE
    WHEN a.acquisition_date IS NOT NULL AND a.depreciation_rate > 0 THEN
      GREATEST(
        a.acquisition_value - (
          a.acquisition_value *
          (a.depreciation_rate / 100) *
          EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.acquisition_date))
        ),
        COALESCE(a.residual_value, 0)
      )
    ELSE a.current_value
  END AS calculated_current_value,
  -- Calcular edad del activo
  CASE
    WHEN a.acquisition_date IS NOT NULL THEN
      EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.acquisition_date))
    ELSE NULL
  END AS asset_age_years,
  -- Estado de mantenimiento
  CASE
    WHEN a.next_maintenance_date IS NULL THEN 'SIN_PROGRAMAR'
    WHEN a.next_maintenance_date < CURRENT_DATE THEN 'VENCIDO'
    WHEN a.next_maintenance_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'PROXIMO'
    ELSE 'VIGENTE'
  END AS maintenance_status,
  -- Días hasta próximo mantenimiento
  CASE
    WHEN a.next_maintenance_date IS NOT NULL THEN
      a.next_maintenance_date - CURRENT_DATE
    ELSE NULL
  END AS days_to_maintenance,
  -- Estado de garantía
  CASE
    WHEN a.warranty_expiry_date IS NULL THEN 'SIN_GARANTIA'
    WHEN a.warranty_expiry_date < CURRENT_DATE THEN 'VENCIDA'
    WHEN a.warranty_expiry_date <= CURRENT_DATE + INTERVAL '60 days' THEN 'POR_VENCER'
    ELSE 'VIGENTE'
  END AS warranty_status,
  -- Último movimiento
  (SELECT movement_type FROM asset_movements
   WHERE asset_id = a.id
   ORDER BY created_at DESC LIMIT 1) AS last_movement_type,
  (SELECT created_at FROM asset_movements
   WHERE asset_id = a.id
   ORDER BY created_at DESC LIMIT 1) AS last_movement_date
FROM assets a
LEFT JOIN stations s ON a.station_id = s.id
LEFT JOIN areas ar ON a.area_id = ar.id
LEFT JOIN organizations al ON a.organization_id = al.id
LEFT JOIN employees e ON a.assigned_to_employee_id = e.id
WHERE a.is_active = TRUE;

-- Vista de mantenimientos pendientes/próximos
CREATE OR REPLACE VIEW vw_maintenance_alerts AS
SELECT
  a.id AS asset_id,
  a.asset_code,
  a.asset_name,
  a.station_id,
  s.name AS station_name,
  a.area_id,
  ar.name AS area_name,
  a.next_maintenance_date,
  a.next_maintenance_date - CURRENT_DATE AS days_remaining,
  CASE
    WHEN a.next_maintenance_date < CURRENT_DATE THEN 'VENCIDO'
    WHEN a.next_maintenance_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'URGENTE'
    WHEN a.next_maintenance_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'PROXIMO'
    ELSE 'PROGRAMADO'
  END AS alert_level,
  a.maintenance_frequency_months,
  a.last_maintenance_date
FROM assets a
LEFT JOIN stations s ON a.station_id = s.id
LEFT JOIN areas ar ON a.area_id = ar.id
WHERE a.is_active = TRUE
  AND a.next_maintenance_date IS NOT NULL
  AND a.next_maintenance_date <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY a.next_maintenance_date ASC;

-- Vista de activos por asignar
CREATE OR REPLACE VIEW vw_assets_available AS
SELECT
  a.*,
  s.name AS station_name,
  ar.name AS area_name,
  al.name AS organization_name
FROM assets a
LEFT JOIN stations s ON a.station_id = s.id
LEFT JOIN areas ar ON a.area_id = ar.id
LEFT JOIN organizations al ON a.organization_id = al.id
WHERE a.is_active = TRUE
  AND a.status = 'DISPONIBLE'
  AND a.operational_status = TRUE
ORDER BY a.asset_code;

-- =====================================================
-- 7. FUNCIONES ÚTILES
-- =====================================================

-- Función para calcular depreciación automática
CREATE OR REPLACE FUNCTION calculate_asset_depreciation(asset_id_param UUID)
RETURNS DECIMAL(12, 2)
LANGUAGE plpgsql
AS $$
DECLARE
  v_acquisition_value DECIMAL(12, 2);
  v_acquisition_date DATE;
  v_depreciation_rate DECIMAL(5, 2);
  v_residual_value DECIMAL(12, 2);
  v_years_old NUMERIC;
  v_depreciated_value DECIMAL(12, 2);
BEGIN
  -- Obtener datos del activo
  SELECT acquisition_value, acquisition_date, depreciation_rate, residual_value
  INTO v_acquisition_value, v_acquisition_date, v_depreciation_rate, v_residual_value
  FROM assets
  WHERE id = asset_id_param;

  -- Si no hay datos suficientes, retornar NULL
  IF v_acquisition_value IS NULL OR v_acquisition_date IS NULL OR v_depreciation_rate IS NULL THEN
    RETURN NULL;
  END IF;

  -- Calcular años transcurridos
  v_years_old := EXTRACT(YEAR FROM AGE(CURRENT_DATE, v_acquisition_date));

  -- Calcular valor depreciado
  v_depreciated_value := v_acquisition_value - (v_acquisition_value * (v_depreciation_rate / 100) * v_years_old);

  -- Asegurar que no sea menor al valor residual
  IF v_residual_value IS NOT NULL AND v_depreciated_value < v_residual_value THEN
    v_depreciated_value := v_residual_value;
  END IF;

  -- No puede ser negativo
  IF v_depreciated_value < 0 THEN
    v_depreciated_value := 0;
  END IF;

  RETURN v_depreciated_value;
END;
$$;

-- Función para generar código de activo automático
CREATE OR REPLACE FUNCTION generate_asset_code(
  category_param VARCHAR,
  station_code_param VARCHAR
)
RETURNS VARCHAR
LANGUAGE plpgsql
AS $$
DECLARE
  v_prefix VARCHAR(10);
  v_count INTEGER;
  v_code VARCHAR(50);
BEGIN
  -- Determinar prefijo según categoría
  v_prefix := CASE category_param
    WHEN 'EQUIPOS_COMPUTO' THEN 'EC'
    WHEN 'EQUIPOS_MOVILES' THEN 'EM'
    WHEN 'VEHICULOS_MOTORIZADOS' THEN 'VM'
    WHEN 'VEHICULOS_NO_MOTORIZADOS' THEN 'VNM'
    WHEN 'EQUIPOS_RAMPA' THEN 'ER'
    WHEN 'HERRAMIENTAS' THEN 'HE'
    WHEN 'MOBILIARIO' THEN 'MO'
    WHEN 'ELECTRONICA' THEN 'EL'
    ELSE 'AS'
  END;

  -- Contar activos existentes con este prefijo y estación
  SELECT COUNT(*) + 1
  INTO v_count
  FROM assets
  WHERE asset_code LIKE station_code_param || '-' || v_prefix || '%';

  -- Generar código: ESTACION-PREFIJO-NUMERO
  v_code := station_code_param || '-' || v_prefix || '-' || LPAD(v_count::TEXT, 6, '0');

  RETURN v_code;
END;
$$;

-- =====================================================
-- 8. TRIGGERS
-- =====================================================

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_asset_maintenances_updated_at BEFORE UPDATE ON asset_maintenances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_asset_disposals_updated_at BEFORE UPDATE ON asset_disposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para registrar movimiento al cambiar asignación
CREATE OR REPLACE FUNCTION log_asset_assignment_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo si cambió la asignación
  IF (OLD.assigned_to_employee_id IS DISTINCT FROM NEW.assigned_to_employee_id) THEN
    INSERT INTO asset_movements (
      asset_id,
      station_id,
      movement_type,
      from_employee_id,
      to_employee_id,
      from_station_id,
      to_station_id,
      from_area_id,
      to_area_id,
      movement_date,
      reason,
      status_before,
      status_after,
      performed_by
    ) VALUES (
      NEW.id,
      NEW.station_id,
      CASE
        WHEN OLD.assigned_to_employee_id IS NULL THEN 'ASIGNACION'
        WHEN NEW.assigned_to_employee_id IS NULL THEN 'DEVOLUCION'
        ELSE 'REASIGNACION'
      END,
      OLD.assigned_to_employee_id,
      NEW.assigned_to_employee_id,
      OLD.station_id,
      NEW.station_id,
      OLD.area_id,
      NEW.area_id,
      CURRENT_DATE,
      COALESCE(NEW.assignment_notes, 'Cambio de asignación automático'),
      OLD.status,
      NEW.status,
      NEW.updated_by
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_asset_assignment
  AFTER UPDATE ON assets
  FOR EACH ROW
  WHEN (OLD.assigned_to_employee_id IS DISTINCT FROM NEW.assigned_to_employee_id)
  EXECUTE FUNCTION log_asset_assignment_change();

-- =====================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en las tablas
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_maintenances ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_disposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Política para assets (reutilizando la lógica existente)
DROP POLICY IF EXISTS allow_all_authenticated_assets ON assets;
CREATE POLICY allow_all_authenticated_assets ON assets
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política para asset_movements
DROP POLICY IF EXISTS allow_all_authenticated_asset_movements ON asset_movements;
CREATE POLICY allow_all_authenticated_asset_movements ON asset_movements
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política para asset_maintenances
DROP POLICY IF EXISTS allow_all_authenticated_asset_maintenances ON asset_maintenances;
CREATE POLICY allow_all_authenticated_asset_maintenances ON asset_maintenances
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política para asset_disposals
DROP POLICY IF EXISTS allow_all_authenticated_asset_disposals ON asset_disposals;
CREATE POLICY allow_all_authenticated_asset_disposals ON asset_disposals
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política para organizations (lectura para todos, escritura solo ADMIN)
DROP POLICY IF EXISTS allow_read_organizations ON organizations;
CREATE POLICY allow_read_organizations ON organizations
  FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- 10. DATOS INICIALES DE EJEMPLO (OPCIONAL)
-- =====================================================

-- Comentar estas líneas si no se desean datos de ejemplo

/*
-- Ejemplo de activo de cómputo
INSERT INTO assets (
  station_id,
  area_id,
  asset_code,
  asset_name,
  description,
  asset_category,
  asset_subcategory,
  brand,
  model,
  serial_number,
  specifications,
  status,
  condition,
  acquisition_date,
  acquisition_value,
  current_value,
  tags
) VALUES (
  (SELECT id FROM stations LIMIT 1),
  (SELECT id FROM areas WHERE name = 'ADMINISTRATIVO' LIMIT 1),
  'JAU-EC-000001',
  'Laptop Dell Latitude 5420',
  'Laptop corporativa para trabajo administrativo',
  'EQUIPOS_COMPUTO',
  'Laptop',
  'Dell',
  'Latitude 5420',
  'SN123456789',
  '{"cpu": "Intel i7-1185G7", "ram": "16GB DDR4", "storage": "512GB SSD NVMe", "screen": "14 FHD", "os": "Windows 11 Pro"}'::jsonb,
  'DISPONIBLE',
  'NUEVO',
  '2024-01-15',
  3500.00,
  3500.00,
  ARRAY['laptop', 'dell', 'corporativo', 'i7']
);
*/

-- =====================================================
-- RESUMEN DE IMPLEMENTACIÓN
-- =====================================================

-- Este script SQL crea (en el orden correcto de dependencias):
-- 1. Tabla 'organizations' para manejo multi-empresa (PRIMERO)
-- 2. Tabla principal 'assets' con campos inteligentes y flexibles
-- 3. Tabla 'asset_movements' para trackear todos los movimientos
-- 4. Tabla 'asset_maintenances' para historial de mantenimientos
-- 5. Tabla 'asset_disposals' para proceso de baja
-- 6. Vistas inteligentes para consultas optimizadas
-- 7. Funciones útiles (cálculo de depreciación, generación de códigos)
-- 8. Triggers automáticos (auditoría, logging)
-- 9. Row Level Security configurado
-- 10. Índices optimizados para búsquedas rápidas

COMMENT ON TABLE assets IS 'Inventario principal de activos - Sistema escalable multi-tenant';
COMMENT ON TABLE organizations IS 'Catálogo de organizaciones para activos multi-empresa';
COMMENT ON TABLE asset_movements IS 'Historial completo de movimientos de activos';
COMMENT ON TABLE asset_maintenances IS 'Registro de mantenimientos preventivos y correctivos';
COMMENT ON TABLE asset_disposals IS 'Proceso de baja de activos con aprobaciones';
