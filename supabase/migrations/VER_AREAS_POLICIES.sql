-- =====================================================
-- VERIFICAR Y ARREGLAR POLÍTICAS DE AREAS
-- =====================================================

-- Ver políticas actuales de areas
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
    AND tablename = 'areas'
ORDER BY policyname;
