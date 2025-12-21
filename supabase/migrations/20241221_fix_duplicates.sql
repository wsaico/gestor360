-- 1. Remove duplicate orders (Keeping only the most recent one per type)
-- This fixes the "could not create unique index" error by cleaning dirty data first.
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

-- 2. Drop the old strict constraint if it still exists
ALTER TABLE food_orders DROP CONSTRAINT IF EXISTS food_orders_employee_id_menu_date_meal_type_key;

-- 3. Apply the new flexible constraint (allows 1 NORMAL and 1 SPECIAL for the same day)
ALTER TABLE food_orders ADD CONSTRAINT food_orders_unique_order_per_type UNIQUE (employee_id, menu_date, meal_type, order_type);
