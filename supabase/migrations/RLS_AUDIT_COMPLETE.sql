-- =====================================================
-- RADIOGRAFÍA COMPLETA DE POLÍTICAS RLS
-- =====================================================
-- Detecta: duplicadas, conflictivas, sin uso, tablas muertas
-- =====================================================


-- =====================================================
-- 1. POLÍTICAS DUPLICADAS (MISMO NOMBRE, MISMA TABLA)
-- =====================================================
SELECT 
    tablename AS "📋 Tabla",
    policyname AS "📜 Política",
    COUNT(*) AS "🔢 Veces Repetida",
    '⚠️ DUPLICADA - ELIMINAR' AS "🚨 Acción"
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename, policyname
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, tablename;


-- =====================================================
-- 2. TABLAS CON DEMASIADAS POLÍTICAS (>5 = SOSPECHOSO)
-- =====================================================
SELECT 
    tablename AS "📋 Tabla",
    COUNT(*) AS "📜 # Políticas",
    CASE 
        WHEN COUNT(*) > 8 THEN '🔴 CRÍTICO - Revisar'
        WHEN COUNT(*) > 5 THEN '🟡 ALTO - Posible duplicación'
        ELSE '🟢 NORMAL'
    END AS "🚨 Estado"
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY COUNT(*) DESC;


-- =====================================================
-- 3. POLÍTICAS CONFLICTIVAS (MISMA TABLA, MISMO COMANDO)
-- =====================================================
WITH policy_analysis AS (
    SELECT 
        tablename,
        cmd,
        COUNT(*) as policy_count,
        string_agg(policyname, ', ' ORDER BY policyname) as policy_names
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename, cmd
)
SELECT 
    tablename AS "📋 Tabla",
    cmd AS "🔧 Comando",
    policy_count AS "📜 # Políticas",
    policy_names AS "📝 Nombres",
    CASE 
        WHEN policy_count > 3 THEN '🔴 CONFLICTO - Demasiadas políticas para mismo comando'
        WHEN policy_count > 2 THEN '🟡 REVISAR - Posible conflicto'
        ELSE '🟢 OK'
    END AS "🚨 Estado"
FROM policy_analysis
WHERE policy_count > 1
ORDER BY policy_count DESC, tablename;


-- =====================================================
-- 4. TABLAS SIN POLÍTICAS RLS (PERO CON RLS HABILITADO)
-- =====================================================
SELECT 
    c.relname AS "📋 Tabla",
    '⚠️ RLS habilitado pero SIN políticas' AS "🚨 Problema",
    'Agregar políticas o deshabilitar RLS' AS "💡 Solución"
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity = true
    AND NOT EXISTS (
        SELECT 1 FROM pg_policies p 
        WHERE p.tablename = c.relname 
        AND p.schemaname = 'public'
    )
ORDER BY c.relname;


-- =====================================================
-- 5. TABLAS SIN RLS (POTENCIAL RIESGO DE SEGURIDAD)
-- =====================================================
SELECT 
    c.relname AS "📋 Tabla",
    pg_size_pretty(pg_total_relation_size(c.oid)) AS "💾 Tamaño",
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = c.relname AND table_schema = 'public') AS "📊 Columnas",
    CASE 
        WHEN c.relname LIKE '%_view' THEN '🟢 OK - Es vista'
        WHEN c.relname IN ('stations', 'job_roles', 'organizations') THEN '🟢 OK - Datos públicos'
        ELSE '🔴 RIESGO - Necesita RLS'
    END AS "🚨 Estado"
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity = false
ORDER BY pg_total_relation_size(c.oid) DESC;


-- =====================================================
-- 6. TABLAS VACÍAS (POSIBLES TABLAS MUERTAS)
-- =====================================================
WITH table_counts AS (
    SELECT 
        schemaname,
        tablename,
        n_live_tup as row_count
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
)
SELECT 
    tablename AS "📋 Tabla",
    row_count AS "📊 Registros",
    pg_size_pretty(pg_total_relation_size(quote_ident(tablename)::regclass)) AS "💾 Tamaño",
    CASE 
        WHEN row_count = 0 THEN '⚠️ TABLA VACÍA - Posible tabla muerta'
        ELSE '✅ Tiene datos'
    END AS "🚨 Estado"
FROM table_counts
WHERE row_count = 0
ORDER BY tablename;


-- =====================================================
-- 7. ANÁLISIS DETALLADO POR TABLA CRÍTICA
-- =====================================================
SELECT 
    tablename AS "📋 Tabla",
    policyname AS "📜 Política",
    cmd AS "🔧 Comando",
    roles AS "👥 Roles",
    permissive AS "🔓 Permisivo",
    LEFT(qual::text, 80) AS "✅ USING (80 chars)",
    LEFT(with_check::text, 80) AS "✔️ CHECK (80 chars)"
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('employees', 'food_orders', 'system_users', 'transport_schedules')
ORDER BY tablename, cmd, policyname;


-- =====================================================
-- 8. POLÍTICAS QUE USAN FUNCIONES INEXISTENTES
-- =====================================================
WITH policy_functions AS (
    SELECT DISTINCT
        tablename,
        policyname,
        regexp_matches(qual::text, 'public\.([a-z_]+)\(', 'g') as func_name
    FROM pg_policies
    WHERE schemaname = 'public'
        AND qual IS NOT NULL
)
SELECT 
    pf.tablename AS "📋 Tabla",
    pf.policyname AS "📜 Política",
    pf.func_name[1] AS "🔧 Función Usada",
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = pf.func_name[1]
        ) THEN '✅ Existe'
        ELSE '🔴 NO EXISTE - Política rota'
    END AS "🚨 Estado"
FROM policy_functions pf
ORDER BY pf.tablename, pf.policyname;


-- =====================================================
-- 9. COMPARACIÓN: POLÍTICAS ESPERADAS VS REALES
-- =====================================================
WITH expected_policies AS (
    -- Para cada tabla con station_id, esperamos 3 políticas básicas
    SELECT 
        table_name,
        3 as expected_count
    FROM information_schema.columns
    WHERE table_schema = 'public' 
        AND column_name = 'station_id'
        AND table_name NOT LIKE '%_view'
),
actual_policies AS (
    SELECT 
        tablename,
        COUNT(*) as actual_count
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename
)
SELECT 
    COALESCE(e.table_name, a.tablename) AS "📋 Tabla",
    COALESCE(e.expected_count, 0) AS "📊 Esperadas",
    COALESCE(a.actual_count, 0) AS "📊 Reales",
    COALESCE(a.actual_count, 0) - COALESCE(e.expected_count, 0) AS "➕➖ Diferencia",
    CASE 
        WHEN COALESCE(a.actual_count, 0) > COALESCE(e.expected_count, 0) + 2 THEN '🔴 EXCESO - Revisar duplicados'
        WHEN COALESCE(a.actual_count, 0) < COALESCE(e.expected_count, 0) THEN '🟡 FALTAN - Agregar políticas'
        ELSE '🟢 OK'
    END AS "🚨 Estado"
FROM expected_policies e
FULL OUTER JOIN actual_policies a ON e.table_name = a.tablename
ORDER BY ABS(COALESCE(a.actual_count, 0) - COALESCE(e.expected_count, 0)) DESC;


-- =====================================================
-- 10. ÍNDICES FALTANTES EN COLUMNAS DE RLS
-- =====================================================
WITH rls_columns AS (
    -- Columnas usadas en políticas RLS
    SELECT DISTINCT
        tablename,
        'station_id' as column_name
    FROM pg_policies
    WHERE schemaname = 'public'
        AND (qual::text LIKE '%station_id%' OR with_check::text LIKE '%station_id%')
)
SELECT 
    rc.tablename AS "📋 Tabla",
    rc.column_name AS "🔗 Columna RLS",
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes i
            WHERE i.tablename = rc.tablename
                AND i.indexdef LIKE '%' || rc.column_name || '%'
        ) THEN '✅ Tiene índice'
        ELSE '⚠️ SIN ÍNDICE - Performance afectada'
    END AS "🚨 Estado",
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM pg_indexes i
            WHERE i.tablename = rc.tablename
                AND i.indexdef LIKE '%' || rc.column_name || '%'
        ) THEN 'CREATE INDEX idx_' || rc.tablename || '_' || rc.column_name || ' ON ' || rc.tablename || '(' || rc.column_name || ');'
        ELSE NULL
    END AS "💡 Comando para crear índice"
FROM rls_columns rc
ORDER BY rc.tablename;


-- =====================================================
-- 11. RESUMEN EJECUTIVO DE PROBLEMAS
-- =====================================================
WITH stats AS (
    SELECT 
        (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
        (SELECT COUNT(DISTINCT tablename) FROM pg_policies WHERE schemaname = 'public') as tables_with_policies,
        (SELECT COUNT(*) FROM (
            SELECT tablename, policyname 
            FROM pg_policies 
            WHERE schemaname = 'public'
            GROUP BY tablename, policyname 
            HAVING COUNT(*) > 1
        ) dup) as duplicated_policies,
        (SELECT COUNT(*) FROM (
            SELECT tablename 
            FROM pg_policies 
            WHERE schemaname = 'public'
            GROUP BY tablename 
            HAVING COUNT(*) > 5
        ) heavy) as tables_with_too_many_policies,
        (SELECT COUNT(*) FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = false
        ) as tables_without_rls
)
SELECT 
    '📊 Total de Políticas RLS' AS "Métrica",
    total_policies::text AS "Valor",
    CASE WHEN total_policies > 100 THEN '🔴 ALTO' ELSE '🟢 OK' END AS "Estado"
FROM stats
UNION ALL
SELECT 
    '📋 Tablas con Políticas',
    tables_with_policies::text,
    '🟢 OK'
FROM stats
UNION ALL
SELECT 
    '⚠️ Políticas Duplicadas',
    duplicated_policies::text,
    CASE WHEN duplicated_policies > 0 THEN '🔴 CRÍTICO' ELSE '🟢 OK' END
FROM stats
UNION ALL
SELECT 
    '📜 Tablas con >5 Políticas',
    tables_with_too_many_policies::text,
    CASE WHEN tables_with_too_many_policies > 5 THEN '🔴 REVISAR' ELSE '🟢 OK' END
FROM stats
UNION ALL
SELECT 
    '🔓 Tablas sin RLS',
    tables_without_rls::text,
    CASE WHEN tables_without_rls > 10 THEN '🟡 REVISAR' ELSE '🟢 OK' END
FROM stats;


-- =====================================================
-- 12. RECOMENDACIONES FINALES
-- =====================================================
SELECT 
    '🎯 RECOMENDACIONES' AS "Categoría",
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') > 100 THEN
            '1. Consolidar políticas RLS (tienes ' || (SELECT COUNT(*)::text FROM pg_policies WHERE schemaname = 'public') || ', deberías tener ~60-80)'
        ELSE
            '1. ✅ Número de políticas aceptable'
    END AS "Acción"
UNION ALL
SELECT 
    '🎯 RECOMENDACIONES',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public'
            GROUP BY tablename, policyname 
            HAVING COUNT(*) > 1
        ) THEN
            '2. 🔴 Eliminar políticas duplicadas (ver Query #1)'
        ELSE
            '2. ✅ No hay políticas duplicadas'
    END
UNION ALL
SELECT 
    '🎯 RECOMENDACIONES',
    '3. Revisar tablas con >5 políticas (ver Query #2)'
UNION ALL
SELECT 
    '🎯 RECOMENDACIONES',
    '4. Agregar índices en columnas de RLS (ver Query #10)'
UNION ALL
SELECT 
    '🎯 RECOMENDACIONES',
    '5. Eliminar tablas vacías/muertas (ver Query #6)';
