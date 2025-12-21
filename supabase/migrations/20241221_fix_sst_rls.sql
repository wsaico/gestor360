-- 0. Ensure system_users view exists (Critical for relations)
-- This view maps auth.users to a public accessible view for joins
CREATE OR REPLACE VIEW public.system_users AS 
SELECT 
    id, 
    email, 
    raw_user_meta_data->>'full_name' as username,
    role
FROM auth.users;

GRANT SELECT ON public.system_users TO authenticated;

-- 1. Enable RLS on SST tables
ALTER TABLE IF EXISTS public.epp_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.epp_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.epp_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employee_epp_assignments ENABLE ROW LEVEL SECURITY;

-- 2. Policies for EPP Items (Inventario)
DROP POLICY IF EXISTS "Authenticated can view epp_items" ON public.epp_items;
CREATE POLICY "Authenticated can view epp_items" ON public.epp_items
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins/Supervisors can manage epp_items" ON public.epp_items;
CREATE POLICY "Admins/Supervisors can manage epp_items" ON public.epp_items
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.system_users 
    WHERE id = auth.uid() AND (role IN ('ADMIN', 'SUPERVISOR'))
  )
);

-- 3. Policies for EPP Deliveries (Entregas)
DROP POLICY IF EXISTS "Authenticated can view epp_deliveries" ON public.epp_deliveries;
CREATE POLICY "Authenticated can view epp_deliveries" ON public.epp_deliveries
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins/Supervisors can create epp_deliveries" ON public.epp_deliveries;
CREATE POLICY "Admins/Supervisors can create epp_deliveries" ON public.epp_deliveries
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.system_users 
    WHERE id = auth.uid() AND (role IN ('ADMIN', 'SUPERVISOR'))
  )
);

DROP POLICY IF EXISTS "Admins/Supervisors can update epp_deliveries" ON public.epp_deliveries;
CREATE POLICY "Admins/Supervisors can update epp_deliveries" ON public.epp_deliveries
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.system_users 
    WHERE id = auth.uid() AND (role IN ('ADMIN', 'SUPERVISOR'))
  )
);

DROP POLICY IF EXISTS "Admins/Supervisors can delete epp_deliveries" ON public.epp_deliveries;
CREATE POLICY "Admins/Supervisors can delete epp_deliveries" ON public.epp_deliveries
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.system_users 
    WHERE id = auth.uid() AND (role IN ('ADMIN', 'SUPERVISOR'))
  )
);

-- 4. Policies for Assignments (Asignaciones)
DROP POLICY IF EXISTS "Authenticated can view assignments" ON public.employee_epp_assignments;
CREATE POLICY "Authenticated can view assignments" ON public.employee_epp_assignments
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins/Supervisors can manage assignments" ON public.employee_epp_assignments;
CREATE POLICY "Admins/Supervisors can manage assignments" ON public.employee_epp_assignments
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.system_users 
    WHERE id = auth.uid() AND (role IN ('ADMIN', 'SUPERVISOR'))
  )
);

-- 5. Policies for Stock Movements (Movimientos)
DROP POLICY IF EXISTS "Authenticated can view movements" ON public.epp_stock_movements;
CREATE POLICY "Authenticated can view movements" ON public.epp_stock_movements
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins/Supervisors can manage movements" ON public.epp_stock_movements;
CREATE POLICY "Admins/Supervisors can manage movements" ON public.epp_stock_movements
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.system_users 
    WHERE id = auth.uid() AND (role IN ('ADMIN', 'SUPERVISOR'))
  )
);
