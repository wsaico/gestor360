-- =====================================================
-- Fix: Agregar columna is_active faltante en menus
-- =====================================================

-- Agregar is_active a menus si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'menus' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE menus ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- Verificar
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'menus'
ORDER BY ordinal_position;
