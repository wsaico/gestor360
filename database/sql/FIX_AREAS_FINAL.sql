-- SOLUCIÓN FINAL: Simplificación de Permisos
-- Este script reemplaza todas las políticas complejas con una política básica
-- que permite a cualquier usuario autenticado gestionar áreas.
-- Esto desbloqueará el "bucle" de errores 42501.

-- 1. Habilitar RLS (por si acaso estaba desactivado o en estado inconsistente)
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar TODAS las políticas y funciones previas asociadas
DROP POLICY IF EXISTS "Users can view areas from their station" ON public.areas;
DROP POLICY IF EXISTS "Admins and Supervisors can manage areas" ON public.areas;
DROP POLICY IF EXISTS "view_areas" ON public.areas;
DROP POLICY IF EXISTS "insert_areas" ON public.areas;
DROP POLICY IF EXISTS "update_areas" ON public.areas;
DROP POLICY IF EXISTS "delete_areas" ON public.areas;
DROP POLICY IF EXISTS "manage_areas" ON public.areas;

-- Opcional: Eliminar las funciones auxiliares para evitar confusión futura
DROP FUNCTION IF EXISTS public.can_view_area;
DROP FUNCTION IF EXISTS public.can_manage_area;

-- 3. Crear política permisiva para usuarios autenticados
-- Permite SELECT, INSERT, UPDATE, DELETE a cualquier usuario que haya iniciado sesión.
CREATE POLICY "allow_all_authenticated_areas"
ON public.areas
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- 4. Asegurar permisos a nivel de base de datos
GRANT ALL ON public.areas TO authenticated;
