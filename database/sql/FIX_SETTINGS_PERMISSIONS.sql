-- 1. Asegurar que la tabla existe y la clave es única
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Habilitar RLS (Seguridad)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 3. Crear política para permitir TODO a usuarios autenticados (para que puedan guardar)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.app_settings;
CREATE POLICY "Enable all access for authenticated users" ON public.app_settings
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 4. Política para permitir LECTURA a todos (para que el PDF pueda leer la configuración)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.app_settings;
CREATE POLICY "Enable read access for all users" ON public.app_settings
    FOR SELECT
    TO public
    USING (true);

-- 5. LIMPIEZA DE DATOS: Borrar la URL antigua de Talma que está causando problemas
UPDATE public.app_settings 
SET value = NULL, updated_at = now()
WHERE key = 'COMPANY_LOGO_URL';

-- Si no existía, insertar un placeholder vacío
INSERT INTO public.app_settings (key, value)
VALUES ('COMPANY_LOGO_URL', NULL)
ON CONFLICT (key) DO NOTHING;

-- Notificar éxito
SELECT 'Permisos corregidos y URL antigua eliminada. Por favor sube tu logo nuevamente.' as status;
