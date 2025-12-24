-- =====================================================
-- ROLLBACK: Restaurar Políticas Eliminadas
-- =====================================================
-- EJECUTAR INMEDIATAMENTE
-- =====================================================

-- =====================================================
-- 1. RESTAURAR app_settings
-- =====================================================

CREATE POLICY "Enable all access for authenticated users" 
ON app_settings FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Enable read access for all users" 
ON app_settings FOR SELECT 
TO public 
USING (true);

-- =====================================================
-- 2. RESTAURAR employees
-- =====================================================

CREATE POLICY "admin_employee_crud_policy" 
ON employees FOR ALL 
TO authenticated 
USING (
  (SELECT station_id FROM system_users WHERE id = auth.uid()) IS NULL 
  OR station_id = (SELECT station_id FROM system_users WHERE id = auth.uid())
)
WITH CHECK (
  (SELECT station_id FROM system_users WHERE id = auth.uid()) IS NULL 
  OR station_id = (SELECT station_id FROM system_users WHERE id = auth.uid())
);

-- =====================================================
-- 3. RESTAURAR food_orders
-- =====================================================

CREATE POLICY "Allow all for authenticated users" 
ON food_orders FOR ALL 
TO public 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

-- =====================================================
-- 4. RESTAURAR menus
-- =====================================================

CREATE POLICY "Allow all for authenticated users" 
ON menus FOR ALL 
TO public 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Public read menus" 
ON menus FOR SELECT 
TO public 
USING (true);

-- =====================================================
-- 5. RESTAURAR master_products
-- =====================================================

CREATE POLICY "Select products" 
ON master_products FOR SELECT 
TO public 
USING (true);

CREATE POLICY "Insert products" 
ON master_products FOR INSERT 
TO public 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Update products" 
ON master_products FOR UPDATE 
TO public 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Delete products" 
ON master_products FOR DELETE 
TO public 
USING (auth.role() = 'authenticated');

-- =====================================================
-- VERIFICAR
-- =====================================================

SELECT tablename, COUNT(*) as policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('employees', 'food_orders', 'menus', 'app_settings', 'master_products')
GROUP BY tablename
ORDER BY tablename;
