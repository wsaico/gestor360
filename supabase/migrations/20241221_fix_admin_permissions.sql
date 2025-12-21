-- Unlock Full Access for Admins on Employees Table
-- This fixes the issue where an Admin in station 'LIMA' cannot assign an employee to 'AREQUIPA'.

-- 1. Policy for SELECT (View all)
CREATE POLICY "Admins can view all employees" ON public.employees
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.system_users 
        WHERE id = auth.uid() AND role = 'ADMIN'
    )
);

-- 2. Policy for UPDATE (Edit all, including changing station)
CREATE POLICY "Admins can update all employees" ON public.employees
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.system_users 
        WHERE id = auth.uid() AND role = 'ADMIN'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.system_users 
        WHERE id = auth.uid() AND role = 'ADMIN'
    )
);

-- 3. Policy for INSERT (Create for any station)
CREATE POLICY "Admins can create employees in any station" ON public.employees
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.system_users 
        WHERE id = auth.uid() AND role = 'ADMIN'
    )
);

-- 4. Policy for DELETE
CREATE POLICY "Admins can delete employees" ON public.employees
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.system_users 
        WHERE id = auth.uid() AND role = 'ADMIN'
    )
);
