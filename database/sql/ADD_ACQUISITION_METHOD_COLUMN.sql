-- =====================================================
-- AUDITORÍA DE ESQUEMA DE ACTIVOS - SCRIPT DE CORRECCIÓN
-- Agrega TODAS las columnas faltantes identificadas en la auditoría
-- =====================================================

-- 1. Nuevas columnas de Documentos (URLs simples)
-- El frontend envía esto como strings, aunque la base tiene un JSONB 'documents'.
-- Para compatibilidad inmediata, agregamos las columnas.
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS invoice_document TEXT,
ADD COLUMN IF NOT EXISTS warranty_document TEXT,
ADD COLUMN IF NOT EXISTS manual_url TEXT;

-- 2. Columnas Financieras (que dieron error primero)
ALTER TABLE assets
ADD COLUMN IF NOT EXISTS acquisition_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS acquisition_value DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS acquisition_date DATE,
ADD COLUMN IF NOT EXISTS supplier VARCHAR(255),
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS warranty_months INTEGER DEFAULT 12,
ADD COLUMN IF NOT EXISTS depreciation_rate DECIMAL(5, 2) DEFAULT 20.00,
ADD COLUMN IF NOT EXISTS residual_value DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS current_value DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS purchase_order VARCHAR(100);

-- 3. Otras columnas (por si acaso faltan, aunque el frontend mapeará algunas)
ALTER TABLE assets
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 4. Verificar corrección
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'assets' 
AND column_name IN (
    'invoice_document', 
    'acquisition_method',
    'location_detail', -- Mapeado desde 'location'
    'asset_subcategory' -- Mapeado desde 'subcategory'
);
