-- FIX VIEW REGRESSION: Restore missing columns expected by Frontend
DROP VIEW IF EXISTS public.vw_renewals_pending;

CREATE OR REPLACE VIEW public.vw_renewals_pending AS
SELECT
    d.id,
    d.employee_id,
    e.full_name,                         -- Restored: Required by Frontend
    e.dni,
    e.station_id,
    e.station_id,
    e.role_name,                         -- Corrected: Real column name in employees table
    e.area,                              -- Restored: Required by Frontend
    e.area,                              -- Restored: Required by Frontend
    d.item_id,                           -- Corrected: Real column name in assignments
    i.name as item_name,
    i.item_type,                         -- Restored: Required by Frontend
    d.quantity,
    d.size,                              -- Restored: Required by Frontend
    d.renewal_date,                      -- Restored: Original name required
    (d.renewal_date - CURRENT_DATE) as days_until_renewal,
    d.status
FROM public.employee_epp_assignments d
JOIN public.employees e ON d.employee_id = e.id
LEFT JOIN public.epp_items i ON d.item_id = i.id  -- Corrected: item_id, not epp_item_id
WHERE d.renewal_date IS NOT NULL
  AND d.status = 'ACTIVE'
  AND (d.renewal_date - CURRENT_DATE) <= 30;

-- Grant access to authenticated users
GRANT SELECT ON public.vw_renewals_pending TO authenticated;
