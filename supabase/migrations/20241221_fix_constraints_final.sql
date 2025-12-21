-- 1. Standardize order_type (Treat NULL as 'NORMAL')
UPDATE food_orders SET order_type = 'NORMAL' WHERE order_type IS NULL;

-- 2. Remove Duplicates (Aggressive cleanup)
-- Keeps only the most recently created order for each (employee, date, meal, type) combination
DELETE FROM food_orders
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
        ROW_NUMBER() OVER (
            PARTITION BY employee_id, menu_date, meal_type, order_type 
            ORDER BY created_at DESC
        ) as rnum
        FROM food_orders
    ) t
    WHERE t.rnum > 1
);

-- 3. Drop the restrictive constraint (Try multiple common default names Supabase/Postgres might have generated)
ALTER TABLE food_orders DROP CONSTRAINT IF EXISTS food_orders_employee_id_menu_date_meal_type_key;
ALTER TABLE food_orders DROP CONSTRAINT IF EXISTS food_orders_employee_id_menu_date_meal_type_check; -- Just in case
ALTER TABLE food_orders DROP CONSTRAINT IF EXISTS food_orders_unique_order_per_type; -- Drop the new one if it exists (fix for 42P07)

-- 4. Apply the new flexible constraint
-- This allows one 'NORMAL' and one 'SPECIAL' order for the same person/date/meal.
ALTER TABLE food_orders ADD CONSTRAINT food_orders_unique_order_per_type UNIQUE (employee_id, menu_date, meal_type, order_type);
