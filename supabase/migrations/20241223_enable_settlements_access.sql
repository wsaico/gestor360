-- FIX: Enable Access to Settlements for Providers
-- Providers need to see their own settlements in /transport/settlements

-- 1. Enable RLS on transport_settlements (if not already)
ALTER TABLE public.transport_settlements ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Admin/Supervisor can see ALL
DROP POLICY IF EXISTS "Admins can view all settlements" ON public.transport_settlements;
CREATE POLICY "Admins can view all settlements"
ON public.transport_settlements
FOR ALL
USING (
  auth.jwt() ->> 'role_name' IN ('ADMIN', 'SUPERADMIN', 'SUPERVISOR') OR
  EXISTS (
    SELECT 1 FROM public.system_users su 
    WHERE su.id = auth.uid() 
    AND su.role IN ('ADMIN', 'SUPERADMIN', 'SUPERVISOR')
  )
);

-- 3. Policy: Providers can SEE ONLY THEIR OWN settlements
DROP POLICY IF EXISTS "Providers can view own settlements" ON public.transport_settlements;
CREATE POLICY "Providers can view own settlements"
ON public.transport_settlements
FOR SELECT
USING (
  provider_id = auth.uid() OR
  EXISTS (
      SELECT 1 FROM public.system_users su 
      WHERE su.id = auth.uid() 
      AND su.role = 'PROVIDER'
      AND provider_id = su.id -- Redundant but safe check if using 'provider_id' column
  )
);

-- 4. Ensure Providers can SELECT from transport_schedules (already done, but reinforcing)
-- (Assuming they are already validated owners)
