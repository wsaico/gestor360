-- =====================================================
-- Gestor360° - Migración: Cargos y Tipos de Contrato
-- Versión: 2.1.0
-- Fecha: 2025-12-17
-- =====================================================

-- IMPORTANTE: Ejecutar este script en el SQL Editor de Supabase

-- =====================================================
-- 1. CREAR TABLA DE CARGOS (job_roles)
-- =====================================================

CREATE TABLE IF NOT EXISTS job_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas
CREATE INDEX IF NOT EXISTS idx_job_roles_active ON job_roles(is_active);

-- =====================================================
-- 2. AGREGAR CAMPOS A LA TABLA EMPLOYEES
-- =====================================================

-- Agregar campo contract_type (tipo de contrato)
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS contract_type VARCHAR(50);

-- Agregar campo work_schedule (jornada laboral)
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS work_schedule VARCHAR(20);

-- =====================================================
-- 3. INSERTAR CARGOS PREDETERMINADOS
-- =====================================================

INSERT INTO job_roles (name, description, is_active) VALUES
  ('Supervisor de Estación', 'Encargado de supervisar las operaciones de la estación', TRUE),
  ('Auxiliar de Rampa', 'Personal de apoyo en operaciones de rampa', TRUE),
  ('Operador 1', 'Operador nivel 1', TRUE),
  ('Operador 2', 'Operador nivel 2', TRUE),
  ('Operador 3', 'Operador nivel 3', TRUE),
  ('Supervisor de Tráfico', 'Encargado de supervisar el tráfico aéreo', TRUE),
  ('Agente de Tráfico', 'Personal encargado del control de tráfico', TRUE),
  ('Técnico de Mantenimiento OMA', 'Técnico especializado en mantenimiento OMA', TRUE),
  ('Técnico Senior 1', 'Técnico con experiencia nivel senior', TRUE)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 4. ACTUALIZAR EMPLEADOS EXISTENTES
-- =====================================================

-- Asignar valores por defecto a empleados existentes que no tengan contrato
UPDATE employees
SET
  contract_type = 'INDETERMINADO',
  work_schedule = 'FULL_8HRS'
WHERE contract_type IS NULL;

-- =====================================================
-- 5. TRIGGER PARA ACTUALIZAR updated_at EN job_roles
-- =====================================================

CREATE OR REPLACE FUNCTION update_job_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_job_roles_updated_at
  BEFORE UPDATE ON job_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_job_roles_updated_at();

-- =====================================================
-- 6. VERIFICACIÓN DE LA MIGRACIÓN
-- =====================================================

-- Ver todos los cargos creados
SELECT * FROM job_roles ORDER BY name;

-- Ver estructura actualizada de employees
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'employees'
  AND column_name IN ('contract_type', 'work_schedule', 'role_name')
ORDER BY ordinal_position;

-- =====================================================
-- NOTAS:
-- =====================================================
-- - El campo 'role_name' en employees ahora debería hacer referencia a job_roles.name
-- - Los tipos de contrato válidos son: INDETERMINADO, INCREMENTO_ACTIVIDAD
-- - Las jornadas válidas son: FULL_8HRS, FULL_6HRS, PART_TIME
-- - Se pueden agregar más cargos desde la interfaz de administración
-- =====================================================
