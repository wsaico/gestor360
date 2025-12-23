-- Add dining_option column to food_orders table
-- Allows employees to specify if they want to eat in restaurant or take away

ALTER TABLE public.food_orders
ADD COLUMN IF NOT EXISTS dining_option TEXT DEFAULT 'EN_RESTAURANTE'
CHECK (dining_option IN ('EN_RESTAURANTE', 'PARA_LLEVAR'));

-- Add comment for documentation
COMMENT ON COLUMN public.food_orders.dining_option IS 'Opción de consumo: EN_RESTAURANTE o PARA_LLEVAR';
