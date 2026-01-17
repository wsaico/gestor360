-- ================================================================
-- SOLUCIÓN FINAL INTELIGENTE (RESILIENTE A DATOS SUCIOS)
-- ================================================================
-- DIAGNÓSTICO:
-- Tienes usuarios Admins en la tabla 'employees' que NO están en 'system_users'.
-- Mi script anterior buscaba solo en 'system_users' (lo estándar), por eso falló.
--
-- SOLUCIÓN:
-- Actualizamos la función 'get_my_role' para que busque en AMBOS lados.
-- Si no te encuentra en system_users, te busca en employees.
-- Y convierte todo a MAYÚSCULAS para que 'admin' = 'ADMIN'.
-- ================================================================

BEGIN;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role text;
BEGIN
    -- 1. Intentar buscar en system_users (Prioridad)
    SELECT role INTO user_role
    FROM public.system_users
    WHERE id = auth.uid();
    
    -- 2. Si no se encontró, buscar en employees (Fallback)
    IF user_role IS NULL THEN
        SELECT role_name INTO user_role
        FROM public.employees
        WHERE id = auth.uid();
    END IF;
    
    -- 3. Devolver en MAYÚSCULAS para evitar errores de 'Admin' vs 'ADMIN'
    RETURN UPPER(user_role);
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_role() TO authenticated;

-- (Las políticas no necesitan cambios, porque ahora la función SÍ devolverá 'ADMIN')

COMMIT;
