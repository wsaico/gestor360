-- COMPREHENSIVE INIT SCRIPT FOR MASTER CATALOG
-- This script handles creation, constraints, and seeding idempotently.
-- Run this to fix any "relation does not exist" or "constraint missing" errors.

-- 1. Create Tables (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS product_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL, -- Constraint added below safely
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL, -- Constraint added below safely
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS master_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sap_code TEXT, -- Unique constraint added below
    name TEXT NOT NULL,
    description TEXT,
    type_id UUID REFERENCES product_types(id) ON DELETE SET NULL,
    category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    base_price DECIMAL(10, 2) DEFAULT 0,
    unit_measurement TEXT DEFAULT 'UNIDAD',
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add Unique Constraints (Safely)
DO $$
BEGIN
    -- Product Types Name Unique
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_types_name_key') THEN
        ALTER TABLE product_types ADD CONSTRAINT product_types_name_key UNIQUE (name);
    END IF;

    -- Product Categories Name Unique
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_categories_name_key') THEN
        ALTER TABLE product_categories ADD CONSTRAINT product_categories_name_key UNIQUE (name);
    END IF;

    -- Master Products SAP Code Unique
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'master_products_sap_code_key') THEN
        ALTER TABLE master_products ADD CONSTRAINT master_products_sap_code_key UNIQUE (sap_code);
    END IF;
END $$;

-- 3. Enable RLS
ALTER TABLE product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_products ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Safely - Drop first to avoid conflict or use do block)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON product_types;
DROP POLICY IF EXISTS "Enable unrestricted access for authenticated users" ON product_types;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON product_categories;
DROP POLICY IF EXISTS "Enable unrestricted access for authenticated users" ON product_categories;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON master_products;
DROP POLICY IF EXISTS "Enable unrestricted access for authenticated users" ON master_products;

CREATE POLICY "Enable unrestricted access for authenticated users" ON product_types FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable unrestricted access for authenticated users" ON product_categories FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable unrestricted access for authenticated users" ON master_products FOR ALL TO authenticated USING (true);

-- 5. Seed Initial Data
INSERT INTO product_types (name, description) VALUES 
('EPP', 'Equipos de Protección Personal'),
('UNIFORME', 'Ropa de trabajo y uniformes'),
('EQUIPO_EMERGENCIA', 'Equipos de respuesta a emergencias'),
('HERRAMIENTA', 'Herramientas y equipos menores')
ON CONFLICT (name) DO NOTHING;

INSERT INTO product_categories (name) VALUES 
('Guantes'),
('Cascos'),
('Lentes'),
('Zapatos'),
('Camisas'),
('Pantalones'),
('Arneses')
ON CONFLICT (name) DO NOTHING;
