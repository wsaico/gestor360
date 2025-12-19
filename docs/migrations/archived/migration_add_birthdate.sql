-- =====================================================
-- Migración: Agregar campo birth_date a employees
-- =====================================================
-- Agrega el campo birth_date para alertas de cumpleaños

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'birth_date'
  ) THEN
    ALTER TABLE employees ADD COLUMN birth_date DATE;
    COMMENT ON COLUMN employees.birth_date IS 'Fecha de nacimiento para alertas de cumpleaños';
  END IF;
END $$;

-- Crear índice para mejorar rendimiento de consultas de cumpleaños
CREATE INDEX IF NOT EXISTS idx_employees_birth_date ON employees(birth_date) WHERE birth_date IS NOT NULL;
