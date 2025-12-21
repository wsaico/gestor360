-- CLEANUP FOOD ORDERS TABLE
-- Requested by user to clean up data
-- Using DELETE instead of TRUNCATE to be safe with standard permissions.
-- Safe to run as long as no other critical tables depend on order IDs without cascading (which they shouldn't in this schema).

DELETE FROM public.food_orders;
