-- SMART RLS POLICIES for SST & INVENTORY (VERIFIED TABLES)
-- Applies the Global Admin vs Station Admin logic
-- Updated with correct table names found in services

-- 1. EPP ITEMS (Applies to epp_items table)
DROP POLICY IF EXISTS "Global Admin sees all epp" ON epp_items;
DROP POLICY IF EXISTS "Station Users see station epp" ON epp_items;

CREATE POLICY "Global Admin sees all epp" 
ON epp_items FOR ALL 
TO authenticated 
USING (public.is_global_admin());

CREATE POLICY "Station Users see station epp" 
ON epp_items FOR SELECT 
TO authenticated 
USING (
  station_id = public.get_user_station()
);

-- 2. EPP DELIVERIES (Applies to epp_deliveries table)
DROP POLICY IF EXISTS "Global Admin sees all deliveries" ON epp_deliveries;
DROP POLICY IF EXISTS "Station Users see station deliveries" ON epp_deliveries;

CREATE POLICY "Global Admin sees all deliveries" 
ON epp_deliveries FOR ALL 
TO authenticated 
USING (public.is_global_admin());

CREATE POLICY "Station Users see station deliveries" 
ON epp_deliveries FOR SELECT 
TO authenticated 
USING (
  station_id = public.get_user_station()
);

-- 3. SST INCIDENTS (Applies to sst_incidents table)
DROP POLICY IF EXISTS "Global Admin sees all incidents" ON sst_incidents;
DROP POLICY IF EXISTS "Station Users see station incidents" ON sst_incidents;

CREATE POLICY "Global Admin sees all incidents" 
ON sst_incidents FOR ALL 
TO authenticated 
USING (public.is_global_admin());

CREATE POLICY "Station Users see station incidents" 
ON sst_incidents FOR SELECT 
TO authenticated 
USING (
  station_id = public.get_user_station()
);

-- 4. ASSETS (Applies to assets table)
-- Verified: table name is 'assets'
DROP POLICY IF EXISTS "Global Admin sees all assets" ON assets;
DROP POLICY IF EXISTS "Station Users see station assets" ON assets;

CREATE POLICY "Global Admin sees all assets" 
ON assets FOR ALL 
TO authenticated 
USING (public.is_global_admin());

CREATE POLICY "Station Users see station assets" 
ON assets FOR SELECT 
TO authenticated 
USING (
  station_id = public.get_user_station()
);

-- 5. STOCK MOVEMENTS (epp_stock_movements)
DROP POLICY IF EXISTS "Global Admin sees all movements" ON epp_stock_movements;
DROP POLICY IF EXISTS "Station Users see station movements" ON epp_stock_movements;

CREATE POLICY "Global Admin sees all movements" 
ON epp_stock_movements FOR ALL 
TO authenticated 
USING (public.is_global_admin());

CREATE POLICY "Station Users see station movements" 
ON epp_stock_movements FOR SELECT 
TO authenticated 
USING (
  station_id = public.get_user_station()
);

-- 6. ASSIGNMENTS (employee_epp_assignments)
DROP POLICY IF EXISTS "Global Admin sees all assignments" ON employee_epp_assignments;
DROP POLICY IF EXISTS "Station Users see station assignments" ON employee_epp_assignments;

CREATE POLICY "Global Admin sees all assignments" 
ON employee_epp_assignments FOR ALL 
TO authenticated 
USING (public.is_global_admin());

CREATE POLICY "Station Users see station assignments" 
ON employee_epp_assignments FOR SELECT 
TO authenticated 
USING (
  station_id = public.get_user_station()
);
