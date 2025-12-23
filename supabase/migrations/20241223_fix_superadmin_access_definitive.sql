-- =====================================================
-- SOLUCIÓN DEFINITIVA: SUPER ADMIN ACCESO TOTAL
-- =====================================================
-- Fecha: 2024-12-23
-- Objetivo: Garantizar que Super Admins SIEMPRE tengan acceso completo
--          a TODOS los datos sin importar la estación
-- =====================================================

-- =====================================================
-- PASO 1: FUNCIÓN HELPER MEJORADA
-- =====================================================

-- Función mejorada para detectar Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
BEGIN
  -- Un Super Admin es:
  -- 1. Un usuario con role = 'SUPERADMIN', O
  -- 2. Un usuario con role = 'ADMIN' Y station_id IS NULL (Global Admin)
  RETURN EXISTS (
    SELECT 1 
    FROM public.system_users 
    WHERE id = auth.uid() 
    AND (
      role = 'SUPERADMIN' 
      OR (role = 'ADMIN' AND station_id IS NULL)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

COMMENT ON FUNCTION public.is_super_admin() IS 
'Retorna true si el usuario actual es Super Admin (SUPERADMIN o ADMIN sin estación asignada)';


-- =====================================================
-- PASO 2: POLÍTICAS PARA EMPLOYEES
-- =====================================================

-- Limpiar políticas existentes
DROP POLICY IF EXISTS "Global Admin sees all employees" ON employees;
DROP POLICY IF EXISTS "Station Users see station employees" ON employees;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON employees;
DROP POLICY IF EXISTS "Enable modification for admins" ON employees;
DROP POLICY IF EXISTS "Admins can view all employees" ON employees;
DROP POLICY IF EXISTS "Admins can update all employees" ON employees;
DROP POLICY IF EXISTS "Admins can create employees in any station" ON employees;
DROP POLICY IF EXISTS "Admins can delete employees" ON employees;
DROP POLICY IF EXISTS "users_read_employees_policy" ON employees;

-- POLÍTICA 1: Super Admin tiene acceso TOTAL (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "superadmin_full_access_employees"
ON employees
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- POLÍTICA 2: Usuarios normales solo ven empleados de su estación
CREATE POLICY "users_station_access_employees"
ON employees
FOR SELECT
TO authenticated
USING (
  NOT public.is_super_admin() 
  AND station_id = (SELECT station_id FROM public.system_users WHERE id = auth.uid())
);

-- POLÍTICA 3: Station Admins pueden modificar empleados de su estación
CREATE POLICY "station_admin_modify_employees"
ON employees
FOR ALL
TO authenticated
USING (
  NOT public.is_super_admin()
  AND EXISTS (
    SELECT 1 FROM public.system_users 
    WHERE id = auth.uid() 
    AND role IN ('ADMIN', 'SUPERVISOR')
    AND station_id = employees.station_id
  )
)
WITH CHECK (
  NOT public.is_super_admin()
  AND EXISTS (
    SELECT 1 FROM public.system_users 
    WHERE id = auth.uid() 
    AND role IN ('ADMIN', 'SUPERVISOR')
    AND station_id = employees.station_id
  )
);


-- =====================================================
-- PASO 3: POLÍTICAS PARA SYSTEM_USERS
-- =====================================================

DROP POLICY IF EXISTS "Read own profile" ON system_users;
DROP POLICY IF EXISTS "Global Admin sees all" ON system_users;
DROP POLICY IF EXISTS "Station Admin sees station users" ON system_users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON system_users;
DROP POLICY IF EXISTS "Enable full access for admins" ON system_users;

-- POLÍTICA 1: Super Admin acceso total
CREATE POLICY "superadmin_full_access_system_users"
ON system_users
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- POLÍTICA 2: Todos pueden ver su propio perfil
CREATE POLICY "users_read_own_profile"
ON system_users
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- POLÍTICA 3: Station Admins ven usuarios de su estación
CREATE POLICY "station_admin_see_station_users"
ON system_users
FOR SELECT
TO authenticated
USING (
  NOT public.is_super_admin()
  AND EXISTS (
    SELECT 1 FROM public.system_users su
    WHERE su.id = auth.uid()
    AND su.role IN ('ADMIN', 'SUPERVISOR')
    AND su.station_id = system_users.station_id
  )
);


-- =====================================================
-- PASO 4: POLÍTICAS PARA FOOD_ORDERS
-- =====================================================

DROP POLICY IF EXISTS "Global Admin sees all orders" ON food_orders;
DROP POLICY IF EXISTS "Users see orders in their station" ON food_orders;
DROP POLICY IF EXISTS "Orders viewable by station" ON food_orders;

-- POLÍTICA 1: Super Admin acceso total
CREATE POLICY "superadmin_full_access_food_orders"
ON food_orders
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- POLÍTICA 2: Usuarios ven órdenes de su estación
CREATE POLICY "users_station_access_food_orders"
ON food_orders
FOR SELECT
TO authenticated
USING (
  NOT public.is_super_admin()
  AND station_id = (SELECT station_id FROM public.system_users WHERE id = auth.uid())
);

-- POLÍTICA 3: Station staff puede modificar órdenes de su estación
CREATE POLICY "station_staff_modify_food_orders"
ON food_orders
FOR ALL
TO authenticated
USING (
  NOT public.is_super_admin()
  AND EXISTS (
    SELECT 1 FROM public.system_users 
    WHERE id = auth.uid() 
    AND role IN ('ADMIN', 'SUPERVISOR', 'MONITOR')
    AND station_id = food_orders.station_id
  )
)
WITH CHECK (
  NOT public.is_super_admin()
  AND EXISTS (
    SELECT 1 FROM public.system_users 
    WHERE id = auth.uid() 
    AND role IN ('ADMIN', 'SUPERVISOR', 'MONITOR')
    AND station_id = food_orders.station_id
  )
);


-- =====================================================
-- PASO 5: POLÍTICAS PARA MENUS
-- =====================================================

DROP POLICY IF EXISTS "Public read menus" ON menus;
DROP POLICY IF EXISTS "Global Admin manages menus" ON menus;
DROP POLICY IF EXISTS "Station Admin manages station menus" ON menus;

-- POLÍTICA 1: Super Admin acceso total
CREATE POLICY "superadmin_full_access_menus"
ON menus
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- POLÍTICA 2: Todos pueden leer menús (público)
CREATE POLICY "public_read_menus"
ON menus
FOR SELECT
TO authenticated, anon
USING (true);

-- POLÍTICA 3: Station Admins pueden modificar menús de su estación
CREATE POLICY "station_admin_modify_menus"
ON menus
FOR ALL
TO authenticated
USING (
  NOT public.is_super_admin()
  AND EXISTS (
    SELECT 1 FROM public.system_users 
    WHERE id = auth.uid() 
    AND role IN ('ADMIN', 'SUPERVISOR')
    AND station_id = menus.station_id
  )
)
WITH CHECK (
  NOT public.is_super_admin()
  AND EXISTS (
    SELECT 1 FROM public.system_users 
    WHERE id = auth.uid() 
    AND role IN ('ADMIN', 'SUPERVISOR')
    AND station_id = menus.station_id
  )
);


-- =====================================================
-- PASO 6: POLÍTICAS PARA OTRAS TABLAS CRÍTICAS
-- =====================================================

-- AREAS
DROP POLICY IF EXISTS "Areas are viewable by everyone" ON areas;
DROP POLICY IF EXISTS "allow_all_authenticated_areas" ON areas;

CREATE POLICY "superadmin_full_access_areas"
ON areas FOR ALL TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "users_read_areas"
ON areas FOR SELECT TO authenticated
USING (true);

CREATE POLICY "station_admin_modify_areas"
ON areas FOR ALL TO authenticated
USING (
  NOT public.is_super_admin()
  AND EXISTS (
    SELECT 1 FROM public.system_users 
    WHERE id = auth.uid() 
    AND role IN ('ADMIN', 'SUPERVISOR')
    AND station_id = areas.station_id
  )
)
WITH CHECK (
  NOT public.is_super_admin()
  AND EXISTS (
    SELECT 1 FROM public.system_users 
    WHERE id = auth.uid() 
    AND role IN ('ADMIN', 'SUPERVISOR')
    AND station_id = areas.station_id
  )
);


-- JOB_ROLES
DROP POLICY IF EXISTS "Job roles are viewable by everyone" ON job_roles;
DROP POLICY IF EXISTS "Public read access for job_roles" ON job_roles;

CREATE POLICY "superadmin_full_access_job_roles"
ON job_roles FOR ALL TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "users_read_job_roles"
ON job_roles FOR SELECT TO authenticated, anon
USING (true);


-- STATIONS
DROP POLICY IF EXISTS "Stations are viewable by everyone" ON stations;

CREATE POLICY "superadmin_full_access_stations"
ON stations FOR ALL TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "users_read_stations"
ON stations FOR SELECT TO authenticated
USING (true);


-- ASSETS
DROP POLICY IF EXISTS "superadmin_full_access_assets" ON assets;

CREATE POLICY "superadmin_full_access_assets"
ON assets FOR ALL TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "users_station_access_assets"
ON assets FOR SELECT TO authenticated
USING (
  NOT public.is_super_admin()
  AND station_id = (SELECT station_id FROM public.system_users WHERE id = auth.uid())
);

CREATE POLICY "station_admin_modify_assets"
ON assets FOR ALL TO authenticated
USING (
  NOT public.is_super_admin()
  AND EXISTS (
    SELECT 1 FROM public.system_users 
    WHERE id = auth.uid() 
    AND role IN ('ADMIN', 'SUPERVISOR')
    AND station_id = assets.station_id
  )
)
WITH CHECK (
  NOT public.is_super_admin()
  AND EXISTS (
    SELECT 1 FROM public.system_users 
    WHERE id = auth.uid() 
    AND role IN ('ADMIN', 'SUPERVISOR')
    AND station_id = assets.station_id
  )
);


-- =====================================================
-- PASO 7: VERIFICACIÓN
-- =====================================================

-- Crear función de verificación para debugging
CREATE OR REPLACE FUNCTION public.debug_user_access()
RETURNS TABLE (
  user_id uuid,
  user_role text,
  user_station uuid,
  is_super_admin boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as user_id,
    (SELECT role FROM public.system_users WHERE id = auth.uid()) as user_role,
    (SELECT station_id FROM public.system_users WHERE id = auth.uid()) as user_station,
    public.is_super_admin() as is_super_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.debug_user_access() TO authenticated;

COMMENT ON FUNCTION public.debug_user_access() IS 
'Función de debugging para verificar permisos del usuario actual';


-- =====================================================
-- RESUMEN Y COMENTARIOS
-- =====================================================

COMMENT ON FUNCTION public.is_super_admin() IS 
'CRÍTICO: Esta función determina si un usuario es Super Admin.
Super Admins tienen acceso TOTAL a TODOS los datos.
No modificar sin consultar con el equipo de desarrollo.';

-- Log de migración
DO $$
BEGIN
  RAISE NOTICE '✅ Migración completada: Super Admin Access Definitivo';
  RAISE NOTICE '📋 Políticas aplicadas a: employees, system_users, food_orders, menus, areas, job_roles, stations, assets';
  RAISE NOTICE '🔒 Super Admins ahora tienen acceso total garantizado';
  RAISE NOTICE '🧪 Usa SELECT * FROM debug_user_access(); para verificar permisos';
END $$;
