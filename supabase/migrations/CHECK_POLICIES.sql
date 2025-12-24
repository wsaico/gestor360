-- SCRIPT DE DIAGNÓSTICO
-- Ejecuta esto en el editor SQL de Supabase para ver qué políticas están activas realmente.

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM 
    pg_policies 
WHERE 
    tablename = 'employees'
ORDER BY 
    policyname;
