-- EMERGENCY FIX: RESTORE VISIBILITY FOR ALL CRITICAL TABLES
-- This script drops restrictive policies and re-establishes broad read access for authenticated users
-- to prevent "empty lists" in the UI.

-- 1. SYSTEM USERS (Usuarios del Sistema)
DROP POLICY IF EXISTS "Allow read access" ON system_users;
DROP POLICY IF EXISTS "Allow individual read access" ON system_users;
DROP POLICY IF EXISTS "Enable read access for all users" ON system_users;
DROP POLICY IF EXISTS "Admin can view all users" ON system_users;

-- Re-enable basic read for authenticated users (so they can see who they are and who others are)
CREATE POLICY "Enable read access for authenticated users" 
ON system_users FOR SELECT 
TO authenticated 
USING (true);

-- Ensure full access for Admins/Superadmins
CREATE POLICY "Enable full access for admins" 
ON system_users FOR ALL 
TO authenticated 
USING (
  (SELECT role FROM system_users WHERE id = auth.uid()) IN ('ADMIN', 'SUPERADMIN')
);


-- 2. EMPLOYEES (Empleados)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON employees;
DROP POLICY IF EXISTS "Employees viewable by team" ON employees;

CREATE POLICY "Enable read access for authenticated users" 
ON employees FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable modification for admins" 
ON employees FOR ALL 
TO authenticated 
USING (
  (SELECT role FROM system_users WHERE id = auth.uid()) IN ('ADMIN', 'SUPERADMIN')
);


-- 3. APP ROLES (Roles)
DROP POLICY IF EXISTS "Roles are viewable by everyone" ON app_roles;

CREATE POLICY "Roles are viewable by everyone" 
ON app_roles FOR SELECT 
TO authenticated 
USING (true);


-- 4. STATIONS (Estaciones)
DROP POLICY IF EXISTS "Stations are viewable by everyone" ON stations;

CREATE POLICY "Stations are viewable by everyone" 
ON stations FOR SELECT 
TO authenticated 
USING (true);


-- 5. JOB ROLES (Cargos)
DROP POLICY IF EXISTS "Job roles are viewable by everyone" ON job_roles;

CREATE POLICY "Job roles are viewable by everyone" 
ON job_roles FOR SELECT 
TO authenticated 
USING (true);


-- 6. AREAS (Areas)
DROP POLICY IF EXISTS "Areas are viewable by everyone" ON areas;

CREATE POLICY "Areas are viewable by everyone" 
ON areas FOR SELECT 
TO authenticated 
USING (true);

-- 7. MENU ITEMS (Configuración de Alimentos)
DROP POLICY IF EXISTS "Menu items are viewable by everyone" ON menu_items;
CREATE POLICY "Menu items are viewable by everyone" 
ON menu_items FOR SELECT 
TO authenticated 
USING (true);

-- Grant perms just in case
GRANT SELECT ON system_users TO authenticated;
GRANT SELECT ON employees TO authenticated;
GRANT SELECT ON app_roles TO authenticated;
GRANT SELECT ON stations TO authenticated;
GRANT SELECT ON job_roles TO authenticated;
GRANT SELECT ON areas TO authenticated;
