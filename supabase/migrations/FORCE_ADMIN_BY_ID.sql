-- SCRIPT: FORCE_ADMIN_BY_ID.sql
-- OBJECTIVE: Force update admin role using known UUID (from user dump)
-- DATE: 2025-12-24

BEGIN;

-- Update by specific UUID (Juan Carlitos / Usuario Restaurado / etc)
-- Based on the dump, the user with email 'admin@gestor360.com' has ID '369bf910-9775-4fa9-906c-ea4d21e3da6f'
UPDATE public.employees
SET role_name = 'ADMIN',
    updated_at = NOW()
WHERE id = '369bf910-9775-4fa9-906c-ea4d21e3da6f';

-- Verify by ID
SELECT * FROM public.employees WHERE id = '369bf910-9775-4fa9-906c-ea4d21e3da6f';

COMMIT;
