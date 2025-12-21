-- PREVENT DUPLICATES IN INVENTORY AND MASTER CATALOG
-- Enforce strict data quality rules

-- 1. MASTER PRODUCTS (Global Catalog)
-- Prevent duplicate names (Case Insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_master_products_name_unique 
ON public.master_products (UPPER(name)) WHERE is_active = true;

-- Prevent duplicate SAP codes (if provided)
CREATE UNIQUE INDEX IF NOT EXISTS idx_master_products_sap_unique 
ON public.master_products (sap_code) WHERE sap_code IS NOT NULL AND sap_code <> '';


-- 2. INVENTORY ITEMS (Per Station)
-- Prevent adding the same Master Product twice to the same station
CREATE UNIQUE INDEX IF NOT EXISTS idx_epp_items_station_master_unique 
ON public.epp_items (station_id, master_product_id) 
WHERE master_product_id IS NOT NULL AND is_active = true;

-- Prevent duplicate Names within the same station (Case Insensitive)
-- This covers manual items too.
CREATE UNIQUE INDEX IF NOT EXISTS idx_epp_items_station_name_unique 
ON public.epp_items (station_id, UPPER(name)) 
WHERE is_active = true;

-- 3. HELPER COMMENT
COMMENT ON INDEX idx_master_products_name_unique IS 'Prevent duplicate product names in master catalog';
COMMENT ON INDEX idx_epp_items_station_master_unique IS 'Prevent same master product assigned twice to a station';
