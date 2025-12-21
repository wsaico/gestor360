-- Drop the strict constraint that blocks everything including cancelled orders
ALTER TABLE food_orders DROP CONSTRAINT IF EXISTS food_orders_unique_order_per_type;
ALTER TABLE food_orders DROP CONSTRAINT IF EXISTS food_orders_unique_entry_v2;

-- Create a Partial Unique Index
-- This ensures uniqueness only for active orders.
-- If an order is CANCELLED, it won't block a new order.
CREATE UNIQUE INDEX food_orders_unique_active_order_idx 
ON food_orders (employee_id, menu_date, meal_type, order_type)
WHERE status != 'CANCELLED';
