-- =====================================================
-- Fix RLS Policies for Stations and System Users
-- =====================================================

-- Habilitar RLS en las tablas que faltaban
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_docs ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS para job_roles si existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_roles') THEN
    ALTER TABLE job_roles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Eliminar políticas existentes si existen (para evitar duplicados)
DROP POLICY IF EXISTS "Allow all for authenticated users" ON stations;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON system_users;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON system_settings;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON employee_docs;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON job_roles;

-- Crear políticas para permitir acceso completo a usuarios autenticados
CREATE POLICY "Allow all for authenticated users" ON stations
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON system_users
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON system_settings
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON employee_docs
  FOR ALL USING (auth.role() = 'authenticated');

-- Crear política para job_roles si existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_roles') THEN
    EXECUTE 'CREATE POLICY "Allow all for authenticated users" ON job_roles FOR ALL USING (auth.role() = ''authenticated'')';
  END IF;
END $$;

-- Verificar políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('stations', 'system_users', 'system_settings', 'employee_docs', 'job_roles')
ORDER BY tablename, policyname;
