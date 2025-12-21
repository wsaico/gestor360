-- ==========================================
-- FASE 4: CARACTERÍSTICAS AVANZADAS
-- ==========================================

-- 1. TABLA DE ANUNCIOS (NEWS)
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id), -- Opcional, si queremos rastrear quien creó
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Política Pública: Cualquiera (anon) puede ver anuncios activos y vigentes
CREATE POLICY "Public read active announcements" ON announcements
    FOR SELECT TO anon
    USING (is_active = true AND CURRENT_DATE >= start_date AND CURRENT_DATE <= end_date);

-- Política Dashboard: Usuarios autenticados pueden ver todo (para gestión)
CREATE POLICY "Authenticated read all announcements" ON announcements
    FOR SELECT TO authenticated
    USING (true);

-- Política Escritura: Usuarios autenticados pueden crear/editar/borrar
-- (Idealmente restringir a ADMIN/PROVIDER, pero por ahora authenticated para simplificar)
CREATE POLICY "Authenticated manage announcements" ON announcements
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);


-- 2. SOPORTE PARA VISITAS Y REGULARIZACIÓN EN PEDIDOS
-- Agregamos campos para soportar pedidos manuales y de visitas
ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS visitor_name TEXT; -- Para registrar nombre si es visita externa
ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS is_manual_entry BOOLEAN DEFAULT FALSE; -- Para marcar si fue regularizado manualmente
ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS manual_entry_by UUID; -- ID del usuario que regularizó (opcional)

-- No necesitamos alterar order_type porque suele ser TEXT, pero nos aseguramos de no tener constraints restrictivos
-- Si existiera un check constraint antiguo, lo podríamos borrar:
-- ALTER TABLE food_orders DROP CONSTRAINT IF EXISTS food_orders_order_type_check;
