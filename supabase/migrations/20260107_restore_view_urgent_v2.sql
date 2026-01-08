-- RESTORE MISSING VIEW FOR ALERTS
DROP VIEW IF EXISTS public.vw_renewals_pending;

CREATE OR REPLACE VIEW public.vw_renewals_pending AS
SELECT
    d.id,
    d.employee_id,
    e.full_name as employee_name,
    e.dni,
    e.station_id,
    d.epp_item_id as item_id, -- Correct column name
    i.name as item_name,
    d.quantity,
    d.renewal_date as next_renewal_date,
    (d.renewal_date - CURRENT_DATE) as days_until_renewal,
    d.status
FROM public.employee_epp_assignments d
JOIN public.employees e ON d.employee_id = e.id
LEFT JOIN public.epp_items i ON d.epp_item_id = i.id
WHERE d.renewal_date IS NOT NULL
  AND d.status = 'ACTIVE';

-- Grant access to authenticated users
GRANT SELECT ON public.vw_renewals_pending TO authenticated;
