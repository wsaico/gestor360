-- FIX SCRIPT for ERROR: 42P10
-- This script explicitly adds the UNIQUE constraints required for "ON CONFLICT (name)" to work.

-- 1. Ensure product_types has a UNIQUE name
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_types_name_key') THEN
        ALTER TABLE product_types ADD CONSTRAINT product_types_name_key UNIQUE (name);
    END IF;
END $$;

-- 2. Ensure product_categories has a UNIQUE name
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_categories_name_key') THEN
        ALTER TABLE product_categories ADD CONSTRAINT product_categories_name_key UNIQUE (name);
    END IF;
END $$;

-- 3. Now re-run the seed data
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
