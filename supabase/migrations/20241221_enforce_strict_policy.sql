-- Revert the "loose" constraint that allowed Manual Normal orders to duplicate System Normal orders
ALTER TABLE food_orders DROP CONSTRAINT IF EXISTS food_orders_unique_entry_v2;

-- Re-apply the standard unique constraint on order_type
-- This ensures:
-- 1. Max ONE 'NORMAL' order per day (Strict Policy)
-- 2. Max ONE 'SPECIAL' order per day (If they want an extra, they must pay Full Price)
-- 3. Prevents duplicates regardless of manual/auto source
ALTER TABLE food_orders DROP CONSTRAINT IF EXISTS food_orders_unique_order_per_type; -- Safety drop
ALTER TABLE food_orders ADD CONSTRAINT food_orders_unique_order_per_type UNIQUE (employee_id, menu_date, meal_type, order_type);
