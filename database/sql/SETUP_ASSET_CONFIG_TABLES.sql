-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ASSET CATEGORIES
CREATE TABLE IF NOT EXISTS asset_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE, -- e.g., 'EQUIPOS_COMPUTO', 'EQUIPOS_MOVILES' (Matches frontend constants)
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default categories matching frontend constants
INSERT INTO asset_categories (code, name, description) VALUES
('EQUIPOS_COMPUTO', 'Equipos de Cómputo', 'Laptops, Desktops, Servidores'),
('EQUIPOS_MOVILES', 'Equipos Móviles', 'Celulares, Radios, Tablets'),
('VEHICULOS_MOTORIZADOS', 'Vehículos Motorizados', 'Camionetas, Buses, Tractores'),
('VEHICULOS_NO_MOTORIZADOS', 'Vehículos No Motorizados', 'Carretas, Dollies'),
('EQUIPOS_RAMPA', 'Equipos de Rampa', 'Escaleras, Belt Loaders'),
('HERRAMIENTAS', 'Herramientas', 'Herramientas de mantenimiento'),
('MOBILIARIO', 'Mobiliario', 'Sillas, Escritorios'),
('ELECTRONICA', 'Electrónica', 'TVs, Pantallas'),
('OTRO', 'Otro', 'Otros activos')
ON CONFLICT (code) DO NOTHING;

-- 2. ASSET SUBCATEGORIES
CREATE TABLE IF NOT EXISTS asset_subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES asset_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category_id, name)
);

-- 3. ASSET BRANDS
CREATE TABLE IF NOT EXISTS asset_brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ASSET MODELS
CREATE TABLE IF NOT EXISTS asset_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID REFERENCES asset_brands(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(brand_id, name)
);

-- Add RLS Policies (Simplified for now - authenticated users can read/write)
ALTER TABLE asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read/write for authenticated users on categories" ON asset_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable read/write for authenticated users on subcategories" ON asset_subcategories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable read/write for authenticated users on brands" ON asset_brands FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable read/write for authenticated users on models" ON asset_models FOR ALL TO authenticated USING (true) WITH CHECK (true);
