-- Verificar que todas las tablas del módulo de alimentación existen
SELECT table_name, 
       (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('role_pricing_config', 'menus', 'food_orders')
ORDER BY table_name;

-- Verificar columnas de food_orders
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'food_orders'
ORDER BY ordinal_position;

-- Verificar columnas de menus
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'menus'
ORDER BY ordinal_position;

-- Verificar columnas de role_pricing_config
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'role_pricing_config'
ORDER BY ordinal_position;
