-- Add inventory_code column for external company tracking
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS inventory_code VARCHAR(100);

COMMENT ON COLUMN assets.inventory_code IS 'Código de inventario o etiqueta física de la empresa (puede cambiar)';
