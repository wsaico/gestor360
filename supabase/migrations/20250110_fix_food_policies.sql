-- 1. Fix Employees Visibility (Critical for "no veo nombre")
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON employees;
-- Clean up potential conflicting policies from previous attempts
DROP POLICY IF EXISTS "multibranch_employee_select" ON employees; 
DROP POLICY IF EXISTS "admin_employee_crud_policy" ON employees;

CREATE POLICY "Enable read access for authenticated users" ON employees
FOR SELECT TO authenticated USING (true); 

-- 2. Fix Food Orders Deletion
-- First drop existing restrictive policies
DROP POLICY IF EXISTS "Allow delete food_orders" ON food_orders;
DROP POLICY IF EXISTS "Users can delete their own pending orders" ON food_orders;
DROP POLICY IF EXISTS "Allow delete for admins" ON food_orders;

CREATE POLICY "Allow delete food_orders" ON food_orders FOR DELETE TO authenticated
USING (
    -- Admin/Supervisor/Provider can delete ANY
    (EXISTS (SELECT 1 FROM system_users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPERVISOR', 'PROVIDER', 'SUPERADMIN')))
    OR
    -- Users can delete OWN pending (using manual_entry_by as the owner link)
    (auth.uid() = manual_entry_by AND status = 'PENDING')
);

-- 3. Fix Menus Deletion
DROP POLICY IF EXISTS "Allow delete menus" ON menus;

CREATE POLICY "Allow delete menus" ON menus FOR DELETE TO authenticated
USING (
    EXISTS (SELECT 1 FROM system_users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPERVISOR', 'SUPERADMIN'))
);

-- 4. Ensure System Users is readable (for the subqueries above)
-- Prevent infinite recursion by ensuring this policy is simple
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON system_users;
CREATE POLICY "Enable read access for authenticated users" ON system_users
FOR SELECT TO authenticated USING (true);
