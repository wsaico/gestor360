-- =====================================================
-- Fix: Agregar columnas faltantes en tabla menus
-- =====================================================

-- Verificar columnas actuales
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'menus'
ORDER BY ordinal_position;

-- Agregar description si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'menus' AND column_name = 'description'
  ) THEN
    ALTER TABLE menus ADD COLUMN description TEXT;
  END IF;
END $$;

-- Agregar meal_type si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'menus' AND column_name = 'meal_type'
  ) THEN
    ALTER TABLE menus ADD COLUMN meal_type VARCHAR(50) DEFAULT 'ALMUERZO';
  END IF;
END $$;

-- Verificar nuevamente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'menus'
ORDER BY ordinal_position;
