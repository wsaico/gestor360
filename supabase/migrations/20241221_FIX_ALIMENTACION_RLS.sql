-- SMART RLS POLICIES for ALIMENTACION MODULE (VERIFIED TABLES)
-- Applies Global vs Station vs Public (Kiosk) logic
-- Updated with correct table names

-- 1. MENUS
-- Needs to be visible by 'anon' (Kiosks) but managed securely
DROP POLICY IF EXISTS "Global Admin manages menus" ON menus;
DROP POLICY IF EXISTS "Station Admin manages station menus" ON menus;
DROP POLICY IF EXISTS "Public read menus" ON menus; 

-- Read: Public/Anon + Auth (Kiosks need this)
CREATE POLICY "Public read menus" 
ON menus FOR SELECT 
TO public 
USING (true);

-- Manage: Global Admin (ALL)
CREATE POLICY "Global Admin manages menus" 
ON menus FOR ALL 
TO authenticated 
USING (public.is_global_admin());

-- Manage: Station Admin (Station Only)
CREATE POLICY "Station Admin manages station menus" 
ON menus FOR ALL 
TO authenticated 
USING (
  station_id = public.get_user_station()
);


-- 2. ROLE PRICING CONFIG (role_pricing_config)
-- Table verified via pricingService.js
DROP POLICY IF EXISTS "Read pricing" ON role_pricing_config;
DROP POLICY IF EXISTS "Global Admin manages pricing" ON role_pricing_config;

-- Read: Public can read to check prices (Kiosks/Frontend)
CREATE POLICY "Read pricing" 
ON role_pricing_config FOR SELECT 
TO public 
USING (true);

-- Manage: Global Admin manages pricing
CREATE POLICY "Global Admin manages pricing" 
ON role_pricing_config FOR ALL 
TO authenticated 
USING (public.is_global_admin());

-- Manage: Station Admin can read, maybe edit? Let's assume Edit if station_id matches.
CREATE POLICY "Station Admin manages station pricing" 
ON role_pricing_config FOR ALL 
TO authenticated 
USING (
  station_id = public.get_user_station()
);


-- 3. FOOD ORDERS 
-- (Already covered in FIX_RLS_SMART_POLICIES.sql, skipping to avoid duplicates)
