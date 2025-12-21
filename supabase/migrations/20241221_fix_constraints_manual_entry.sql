-- Drop the previous constraint
ALTER TABLE food_orders DROP CONSTRAINT IF EXISTS food_orders_unique_order_per_type;
ALTER TABLE food_orders DROP CONSTRAINT IF EXISTS food_orders_employee_id_menu_date_meal_type_key;

-- Apply a more granular constraint
-- This allows:
-- 1. One 'NORMAL' System Order (is_manual_entry = false)
-- 2. One 'NORMAL' Manual Order (is_manual_entry = true) - For regularization
-- 3. One 'SPECIAL' System Order
-- 4. One 'SPECIAL' Manual Order
ALTER TABLE food_orders ADD CONSTRAINT food_orders_unique_entry_v2 UNIQUE (employee_id, menu_date, meal_type, order_type, is_manual_entry);
