-- =====================================================
-- SCRIPT DE DIAGNÓSTICO COMPLETO DE LA BASE DE DATOS
-- =====================================================
-- Ejecuta este script para entender EXACTAMENTE cómo está
-- construida tu base de datos en este momento
-- =====================================================

\echo '=================================================='
\echo '1. TABLAS EXISTENTES EN EL SCHEMA PUBLIC'
\echo '=================================================='

SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

\echo ''
\echo '=================================================='
\echo '2. ESTRUCTURA DE CADA TABLA (COLUMNAS Y TIPOS)'
\echo '=================================================='

SELECT 
    table_name,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

\echo ''
\echo '=================================================='
\echo '3. RELACIONES (FOREIGN KEYS)'
\echo '=================================================='

SELECT
    tc.table_name AS tabla_origen,
    kcu.column_name AS columna_origen,
    ccu.table_name AS tabla_referenciada,
    ccu.column_name AS columna_referenciada,
    tc.constraint_name AS nombre_constraint
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

\echo ''
\echo '=================================================='
\echo '4. ÍNDICES CREADOS'
\echo '=================================================='

SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

\echo ''
\echo '=================================================='
\echo '5. POLÍTICAS RLS ACTIVAS'
\echo '=================================================='

SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

\echo ''
\echo '=================================================='
\echo '6. TABLAS CON RLS HABILITADO'
\echo '=================================================='

SELECT
    n.nspname AS schema,
    c.relname AS tabla,
    c.relrowsecurity AS rls_enabled,
    c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity = true
ORDER BY c.relname;

\echo ''
\echo '=================================================='
\echo '7. FUNCIONES PERSONALIZADAS (HELPERS RLS)'
\echo '=================================================='

SELECT
    n.nspname AS schema,
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname IN (
        'is_global_admin',
        'is_super_admin',
        'get_user_station',
        'get_user_role',
        'get_employee_by_dni_public',
        'get_transport_schedules',
        'calculate_transport_cost'
    )
ORDER BY p.proname;

\echo ''
\echo '=================================================='
\echo '8. TRIGGERS ACTIVOS'
\echo '=================================================='

SELECT
    event_object_table AS tabla,
    trigger_name,
    event_manipulation AS evento,
    action_statement AS accion,
    action_timing AS timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

\echo ''
\echo '=================================================='
\echo '9. ENUMS (TIPOS PERSONALIZADOS)'
\echo '=================================================='

SELECT
    n.nspname AS schema,
    t.typname AS enum_name,
    e.enumlabel AS valor
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY t.typname, e.enumsortorder;

\echo ''
\echo '=================================================='
\echo '10. CONTEO DE REGISTROS POR TABLA'
\echo '=================================================='

DO $$
DECLARE
    tabla RECORD;
    conteo INTEGER;
BEGIN
    FOR tabla IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM public.%I', tabla.tablename) INTO conteo;
        RAISE NOTICE '% : % registros', tabla.tablename, conteo;
    END LOOP;
END $$;

\echo ''
\echo '=================================================='
\echo '11. ROLES DE USUARIO EN SYSTEM_USERS'
\echo '=================================================='

SELECT 
    role,
    COUNT(*) AS cantidad,
    COUNT(CASE WHEN station_id IS NULL THEN 1 END) AS sin_estacion,
    COUNT(CASE WHEN station_id IS NOT NULL THEN 1 END) AS con_estacion
FROM public.system_users
GROUP BY role
ORDER BY role;

\echo ''
\echo '=================================================='
\echo '12. ESTACIONES REGISTRADAS'
\echo '=================================================='

SELECT 
    id,
    code,
    name,
    location,
    created_at
FROM public.stations
ORDER BY code;

\echo ''
\echo '=================================================='
\echo '13. ANÁLISIS DE POLÍTICAS RLS POR TABLA CRÍTICA'
\echo '=================================================='

\echo '--- EMPLOYEES ---'
SELECT 
    policyname,
    cmd AS comando,
    CASE 
        WHEN qual IS NOT NULL THEN 'USING: ' || qual
        ELSE 'Sin USING'
    END AS condicion_using,
    CASE 
        WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check
        ELSE 'Sin WITH CHECK'
    END AS condicion_check
FROM pg_policies
WHERE tablename = 'employees'
ORDER BY policyname;

\echo ''
\echo '--- FOOD_ORDERS ---'
SELECT 
    policyname,
    cmd AS comando,
    CASE 
        WHEN qual IS NOT NULL THEN 'USING: ' || qual
        ELSE 'Sin USING'
    END AS condicion_using,
    CASE 
        WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check
        ELSE 'Sin WITH CHECK'
    END AS condicion_check
FROM pg_policies
WHERE tablename = 'food_orders'
ORDER BY policyname;

\echo ''
\echo '--- TRANSPORT_SCHEDULES ---'
SELECT 
    policyname,
    cmd AS comando,
    CASE 
        WHEN qual IS NOT NULL THEN 'USING: ' || qual
        ELSE 'Sin USING'
    END AS condicion_using,
    CASE 
        WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check
        ELSE 'Sin WITH CHECK'
    END AS condicion_check
FROM pg_policies
WHERE tablename = 'transport_schedules'
ORDER BY policyname;

\echo ''
\echo '=================================================='
\echo '14. VERIFICAR FUNCIONES HELPER RLS'
\echo '=================================================='

\echo '--- Probando is_global_admin() ---'
-- Esta función requiere un usuario autenticado, así que solo mostramos la definición
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'is_global_admin' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

\echo ''
\echo '--- Probando get_user_station() ---'
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'get_user_station' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

\echo ''
\echo '=================================================='
\echo '15. CONSTRAINTS Y UNIQUE KEYS'
\echo '=================================================='

SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
    AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
ORDER BY tc.table_name, tc.constraint_type, kcu.column_name;

\echo ''
\echo '=================================================='
\echo '16. TABLAS SIN RLS (POTENCIAL RIESGO)'
\echo '=================================================='

SELECT
    c.relname AS tabla,
    'RLS DESHABILITADO' AS estado
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity = false
ORDER BY c.relname;

\echo ''
\echo '=================================================='
\echo '17. RESUMEN EJECUTIVO'
\echo '=================================================='

DO $$
DECLARE
    total_tablas INTEGER;
    tablas_con_rls INTEGER;
    total_policies INTEGER;
    total_funciones INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_tablas FROM pg_tables WHERE schemaname = 'public';
    SELECT COUNT(*) INTO tablas_con_rls FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = true;
    SELECT COUNT(*) INTO total_policies FROM pg_policies WHERE schemaname = 'public';
    SELECT COUNT(*) INTO total_funciones FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RESUMEN DE LA BASE DE DATOS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total de tablas: %', total_tablas;
    RAISE NOTICE 'Tablas con RLS habilitado: %', tablas_con_rls;
    RAISE NOTICE 'Total de políticas RLS: %', total_policies;
    RAISE NOTICE 'Total de funciones personalizadas: %', total_funciones;
    RAISE NOTICE '========================================';
END $$;

\echo ''
\echo '=================================================='
\echo 'DIAGNÓSTICO COMPLETADO'
\echo '=================================================='
