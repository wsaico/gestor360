-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Product Types Table (Dynamic Types: EPP, Uniforme, etc.)
CREATE TABLE IF NOT EXISTS product_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Product Categories Table (Families: Guantes, Cascos, etc.)
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Master Products Table
CREATE TABLE IF NOT EXISTS master_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sap_code TEXT UNIQUE, -- Optional but unique if present
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

-- Enable Row Level Security (RLS)
ALTER TABLE product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow read access to authenticated users
CREATE POLICY "Enable read access for authenticated users" ON product_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated users" ON product_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated users" ON master_products FOR SELECT TO authenticated USING (true);

-- Allow full access to authenticated users (Simplified for now, ideally restrict to Admins)
-- For this environment, we'll allow authenticated users to manage the catalog to ensure the features work for the user immediately.
CREATE POLICY "Enable unrestricted access for authenticated users" ON product_types FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable unrestricted access for authenticated users" ON product_categories FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable unrestricted access for authenticated users" ON master_products FOR ALL TO authenticated USING (true);

-- Initial Data Seeding (Optional but helpful)
INSERT INTO product_types (name, description) VALUES 
('EPP', 'Equipos de Protección Personal'),
('UNIFORME', 'Ropa de trabajo y uniformes'),
('EQUIPO_EMERGENCIA', 'Equipos de respuesta a emergencias')
ON CONFLICT (name) DO NOTHING;

INSERT INTO product_categories (name) VALUES 
('Guantes'),
('Cascos'),
('Lentes'),
('Zapatos'),
('Camisas'),
('Pantalones')
ON CONFLICT (name) DO NOTHING;
