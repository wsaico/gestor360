-- Make menu_id nullable to support manual regularization of orders without an existing menu
ALTER TABLE food_orders ALTER COLUMN menu_id DROP NOT NULL;

-- Make order_type just text check constraint if not already (ensure flexible types)
-- (This was handled in previous steps but good to confirm)
