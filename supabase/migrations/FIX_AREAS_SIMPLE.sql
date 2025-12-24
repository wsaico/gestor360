-- =====================================================
-- FIX SIMPLE: Permitir lectura de AREAS a todos
-- =====================================================
-- EJECUTAR INMEDIATAMENTE
-- =====================================================

-- Eliminar política problemática
DROP POLICY IF EXISTS "multibranch_area_select" ON areas;

-- Crear política simple: todos los autenticados pueden leer
CREATE POLICY "authenticated_can_read_areas" 
ON areas FOR SELECT 
TO authenticated 
USING (true);

-- Verificar
SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public' 
    AND tablename = 'areas'
ORDER BY policyname;
