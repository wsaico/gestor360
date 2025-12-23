-- =====================================================
-- SCRIPT SIMPLIFICADO PARA SUPABASE STUDIO
-- =====================================================
-- Copia y pega cada sección en el SQL Editor de Supabase
-- =====================================================

-- =====================================================
-- SECCIÓN 1: LISTA DE TODAS LAS TABLAS
-- =====================================================
SELECT 
    tablename AS tabla,
    CASE 
        WHEN tablename IN (
            SELECT tablename FROM pg_tables t
            JOIN pg_class c ON c.relname = t.tablename
            WHERE c.relrowsecurity = true AND t.schemaname = 'public'
        ) THEN '✅ RLS Habilitado'
        ELSE '❌ RLS Deshabilitado'
    END AS estado_rls
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;


-- =====================================================
-- SECCIÓN 2: ESTRUCTURA DE TABLAS PRINCIPALES
-- =====================================================

-- EMPLOYEES
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'employees'
ORDER BY ordinal_position;

-- SYSTEM_USERS
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'system_users'
ORDER BY ordinal_position;

-- FOOD_ORDERS
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'food_orders'
ORDER BY ordinal_position;

-- TRANSPORT_SCHEDULES
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'transport_schedules'
ORDER BY ordinal_position;


-- =====================================================
-- SECCIÓN 3: POLÍTICAS RLS ACTIVAS
-- =====================================================

-- Ver TODAS las políticas
SELECT
    tablename AS tabla,
    policyname AS politica,
    cmd AS comando,
    roles AS roles_aplicables,
    LEFT(qual::text, 100) AS condicion_using,
    LEFT(with_check::text, 100) AS condicion_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;


-- =====================================================
-- SECCIÓN 4: FUNCIONES HELPER RLS
-- =====================================================

-- Ver definición de is_global_admin
SELECT pg_get_functiondef(oid) AS definicion
FROM pg_proc 
WHERE proname = 'is_global_admin' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Ver definición de get_user_station
SELECT pg_get_functiondef(oid) AS definicion
FROM pg_proc 
WHERE proname = 'get_user_station' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Ver definición de get_user_role
SELECT pg_get_functiondef(oid) AS definicion
FROM pg_proc 
WHERE proname = 'get_user_role' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');


-- =====================================================
-- SECCIÓN 5: ANÁLISIS DE DATOS
-- =====================================================

-- Conteo de usuarios por rol
SELECT 
    role AS rol,
    COUNT(*) AS total,
    COUNT(CASE WHEN station_id IS NULL THEN 1 END) AS global_admins,
    COUNT(CASE WHEN station_id IS NOT NULL THEN 1 END) AS station_users
FROM public.system_users
GROUP BY role
ORDER BY role;

-- Estaciones registradas
SELECT 
    code AS codigo,
    name AS nombre,
    location AS ubicacion,
    (SELECT COUNT(*) FROM employees WHERE station_id = stations.id) AS empleados,
    (SELECT COUNT(*) FROM system_users WHERE station_id = stations.id) AS usuarios
FROM public.stations
ORDER BY code;

-- Empleados por estación
SELECT 
    s.code AS estacion,
    COUNT(e.id) AS total_empleados,
    COUNT(CASE WHEN e.status = 'ACTIVO' THEN 1 END) AS activos,
    COUNT(CASE WHEN e.status = 'CESADO' THEN 1 END) AS cesados
FROM public.stations s
LEFT JOIN public.employees e ON e.station_id = s.id
GROUP BY s.id, s.code
ORDER BY s.code;


-- =====================================================
-- SECCIÓN 6: RELACIONES (FOREIGN KEYS)
-- =====================================================

SELECT
    tc.table_name AS tabla,
    kcu.column_name AS columna,
    ccu.table_name AS referencia_tabla,
    ccu.column_name AS referencia_columna
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;


-- =====================================================
-- SECCIÓN 7: VERIFICAR TU USUARIO ACTUAL
-- =====================================================

-- Ver tu información de usuario (requiere estar autenticado)
SELECT 
    id,
    role,
    station_id,
    username,
    email
FROM public.system_users
WHERE id = auth.uid();

-- Probar funciones RLS con tu usuario
SELECT 
    auth.uid() AS mi_user_id,
    (SELECT role FROM system_users WHERE id = auth.uid()) AS mi_rol,
    (SELECT station_id FROM system_users WHERE id = auth.uid()) AS mi_estacion,
    public.is_global_admin() AS soy_global_admin,
    public.get_user_station() AS mi_estacion_segun_rls,
    public.get_user_role() AS mi_rol_segun_rls;


-- =====================================================
-- SECCIÓN 8: TABLAS DEL MÓDULO TRANSPORT
-- =====================================================

SELECT 
    'transport_routes' AS tabla,
    COUNT(*) AS registros
FROM public.transport_routes
UNION ALL
SELECT 
    'transport_schedules',
    COUNT(*)
FROM public.transport_schedules
UNION ALL
SELECT 
    'transport_execution',
    COUNT(*)
FROM public.transport_execution
UNION ALL
SELECT 
    'transport_drivers',
    COUNT(*)
FROM public.transport_drivers
UNION ALL
SELECT 
    'transport_vehicles',
    COUNT(*)
FROM public.transport_vehicles;


-- =====================================================
-- SECCIÓN 9: POLÍTICAS RLS ESPECÍFICAS POR TABLA
-- =====================================================

-- Políticas de EMPLOYEES
SELECT
    policyname,
    cmd,
    qual::text AS using_clause,
    with_check::text AS check_clause
FROM pg_policies
WHERE tablename = 'employees'
ORDER BY policyname;

-- Políticas de FOOD_ORDERS
SELECT
    policyname,
    cmd,
    qual::text AS using_clause,
    with_check::text AS check_clause
FROM pg_policies
WHERE tablename = 'food_orders'
ORDER BY policyname;

-- Políticas de TRANSPORT_SCHEDULES
SELECT
    policyname,
    cmd,
    qual::text AS using_clause,
    with_check::text AS check_clause
FROM pg_policies
WHERE tablename = 'transport_schedules'
ORDER BY policyname;


-- =====================================================
-- SECCIÓN 10: RESUMEN EJECUTIVO
-- =====================================================

SELECT 
    'Total Tablas' AS metrica,
    COUNT(*)::text AS valor
FROM pg_tables 
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Tablas con RLS',
    COUNT(*)::text
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
    AND c.relkind = 'r' 
    AND c.relrowsecurity = true

UNION ALL

SELECT 
    'Total Políticas RLS',
    COUNT(*)::text
FROM pg_policies 
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Total Usuarios',
    COUNT(*)::text
FROM public.system_users

UNION ALL

SELECT 
    'Total Empleados',
    COUNT(*)::text
FROM public.employees

UNION ALL

SELECT 
    'Total Estaciones',
    COUNT(*)::text
FROM public.stations;
