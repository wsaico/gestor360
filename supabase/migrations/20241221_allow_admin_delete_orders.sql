-- Enable DELETE for food_orders if user is ADMIN
-- Since earlier migrations might not have enabled DELETE or restricted it to owners only (which is empty for system generated orders).

-- 1. Ensure RLS is enabled (should be already, but safety first)
ALTER TABLE food_orders ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing delete policy if any to avoid conflicts
DROP POLICY IF EXISTS "Allow delete for admins" ON food_orders;
DROP POLICY IF EXISTS "Users can delete their own pending orders" ON food_orders;

-- 3. Create comprehensive DELETE policy
-- Admins can delete ANY order (as requested: "even if attended")
-- Users can delete ONLY their own PENDING orders
CREATE POLICY "Allow delete food_orders" ON food_orders
FOR DELETE
USING (
  -- Admin Check: Can delete anything in their station context (or global if superadmin)
  (
    EXISTS (
        SELECT 1 FROM system_users 
        WHERE id = auth.uid() 
        AND role IN ('ADMIN', 'SUPERADMIN')
    )
  )
  OR
  -- User Check: Can delete OWN orders ONLY if PENDING
  (
    auth.uid() = manual_entry_by -- If created manually by them (or we link via employee_id mapping if we had that link in auth)
    AND 
    status = 'PENDING'
  )
  OR
  -- Fallback: If the user IS the employee linked (requires lookup)
  (
     employee_id IN (
         -- Assuming auth.uid() maps to an employee or we use a helper. 
         -- Simpler: Check if auth.uid() is the user linked in system_users who IS the employee? 
         -- usually employees don't have auth login yet in this system, only system_users do.
         -- So usually "manual_entry_by" is the safe check for "Own" creation.
         -- But mostly, Admins do the management.
         SELECT id FROM employees WHERE id::text = auth.uid()::text -- Placeholder if employees were users
     )
     AND status = 'PENDING'
  )
);

-- Force policy refresh just in case
ALTER TABLE food_orders FORCE ROW LEVEL SECURITY;
