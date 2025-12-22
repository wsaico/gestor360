-- ACTUALIZAR CONSTRAINT DE TIPO DE PEDIDO PARA PERMITIR 'VISITOR'
-- Esto soluciona el error: violates check constraint "food_orders_order_type_valid"

DO $$ 
BEGIN
    ALTER TABLE food_orders DROP CONSTRAINT IF EXISTS food_orders_order_type_valid;
    
    ALTER TABLE food_orders 
    ADD CONSTRAINT food_orders_order_type_valid 
    CHECK (order_type IN ('NORMAL', 'SPECIAL', 'VISITOR'));
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error adjusting constraint: %', SQLERRM;
END $$;
