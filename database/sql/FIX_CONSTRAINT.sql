-- Drop the restrictive check constraint on item_type
-- This is necessary because we are now using dynamic categories from the Master Catalog
-- instead of the hardcoded 'EPP', 'UNIFORME', 'EQUIPO_EMERGENCIA'.

ALTER TABLE epp_items DROP CONSTRAINT IF EXISTS item_type_valid;

-- Optional: If you want to verify it's gone
-- SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'epp_items';
