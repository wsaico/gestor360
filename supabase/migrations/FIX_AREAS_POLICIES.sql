-- =====================================================
-- FIX: Restaurar Política de Lectura para AREAS
-- =====================================================
-- EJECUTAR INMEDIATAMENTE
-- =====================================================

-- Eliminar política restrictiva si existe
DROP POLICY IF EXISTS "admins_manage_areas" ON areas;

-- Crear política permisiva para lectura (todos los autenticados pueden leer)
CREATE POLICY "authenticated_read_areas" 
ON areas FOR SELECT 
TO authenticated 
USING (true);

-- Crear política para escritura (solo admins)
CREATE POLICY "admins_write_areas" 
ON areas FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM system_users 
    WHERE id = auth.uid() 
    AND role IN ('ADMIN', 'SUPERVISOR')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM system_users 
    WHERE id = auth.uid() 
    AND role IN ('ADMIN', 'SUPERVISOR')
  )
);

-- Verificar políticas creadas
SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public' 
    AND tablename = 'areas'
ORDER BY policyname;
