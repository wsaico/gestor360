-- =====================================================
-- AUDITORÍA Y CORRECCIÓN COMPLETA DEL SISTEMA
-- =====================================================

-- ==================== PASO 1: AUDITORÍA ====================

-- 1.1 Verificar qué tablas existen
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 1.2 Verificar qué tablas tienen RLS habilitado
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 1.3 Verificar todas las políticas RLS existentes
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 1.4 Verificar estructura de la tabla employees
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'employees'
ORDER BY ordinal_position;

-- ==================== PASO 2: CORRECCIONES ====================

-- 2.1 Habilitar RLS en TODAS las tablas que lo necesitan
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Habilitar para job_roles si existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_roles') THEN
    ALTER TABLE job_roles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- 2.2 Eliminar políticas existentes para evitar duplicados
DROP POLICY IF EXISTS "Allow all for authenticated users" ON employees;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON employee_docs;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON stations;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON system_users;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON system_settings;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON job_roles;

-- 2.3 Crear políticas para TODAS las tablas
-- EMPLOYEES (LA MÁS IMPORTANTE)
CREATE POLICY "Allow all for authenticated users" ON employees
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- EMPLOYEE_DOCS
CREATE POLICY "Allow all for authenticated users" ON employee_docs
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- STATIONS
CREATE POLICY "Allow all for authenticated users" ON stations
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- SYSTEM_USERS
CREATE POLICY "Allow all for authenticated users" ON system_users
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- SYSTEM_SETTINGS
CREATE POLICY "Allow all for authenticated users" ON system_settings
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- JOB_ROLES (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_roles') THEN
    EXECUTE 'CREATE POLICY "Allow all for authenticated users" ON job_roles
      FOR ALL
      USING (auth.role() = ''authenticated'')
      WITH CHECK (auth.role() = ''authenticated'')';
  END IF;
END $$;

-- ==================== PASO 3: VERIFICACIÓN FINAL ====================

-- 3.1 Verificar que RLS esté habilitado
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('employees', 'employee_docs', 'stations', 'system_users', 'system_settings', 'job_roles')
ORDER BY tablename;

-- 3.2 Verificar que las políticas se crearon
SELECT
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('employees', 'employee_docs', 'stations', 'system_users', 'system_settings', 'job_roles')
ORDER BY tablename, policyname;

-- 3.3 Contar registros en employees (para verificar acceso)
SELECT COUNT(*) as total_employees FROM employees;

-- ==================== NOTAS IMPORTANTES ====================
--
-- Si aún hay problemas después de ejecutar este script:
--
-- 1. Verifica que el usuario esté autenticado correctamente
-- 2. Verifica el token JWT en localStorage
-- 3. Revisa la consola del navegador para errores específicos
-- 4. Ejecuta esta query para ver el rol actual:
--    SELECT auth.role();
--
-- =====================================================
