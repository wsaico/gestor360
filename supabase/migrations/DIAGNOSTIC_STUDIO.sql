-- =====================================================
-- DIAGNÓSTICO RÁPIDO - SUPABASE STUDIO
-- =====================================================
-- Ejecuta cada query por separado en Supabase Studio
-- =====================================================


-- =====================================================
-- 1. LISTA DE TODAS LAS TABLAS CON RLS
-- =====================================================
SELECT 
    t.tablename AS "📋 Tabla",
    CASE 
        WHEN c.relrowsecurity THEN '✅ Habilitado'
        ELSE '❌ Deshabilitado'
    END AS "🔒 RLS",
    (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.tablename) AS "📜 Políticas"
FROM pg_tables t
LEFT JOIN pg_class c ON c.relname = t.tablename
WHERE t.schemaname = 'public'
ORDER BY t.tablename;


-- =====================================================
-- 2. TU USUARIO ACTUAL (MUY IMPORTANTE)
-- =====================================================
SELECT 
    id AS "🆔 User ID",
    username AS "👤 Usuario",
    email AS "📧 Email",
    role AS "🎭 Rol",
    station_id AS "🏢 Estación ID",
    (SELECT name FROM stations WHERE id = system_users.station_id) AS "🏢 Estación Nombre",
    CASE 
        WHEN station_id IS NULL AND role = 'ADMIN' THEN '🌍 GLOBAL ADMIN'
        WHEN role = 'SUPERADMIN' THEN '⭐ SUPER ADMIN'
        WHEN station_id IS NOT NULL THEN '📍 STATION USER'
        ELSE '👤 USER'
    END AS "🔑 Tipo de Acceso"
FROM public.system_users
WHERE id = auth.uid();


-- =====================================================
-- 3. PROBAR FUNCIONES RLS CON TU USUARIO
-- =====================================================
SELECT 
    auth.uid() AS "🆔 Mi User ID",
    public.is_global_admin() AS "🌍 ¿Soy Global Admin?",
    public.get_user_station() AS "🏢 Mi Estación (según RLS)",
    public.get_user_role() AS "🎭 Mi Rol (según RLS)",
    (SELECT station_id FROM system_users WHERE id = auth.uid()) AS "🏢 Mi Estación (según BD)",
    (SELECT role FROM system_users WHERE id = auth.uid()) AS "🎭 Mi Rol (según BD)";


-- =====================================================
-- 4. TODAS LAS ESTACIONES
-- =====================================================
SELECT 
    code AS "🏷️ Código",
    name AS "🏢 Nombre",
    location AS "📍 Ubicación",
    (SELECT COUNT(*) FROM employees WHERE station_id = stations.id) AS "👥 Empleados",
    (SELECT COUNT(*) FROM system_users WHERE station_id = stations.id) AS "👤 Usuarios",
    (SELECT COUNT(*) FROM food_orders WHERE station_id = stations.id) AS "🍽️ Órdenes"
FROM public.stations
ORDER BY code;


-- =====================================================
-- 5. USUARIOS POR ROL
-- =====================================================
SELECT 
    role AS "🎭 Rol",
    COUNT(*) AS "📊 Total",
    COUNT(CASE WHEN station_id IS NULL THEN 1 END) AS "🌍 Global",
    COUNT(CASE WHEN station_id IS NOT NULL THEN 1 END) AS "📍 Con Estación"
FROM public.system_users
GROUP BY role
ORDER BY role;


-- =====================================================
-- 6. POLÍTICAS RLS DE EMPLOYEES
-- =====================================================
SELECT
    policyname AS "📜 Política",
    cmd AS "🔧 Comando",
    roles AS "👥 Roles",
    SUBSTRING(qual::text, 1, 80) AS "✅ USING (primeros 80 chars)",
    SUBSTRING(with_check::text, 1, 80) AS "✔️ WITH CHECK (primeros 80 chars)"
FROM pg_policies
WHERE tablename = 'employees'
ORDER BY policyname;


-- =====================================================
-- 7. POLÍTICAS RLS DE FOOD_ORDERS
-- =====================================================
SELECT
    policyname AS "📜 Política",
    cmd AS "🔧 Comando",
    roles AS "👥 Roles",
    SUBSTRING(qual::text, 1, 80) AS "✅ USING (primeros 80 chars)",
    SUBSTRING(with_check::text, 1, 80) AS "✔️ WITH CHECK (primeros 80 chars)"
FROM pg_policies
WHERE tablename = 'food_orders'
ORDER BY policyname;


-- =====================================================
-- 8. POLÍTICAS RLS DE TRANSPORT_SCHEDULES
-- =====================================================
SELECT
    policyname AS "📜 Política",
    cmd AS "🔧 Comando",
    roles AS "👥 Roles",
    SUBSTRING(qual::text, 1, 80) AS "✅ USING (primeros 80 chars)",
    SUBSTRING(with_check::text, 1, 80) AS "✔️ WITH CHECK (primeros 80 chars)"
FROM pg_policies
WHERE tablename = 'transport_schedules'
ORDER BY policyname;


-- =====================================================
-- 9. DEFINICIÓN DE is_global_admin()
-- =====================================================
SELECT pg_get_functiondef(oid) AS "📝 Definición Completa"
FROM pg_proc 
WHERE proname = 'is_global_admin' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');


-- =====================================================
-- 10. DEFINICIÓN DE get_user_station()
-- =====================================================
SELECT pg_get_functiondef(oid) AS "📝 Definición Completa"
FROM pg_proc 
WHERE proname = 'get_user_station' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');


-- =====================================================
-- 11. ESTRUCTURA DE EMPLOYEES
-- =====================================================
SELECT 
    column_name AS "📋 Columna",
    data_type AS "🔤 Tipo",
    is_nullable AS "❓ Nullable",
    column_default AS "⚙️ Default"
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'employees'
ORDER BY ordinal_position;


-- =====================================================
-- 12. ESTRUCTURA DE SYSTEM_USERS
-- =====================================================
SELECT 
    column_name AS "📋 Columna",
    data_type AS "🔤 Tipo",
    is_nullable AS "❓ Nullable",
    column_default AS "⚙️ Default"
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'system_users'
ORDER BY ordinal_position;


-- =====================================================
-- 13. ESTRUCTURA DE FOOD_ORDERS
-- =====================================================
SELECT 
    column_name AS "📋 Columna",
    data_type AS "🔤 Tipo",
    is_nullable AS "❓ Nullable",
    column_default AS "⚙️ Default"
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'food_orders'
ORDER BY ordinal_position;


-- =====================================================
-- 14. ESTRUCTURA DE TRANSPORT_SCHEDULES
-- =====================================================
SELECT 
    column_name AS "📋 Columna",
    data_type AS "🔤 Tipo",
    is_nullable AS "❓ Nullable",
    column_default AS "⚙️ Default"
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'transport_schedules'
ORDER BY ordinal_position;


-- =====================================================
-- 15. FOREIGN KEYS (RELACIONES)
-- =====================================================
SELECT
    tc.table_name AS "📋 Tabla Origen",
    kcu.column_name AS "🔗 Columna",
    ccu.table_name AS "📋 Tabla Referenciada",
    ccu.column_name AS "🔗 Columna Referenciada"
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;


-- =====================================================
-- 16. CONTEO DE REGISTROS POR TABLA
-- =====================================================
SELECT 
    'stations' AS "📋 Tabla",
    COUNT(*)::text AS "📊 Registros"
FROM public.stations
UNION ALL
SELECT 'system_users', COUNT(*)::text FROM public.system_users
UNION ALL
SELECT 'employees', COUNT(*)::text FROM public.employees
UNION ALL
SELECT 'job_roles', COUNT(*)::text FROM public.job_roles
UNION ALL
SELECT 'areas', COUNT(*)::text FROM public.areas
UNION ALL
SELECT 'menus', COUNT(*)::text FROM public.menus
UNION ALL
SELECT 'food_orders', COUNT(*)::text FROM public.food_orders
UNION ALL
SELECT 'role_pricing_config', COUNT(*)::text FROM public.role_pricing_config
UNION ALL
SELECT 'epp_inventory', COUNT(*)::text FROM public.epp_inventory
UNION ALL
SELECT 'deliveries', COUNT(*)::text FROM public.deliveries
UNION ALL
SELECT 'assets', COUNT(*)::text FROM public.assets
UNION ALL
SELECT 'transport_routes', COUNT(*)::text FROM public.transport_routes
UNION ALL
SELECT 'transport_schedules', COUNT(*)::text FROM public.transport_schedules
UNION ALL
SELECT 'transport_execution', COUNT(*)::text FROM public.transport_execution
UNION ALL
SELECT 'transport_drivers', COUNT(*)::text FROM public.transport_drivers
UNION ALL
SELECT 'transport_vehicles', COUNT(*)::text FROM public.transport_vehicles
ORDER BY "📋 Tabla";


-- =====================================================
-- 17. EMPLEADOS POR ESTACIÓN
-- =====================================================
SELECT 
    s.code AS "🏷️ Estación",
    COUNT(e.id) AS "📊 Total",
    COUNT(CASE WHEN e.status = 'ACTIVO' THEN 1 END) AS "✅ Activos",
    COUNT(CASE WHEN e.status = 'CESADO' THEN 1 END) AS "❌ Cesados"
FROM public.stations s
LEFT JOIN public.employees e ON e.station_id = s.id
GROUP BY s.id, s.code
ORDER BY s.code;


-- =====================================================
-- 18. RESUMEN EJECUTIVO
-- =====================================================
SELECT 
    '📊 Total Tablas' AS "Métrica",
    (SELECT COUNT(*)::text FROM pg_tables WHERE schemaname = 'public') AS "Valor"
UNION ALL
SELECT 
    '🔒 Tablas con RLS',
    (SELECT COUNT(*)::text FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = true)
UNION ALL
SELECT 
    '📜 Total Políticas RLS',
    (SELECT COUNT(*)::text FROM pg_policies WHERE schemaname = 'public')
UNION ALL
SELECT 
    '👥 Total Usuarios',
    (SELECT COUNT(*)::text FROM public.system_users)
UNION ALL
SELECT 
    '👤 Total Empleados',
    (SELECT COUNT(*)::text FROM public.employees)
UNION ALL
SELECT 
    '🏢 Total Estaciones',
    (SELECT COUNT(*)::text FROM public.stations)
UNION ALL
SELECT 
    '🍽️ Total Órdenes',
    (SELECT COUNT(*)::text FROM public.food_orders)
UNION ALL
SELECT 
    '🚗 Total Schedules',
    (SELECT COUNT(*)::text FROM public.transport_schedules);


-- =====================================================
-- 19. TABLAS SIN RLS (RIESGO DE SEGURIDAD)
-- =====================================================
SELECT
    c.relname AS "⚠️ Tabla sin RLS"
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity = false
ORDER BY c.relname;


-- =====================================================
-- 20. TODAS LAS FUNCIONES PERSONALIZADAS
-- =====================================================
SELECT
    p.proname AS "🔧 Función",
    pg_get_function_arguments(p.oid) AS "📥 Argumentos",
    pg_get_function_result(p.oid) AS "📤 Retorna"
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.prokind = 'f'
ORDER BY p.proname;
