-- 1. Crear tabla 'areas'
CREATE TABLE IF NOT EXISTS public.areas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    station_id UUID NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(station_id, name)
);

-- 2. Insertar áreas por defecto para estaciones existentes
-- Se hace ANTES de habilitar RLS para evitar problemas de permisos en el script
DO $$
DECLARE
    station RECORD;
    area_name TEXT;
    default_areas TEXT[] := ARRAY['RAMPA', 'PAX', 'OMA', 'TRAFICO', 'ADMINISTRATIVO'];
BEGIN
    FOR station IN SELECT id FROM public.stations LOOP
        FOREACH area_name IN ARRAY default_areas LOOP
            INSERT INTO public.areas (station_id, name, is_active)
            VALUES (station.id, area_name, true)
            ON CONFLICT (station_id, name) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- 3. Habilitar RLS en 'areas'
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

-- 4. Funciones y Políticas RLS Robustas

-- Función auxiliar para verificar permisos de lectura (SECURITY DEFINER)
-- Permite que cualquiera vea las áreas de su estación, o admins vean todo
CREATE OR REPLACE FUNCTION public.can_view_area(area_station_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    current_user_role text;
    current_user_station_id uuid;
BEGIN
    SELECT role, station_id INTO current_user_role, current_user_station_id
    FROM public.system_users 
    WHERE id = auth.uid();

    IF current_user_role IS NULL THEN
        RETURN false;
    END IF;

    -- Admin ve todo
    IF current_user_role = 'ADMIN' THEN
        RETURN true;
    END IF;

    -- Otros ven solo su estación
    RETURN current_user_station_id = area_station_id;
END;
$$;

-- Función auxiliar para verificar permisos de escritura (SECURITY DEFINER)
-- Solo Admin o Supervisor de la misma estación
CREATE OR REPLACE FUNCTION public.can_manage_area(area_station_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    current_user_role text;
    current_user_station_id uuid;
BEGIN
    SELECT role, station_id INTO current_user_role, current_user_station_id
    FROM public.system_users 
    WHERE id = auth.uid();

    IF current_user_role IS NULL THEN
        RETURN false;
    END IF;

    -- Admin gestiona todo
    IF current_user_role = 'ADMIN' THEN
        RETURN true;
    END IF;

    -- Supervisor gestiona solo su estación
    IF current_user_role = 'SUPERVISOR' AND current_user_station_id = area_station_id THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$;

-- Limpiar políticas anteriores
DROP POLICY IF EXISTS "Users can view areas from their station" ON public.areas;
DROP POLICY IF EXISTS "Admins and Supervisors can manage areas" ON public.areas;
DROP POLICY IF EXISTS "view_areas" ON public.areas;
DROP POLICY IF EXISTS "insert_areas" ON public.areas;
DROP POLICY IF EXISTS "update_areas" ON public.areas;
DROP POLICY IF EXISTS "delete_areas" ON public.areas;
DROP POLICY IF EXISTS "manage_areas" ON public.areas;

-- Políticas usando las funciones
CREATE POLICY "view_areas"
    ON public.areas FOR SELECT
    USING ( public.can_view_area(station_id) );

CREATE POLICY "insert_areas"
    ON public.areas FOR INSERT
    WITH CHECK ( public.can_manage_area(station_id) );

CREATE POLICY "update_areas"
    ON public.areas FOR UPDATE
    USING ( public.can_manage_area(station_id) );

CREATE POLICY "delete_areas"
    ON public.areas FOR DELETE
    USING ( public.can_manage_area(station_id) );

-- Asegurar permisos de ejecución
GRANT EXECUTE ON FUNCTION public.can_view_area TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_area TO authenticated;
GRANT ALL ON public.areas TO authenticated;

-- 5. Agregar columna 'area_id' a 'epp_items'
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'epp_items' AND column_name = 'area_id') THEN
        ALTER TABLE public.epp_items ADD COLUMN area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 6. Agregar columna 'area_id' a 'employees'
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'area_id') THEN
        ALTER TABLE public.employees ADD COLUMN area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL;
    END IF;
END $$;
