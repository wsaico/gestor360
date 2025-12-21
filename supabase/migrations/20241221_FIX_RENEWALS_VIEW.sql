-- =================================================================
-- SCRIPT: 20241221_FIX_RENEWALS_VIEW.sql
-- PURPOSE: Fix duplicate data in 'area' column of vw_renewals_pending
-- PROBLEM: The 'area' column was displaying the 'role_name' (Cargo).
-- SOLUTION: Recreate the view with explicit authentic column mapping.
-- =================================================================

DROP VIEW IF EXISTS public.vw_renewals_pending;

CREATE OR REPLACE VIEW public.vw_renewals_pending AS
SELECT
    d.id,
    d.employee_id,
    e.full_name, -- Correct column
    -- e.first_name removed
    -- e.last_name removed
    e.dni,
    e.role_name, -- Cargo real
    e.area,      -- Area real
    d.item_id,
    i.name as item_name, -- Item name from epp_items join
    i.item_type, 
    d.quantity,
    d.renewal_date,
    d.delivery_date,
    d.status
FROM public.employee_epp_assignments d  -- CORRECT TABLE (Details)
JOIN public.employees e ON d.employee_id = e.id
LEFT JOIN public.epp_items i ON d.item_id = i.id
WHERE d.renewal_date IS NOT NULL
  -- Only show active deliveries that might need renewal
  -- Excluding cancelled or returned items
  AND d.status NOT IN ('CANCELLED', 'RETURNED');

-- Grant access
GRANT SELECT ON public.vw_renewals_pending TO authenticated;
