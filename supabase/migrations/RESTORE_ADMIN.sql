-- SCRIPT DE RESTAURACIÓN DE ROL ADMIN
-- Ejecuta esto en Supabase SQL Editor para recuperar tu acceso

BEGIN;

-- Actualizar el rol del usuario admin para que sea ADMIN de verdad
UPDATE public.employees
SET role_name = 'ADMIN',
    -- Asegurar que tenga permisos si se usa la columna permissions (opcional)
    -- Asignar station_id nulo si es admin global, o dejarlo si es admin de estación
    updated_at = NOW()
WHERE email = 'admin@gestor360.com';

-- Verificación
SELECT email, role_name FROM public.employees WHERE email = 'admin@gestor360.com';

COMMIT;
