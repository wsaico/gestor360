-- =====================================================
-- Gestor360° - Migración: Cargos y Tipos de Contrato
-- =====================================================

-- 1. CREAR TABLA DE CARGOS
CREATE TABLE IF NOT EXISTS job_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_roles_active ON job_roles(is_active);

-- 2. AGREGAR CAMPOS A EMPLOYEES
ALTER TABLE employees ADD COLUMN IF NOT EXISTS contract_type VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_schedule VARCHAR(20);

-- 3. INSERTAR CARGOS PREDETERMINADOS
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

-- 4. ACTUALIZAR EMPLEADOS EXISTENTES
UPDATE employees
SET contract_type = 'INDETERMINADO', work_schedule = 'FULL_8HRS'
WHERE contract_type IS NULL;

-- 5. TRIGGER PARA updated_at
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
