-- Migración: Agregar Talla y Área Sugerida al Catálogo Maestro
-- Fecha: 2026-01-07

-- 1. Agregar columnas a la tabla master_products
ALTER TABLE public.master_products 
ADD COLUMN IF NOT EXISTS size TEXT,
ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL;

-- 2. Agregar metadatos/comentarios para claridad
COMMENT ON COLUMN public.master_products.size IS 'Talla o medida del producto maestro (ej: L, 42, 10 pies)';
COMMENT ON COLUMN public.master_products.area_id IS 'Área predeterminada sugerida para este producto al ser añadido al inventario';

-- 3. (Opcional) Verificar que las columnas se crearon correctamente
-- SELECT size, area_id FROM public.master_products LIMIT 1;
