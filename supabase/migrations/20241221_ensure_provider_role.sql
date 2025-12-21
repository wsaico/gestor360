-- Ensure PROVIDER role exists in app_roles
INSERT INTO public.app_roles (name, label, description, is_system, permissions)
VALUES (
    'PROVIDER', 
    'Proveedor de Alimentos', 
    'Encargado del concesionario. Gestiona menús y atiende pedidos.', 
    true, 
    '["MENU_MANAGE", "ORDERS_MANAGE"]'::jsonb
)
ON CONFLICT (name) DO UPDATE SET 
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    is_system = true;
