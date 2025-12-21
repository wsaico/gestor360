-- Migration: Create RPC to sync/restore zombie employees from Auth
-- Fixes "value too long" error by enforcing 8-char limit on DNI

CREATE OR REPLACE FUNCTION public.sync_zombie_users()
RETURNS TABLE (
    restored_count INT,
    details TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INT := 0;
BEGIN
    -- Insert missing employees based on Auth Metadata
    WITH inserted AS (
        INSERT INTO public.employees (
            id, 
            station_id, 
            full_name, 
            dni, 
            email, 
            status, 
            role_name, 
            created_at, 
            updated_at
        )
        SELECT 
            au.id, 
            COALESCE((au.raw_user_meta_data->>'station_id')::uuid, (SELECT id FROM public.stations LIMIT 1)), 
            COALESCE(au.raw_user_meta_data->>'full_name', 'Usuario Restaurado'), 
            -- STRICTLY ENFORCE 8 CHARS FOR DNI
            COALESCE(
                NULLIF(LEFT(au.raw_user_meta_data->>'dni', 8), ''), 
                LEFT(au.id::text, 8) -- Fallback to first 8 chars of UUID
            ), 
            au.email, 
            'ACTIVO', 
            COALESCE(au.raw_user_meta_data->>'role', 'Empleado'),
            au.created_at,
            NOW()
        FROM auth.users au
        LEFT JOIN public.employees pe ON pe.id = au.id
        WHERE pe.id IS NULL
        AND au.email NOT LIKE '%@example.com' 
        RETURNING id
    )
    SELECT COUNT(*) INTO v_count FROM inserted;

    RETURN QUERY SELECT v_count, 'Usuarios restaurados correctamente. Datos truncados a 8 caracteres si eran muy largos.';
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.sync_zombie_users() TO authenticated;
