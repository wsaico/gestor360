-- =====================================================
-- Refrescar caché de esquema en Supabase
-- =====================================================

-- Opción 1: Notificar a PostgREST para refrescar el schema cache
NOTIFY pgrst, 'reload schema';

-- Opción 2: Si la opción 1 no funciona, verifica que las columnas existan
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'menus'
ORDER BY ordinal_position;

-- Prueba de inserción manual para verificar
-- Descomenta las siguientes líneas para probar:
/*
INSERT INTO menus (
  station_id,
  provider_id,
  serve_date,
  meal_type,
  options,
  description,
  is_active
) VALUES (
  (SELECT id FROM stations LIMIT 1),
  (SELECT id FROM system_users WHERE role_name = 'PROVIDER' LIMIT 1),
  CURRENT_DATE,
  'ALMUERZO',
  '["Opción 1", "Opción 2"]'::jsonb,
  'Menú de prueba',
  true
)
RETURNING *;
*/
