-- "NUCLEAR OPTION": Drop ALL possible unique constraints that might be causing conflicts
ALTER TABLE food_orders DROP CONSTRAINT IF EXISTS food_orders_employee_id_menu_date_meal_type_key;
ALTER TABLE food_orders DROP CONSTRAINT IF EXISTS food_orders_unique_order_per_type;
ALTER TABLE food_orders DROP CONSTRAINT IF EXISTS food_orders_unique_entry_v2;
ALTER TABLE food_orders DROP CONSTRAINT IF EXISTS food_orders_employee_id_menu_date_key; -- Potential culprit (blocking CENA vs ALMUERZO)
ALTER TABLE food_orders DROP CONSTRAINT IF EXISTS food_orders_employee_id_menu_date_order_type_key; -- Potential culprit

-- Clean up any indices that might enforce uniqueness backing these constraints
DROP INDEX IF EXISTS food_orders_employee_id_menu_date_meal_type_key;
DROP INDEX IF EXISTS food_orders_unique_order_per_type;
DROP INDEX IF EXISTS food_orders_unique_entry_v2;
DROP INDEX IF EXISTS food_orders_employee_id_menu_date_key;

-- NOW, Apply the Correct, Verified Constraint
-- Must include MEAL_TYPE to allow Lunch and Dinner on the same day
-- Must include ORDER_TYPE to allow Normal and Special on the same meal (Strict Policy: 1 Normal per meal/day)
ALTER TABLE food_orders ADD CONSTRAINT food_orders_final_uniq UNIQUE (employee_id, menu_date, meal_type, order_type);

-- Verify order_type is not null (migration 20241221_fix_constraints_final.sql should have fixed this, but repeating for safety)
UPDATE food_orders SET order_type = 'NORMAL' WHERE order_type IS NULL;
