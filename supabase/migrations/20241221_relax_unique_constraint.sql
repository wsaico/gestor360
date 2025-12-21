-- Drop the strict unique constraint that prevents multiple orders for the same meal
-- We need to find the constraint name. Usually it is food_orders_employee_id_menu_date_meal_type_key
-- We will try to drop it.
ALTER TABLE food_orders DROP CONSTRAINT IF EXISTS food_orders_employee_id_menu_date_meal_type_key;

-- Optionally, add a less restrictive one that includes order_type, so you can have 1 NORMAL and 1 SPECIAL
-- But for true "Additional" flexibility, we might just rely on application logic or loose constraints.
-- Let's try to add one that includes order_type, so at least you can't have 2 NORMALs (accidental double click)
-- but you CAN have 1 NORMAL and 1 SPECIAL.
ALTER TABLE food_orders ADD CONSTRAINT food_orders_unique_order_per_type UNIQUE (employee_id, menu_date, meal_type, order_type);
