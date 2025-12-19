-- =====================================================
-- Script de corrección: Agregar columna menu_id a food_orders
-- =====================================================
-- Este script es para ejecutar DESPUÉS del script principal
-- si la columna menu_id no se creó correctamente

-- Agregar columna menu_id si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'food_orders' AND column_name = 'menu_id'
  ) THEN
    ALTER TABLE food_orders ADD COLUMN menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- Crear índice para menu_id
CREATE INDEX IF NOT EXISTS idx_food_orders_menu ON food_orders(menu_id);

-- Verificar
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'food_orders'
ORDER BY ordinal_position;
