-- =====================================================
-- DIAGNÓSTICO INTELIGENTE - DETECTA TABLAS EXISTENTES
-- =====================================================
-- Ejecuta cada query por separado
-- =====================================================


-- =====================================================
-- 1. LISTA DE TODAS LAS TABLAS (LO QUE REALMENTE EXISTE)
-- =====================================================
SELECT 
    t.tablename AS "📋 Tabla",
    CASE 
        WHEN c.relrowsecurity THEN '✅ RLS Habilitado'
        ELSE '❌ RLS Deshabilitado'
    END AS "🔒 Estado RLS",
    (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.tablename) AS "📜 # Políticas",
    pg_size_pretty(pg_total_relation_size(quote_ident(t.tablename)::regclass)) AS "💾 Tamaño"
FROM pg_tables t
LEFT JOIN pg_class c ON c.relname = t.tablename
WHERE t.schemaname = 'public'
ORDER BY t.tablename;


-- =====================================================
-- 2. TU USUARIO ACTUAL ⭐ EJECUTA ESTO PRIMERO
-- =====================================================
SELECT 
    id AS "🆔 User ID",
    username AS "👤 Usuario",
    email AS "📧 Email",
    role AS "🎭 Rol",
    station_id AS "🏢 Estación ID",
    (SELECT name FROM stations WHERE id = system_users.station_id) AS "🏢 Estación",
    CASE 
        WHEN station_id IS NULL AND role = 'ADMIN' THEN '🌍 GLOBAL ADMIN'
        WHEN role = 'SUPERADMIN' THEN '⭐ SUPER ADMIN'
        WHEN station_id IS NOT NULL THEN '📍 STATION USER'
        ELSE '👤 USER'
    END AS "🔑 Tipo"
FROM public.system_users
WHERE id = auth.uid();


-- =====================================================
-- 3. PRUEBA DE FUNCIONES RLS ⭐ MUY IMPORTANTE
-- =====================================================
SELECT 
    auth.uid() AS "🆔 Mi ID",
    public.is_global_admin() AS "🌍 ¿Global Admin?",
    public.get_user_station() AS "🏢 Estación (RLS)",
    public.get_user_role() AS "🎭 Rol (RLS)",
    (SELECT station_id FROM system_users WHERE id = auth.uid()) AS "🏢 Estación (BD)",
    (SELECT role FROM system_users WHERE id = auth.uid()) AS "🎭 Rol (BD)",
    CASE 
        WHEN public.get_user_station() IS NULL THEN '⚠️ RLS ve NULL - Acceso Global'
        ELSE '✅ RLS ve estación específica'
    END AS "📊 Diagnóstico"
FROM system_users 
WHERE id = auth.uid();


-- =====================================================
-- 4. TODAS LAS ESTACIONES
-- =====================================================
SELECT 
    id AS "🆔 ID",
    code AS "🏷️ Código",
    name AS "🏢 Nombre",
    location AS "📍 Ubicación",
    created_at AS "📅 Creada"
FROM public.stations
ORDER BY code;


-- =====================================================
-- 5. USUARIOS POR ROL Y ESTACIÓN
-- =====================================================
SELECT 
    role AS "🎭 Rol",
    COUNT(*) AS "📊 Total",
    COUNT(CASE WHEN station_id IS NULL THEN 1 END) AS "🌍 Global",
    COUNT(CASE WHEN station_id IS NOT NULL THEN 1 END) AS "📍 Con Estación",
    string_agg(DISTINCT username, ', ') AS "👥 Usuarios"
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
    LEFT(qual::text, 100) AS "✅ USING",
    LEFT(with_check::text, 100) AS "✔️ CHECK"
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
    LEFT(qual::text, 100) AS "✅ USING",
    LEFT(with_check::text, 100) AS "✔️ CHECK"
FROM pg_policies
WHERE tablename = 'food_orders'
ORDER BY policyname;


-- =====================================================
-- 8. POLÍTICAS RLS DE SYSTEM_USERS
-- =====================================================
SELECT
    policyname AS "📜 Política",
    cmd AS "🔧 Comando",
    roles AS "👥 Roles",
    LEFT(qual::text, 100) AS "✅ USING",
    LEFT(with_check::text, 100) AS "✔️ CHECK"
FROM pg_policies
WHERE tablename = 'system_users'
ORDER BY policyname;


-- =====================================================
-- 9. DEFINICIÓN COMPLETA: is_global_admin()
-- =====================================================
SELECT pg_get_functiondef(oid) AS "📝 Código Fuente"
FROM pg_proc 
WHERE proname = 'is_global_admin' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');


-- =====================================================
-- 10. DEFINICIÓN COMPLETA: get_user_station()
-- =====================================================
SELECT pg_get_functiondef(oid) AS "📝 Código Fuente"
FROM pg_proc 
WHERE proname = 'get_user_station' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');


-- =====================================================
-- 11. ESTRUCTURA DE EMPLOYEES
-- =====================================================
SELECT 
    ordinal_position AS "#",
    column_name AS "📋 Columna",
    data_type AS "🔤 Tipo",
    is_nullable AS "❓ Null",
    column_default AS "⚙️ Default"
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'employees'
ORDER BY ordinal_position;


-- =====================================================
-- 12. ESTRUCTURA DE SYSTEM_USERS
-- =====================================================
SELECT 
    ordinal_position AS "#",
    column_name AS "📋 Columna",
    data_type AS "🔤 Tipo",
    is_nullable AS "❓ Null",
    column_default AS "⚙️ Default"
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'system_users'
ORDER BY ordinal_position;


-- =====================================================
-- 13. FOREIGN KEYS (RELACIONES ENTRE TABLAS)
-- =====================================================
SELECT
    tc.table_name AS "📋 Tabla",
    kcu.column_name AS "🔗 Columna",
    ccu.table_name AS "➡️ Referencia",
    ccu.column_name AS "🔗 Columna Ref"
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;


-- =====================================================
-- 14. EMPLEADOS POR ESTACIÓN
-- =====================================================
SELECT 
    s.code AS "🏷️ Estación",
    s.name AS "🏢 Nombre",
    COUNT(e.id) AS "📊 Total",
    COUNT(CASE WHEN e.status = 'ACTIVO' THEN 1 END) AS "✅ Activos",
    COUNT(CASE WHEN e.status = 'CESADO' THEN 1 END) AS "❌ Cesados"
FROM public.stations s
LEFT JOIN public.employees e ON e.station_id = s.id
GROUP BY s.id, s.code, s.name
ORDER BY s.code;


-- =====================================================
-- 15. TODAS LAS FUNCIONES PERSONALIZADAS
-- =====================================================
SELECT
    p.proname AS "🔧 Función",
    pg_get_function_arguments(p.oid) AS "📥 Argumentos",
    pg_get_function_result(p.oid) AS "📤 Retorna",
    CASE p.provolatile
        WHEN 'i' THEN 'IMMUTABLE'
        WHEN 's' THEN 'STABLE'
        WHEN 'v' THEN 'VOLATILE'
    END AS "⚡ Volatilidad",
    CASE p.prosecdef
        WHEN true THEN '🔒 SECURITY DEFINER'
        ELSE '🔓 SECURITY INVOKER'
    END AS "🔐 Seguridad"
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.prokind = 'f'
ORDER BY p.proname;


-- =====================================================
-- 16. TABLAS SIN RLS ⚠️ RIESGO DE SEGURIDAD
-- =====================================================
SELECT
    c.relname AS "⚠️ Tabla SIN RLS",
    pg_size_pretty(pg_total_relation_size(c.oid)) AS "💾 Tamaño",
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = c.relname AND table_schema = 'public') AS "📋 Columnas"
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity = false
ORDER BY c.relname;


-- =====================================================
-- 17. ÍNDICES IMPORTANTES
-- =====================================================
SELECT
    tablename AS "📋 Tabla",
    indexname AS "🔍 Índice",
    LEFT(indexdef, 100) AS "📝 Definición"
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname NOT LIKE '%pkey'
ORDER BY tablename, indexname;


-- =====================================================
-- 18. TRIGGERS ACTIVOS
-- =====================================================
SELECT
    event_object_table AS "📋 Tabla",
    trigger_name AS "⚡ Trigger",
    event_manipulation AS "🎯 Evento",
    action_timing AS "⏱️ Timing"
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;


-- =====================================================
-- 19. RESUMEN EJECUTIVO
-- =====================================================
WITH stats AS (
    SELECT 
        (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') AS total_tablas,
        (SELECT COUNT(*) FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = true) AS tablas_rls,
        (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') AS total_policies,
        (SELECT COUNT(*) FROM public.system_users) AS total_usuarios,
        (SELECT COUNT(*) FROM public.employees) AS total_empleados,
        (SELECT COUNT(*) FROM public.stations) AS total_estaciones
)
SELECT 
    '📊 Total Tablas' AS "Métrica",
    total_tablas::text AS "Valor"
FROM stats
UNION ALL
SELECT '🔒 Tablas con RLS', tablas_rls::text FROM stats
UNION ALL
SELECT '📜 Total Políticas RLS', total_policies::text FROM stats
UNION ALL
SELECT '👥 Total Usuarios', total_usuarios::text FROM stats
UNION ALL
SELECT '👤 Total Empleados', total_empleados::text FROM stats
UNION ALL
SELECT '🏢 Total Estaciones', total_estaciones::text FROM stats
UNION ALL
SELECT 
    '🌍 Global Admins',
    (SELECT COUNT(*)::text FROM system_users WHERE role IN ('SUPERADMIN', 'ADMIN') AND station_id IS NULL)
UNION ALL
SELECT 
    '📍 Station Users',
    (SELECT COUNT(*)::text FROM system_users WHERE station_id IS NOT NULL);


-- =====================================================
-- 20. DIAGNÓSTICO DEL PROBLEMA ACTUAL
-- =====================================================
WITH mi_info AS (
    SELECT 
        id,
        role,
        station_id,
        username
    FROM system_users 
    WHERE id = auth.uid()
)
SELECT 
    '🔍 DIAGNÓSTICO DEL PROBLEMA' AS "Análisis",
    CASE 
        WHEN mi_info.role IN ('SUPERADMIN', 'ADMIN') AND mi_info.station_id IS NULL THEN
            '✅ Eres Global Admin. Deberías poder ver TODAS las estaciones.'
        WHEN mi_info.role = 'ADMIN' AND mi_info.station_id IS NOT NULL THEN
            '📍 Eres Station Admin. Solo puedes ver tu estación: ' || 
            (SELECT code FROM stations WHERE id = mi_info.station_id)
        ELSE
            '👤 Usuario regular. Acceso limitado a tu estación.'
    END AS "Estado Actual",
    CASE 
        WHEN public.get_user_station() IS NULL AND mi_info.station_id IS NULL THEN
            '✅ RLS correcto: get_user_station() retorna NULL (acceso global)'
        WHEN public.get_user_station() = mi_info.station_id THEN
            '✅ RLS correcto: get_user_station() retorna tu estación'
        ELSE
            '⚠️ RLS inconsistente: Revisar configuración'
    END AS "Estado RLS",
    CASE 
        WHEN mi_info.role IN ('SUPERADMIN', 'ADMIN') AND mi_info.station_id IS NULL THEN
            '💡 Si seleccionas una estación en el header, el filtro debe hacerse en la APLICACIÓN, no en RLS. RLS siempre te dará acceso total.'
        ELSE
            '💡 Tu acceso está limitado por RLS a tu estación asignada.'
    END AS "Recomendación"
FROM mi_info;
