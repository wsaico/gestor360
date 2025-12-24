-- =====================================================
-- VER TODAS LAS POLÍTICAS RLS ACTUALES
-- =====================================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as comando,
    qual as condicion_where,
    with_check as condicion_insert_update
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
