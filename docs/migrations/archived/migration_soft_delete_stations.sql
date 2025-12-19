-- =====================================================
-- Migración: Soft Delete para Estaciones
-- =====================================================
-- Permite archivar estaciones en lugar de eliminarlas físicamente

-- 1. Agregar campo is_active a stations si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stations' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE stations ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- 2. Establecer todas las estaciones existentes como activas
UPDATE stations SET is_active = TRUE WHERE is_active IS NULL;

-- 3. Crear índice para mejorar performance en consultas
CREATE INDEX IF NOT EXISTS idx_stations_is_active ON stations(is_active);

-- 4. Verificar el cambio
SELECT id, code, name, is_active, created_at
FROM stations
ORDER BY is_active DESC, name;
